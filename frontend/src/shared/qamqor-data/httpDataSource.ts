import type {
  AnalyticsInvestigationDto,
  EmployeeDto,
  NormDto,
  OutletDto,
  ProductDto,
  ReconciliationRowDto,
  WriteOffDto,
} from 'shared/api/types';
import { apiClient } from 'shared/api/client';
import type { DashboardDataSource, LiveData } from './datasource';
import type {
  Anomaly, EmployeeDetail, EmployeeStats, HourlyPoint, LocationDetail, LocationStats,
  Metric, NetworkKpis, Period, ProductDetail, ProductSlice, ProductWaste,
  ReasonCategory, RiskLevel, ShiftBreakdown, StageBreakdown,
} from './types';
import {
  CATEGORY_BY_REASON, REASON_CATEGORY_LABELS, REASON_LABELS, SHIFT_LABELS,
  STAGE_BY_REASON, STAGE_META, STAGE_ORDER, buildRefMaps, shiftFromHour,
  toWriteOffRequest, writeOffCost, type RefMaps,
} from './backendMap';

/**
 * HTTP-источник данных дашборда.
 *
 * Тянет полный список списаний + справочники + инвентаризацию один раз (кэширует
 * промис) и считает ВСЕ метрики на клиенте из реальных записей. Никаких демо-констант.
 *
 * Период (today/week/month/quarter) фильтрует записи по `created_at`; тренды —
 * сравнение окна периода с непосредственно предшествующим окном той же длины.
 * Инвентарная «истина» (theoretical/unexplained из /inventory/reconciliation) —
 * накопительная (это остаток на складе, период к ней неприменим), стоимость
 * списаний за период — из отфильтрованного списка.
 *
 * Соответствие reason_code → этап/категория документировано в `backendMap.ts`.
 */

const DAY_MS = 86_400_000;
const CATEGORY_ORDER: ReasonCategory['category'][] = ['external', 'operational', 'employee'];

interface Window {
  start: number;
  end: number;
  prevStart: number;
  prevEnd: number;
}

interface RawData {
  writeOffs: WriteOffDto[];
  outlets: OutletDto[];
  employees: EmployeeDto[];
  products: ProductDto[];
  norms: NormDto[];
  reconciliation: ReconciliationRowDto[];
  investigations: AnalyticsInvestigationDto[];
  refs: RefMaps;
}

function periodWindow(period: Period, now = Date.now()): Window {
  if (period === 'today') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const start = d.getTime();
    return { start, end: now, prevStart: start - DAY_MS, prevEnd: start };
  }
  const len = (period === 'week' ? 7 : period === 'month' ? 30 : 90) * DAY_MS;
  return { start: now - len, end: now, prevStart: now - 2 * len, prevEnd: now - len };
}

function inRange(dto: WriteOffDto, start: number, end: number): boolean {
  const t = Date.parse(dto.created_at);
  return t >= start && t < end;
}

/** Норма отхода продукта: точечная > глобальная > 0. */
function normFor(norms: NormDto[], productId: string, outletId: string | null): number {
  const specific = norms.find((n) => n.product_id === productId && n.outlet_id === outletId);
  if (specific) return specific.max_waste_pct;
  const global = norms.find((n) => n.product_id === productId && n.outlet_id === null);
  return global?.max_waste_pct ?? 0;
}

/** Медиана набора (для сравнения сотрудника со «средним по сети»). */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function riskFromMultiplier(m: number): RiskLevel {
  if (m >= 2.5) return 'high';
  if (m >= 1.5) return 'medium';
  return 'low';
}

/** Порог зоны по доле необъяснённого (совпадает с varianceColor: <2 / <3 / ≥3). */
function statusFromVariance(v: number): LocationStats['status'] {
  if (v < 2) return 'green';
  if (v < 3) return 'amber';
  return 'red';
}

/** Свернуть почасовой профиль в разбивку по сменам (та же логика, что в моке). */
function shiftsFromHourly(hourly: HourlyPoint[]): ShiftBreakdown[] {
  const buckets: Record<string, number> = {
    [SHIFT_LABELS.morning]: 0,
    [SHIFT_LABELS.day]: 0,
    [SHIFT_LABELS.evening]: 0,
  };
  hourly.forEach((p) => {
    buckets[shiftFromHour(parseInt(p.hour, 10))] += p.value;
  });
  const total = Object.values(buckets).reduce((s, v) => s + v, 0) || 1;
  return Object.entries(buckets).map(([shift, amount]) => ({
    shift,
    amount: Math.round(amount),
    share: Math.round((amount / total) * 100),
  }));
}

/** Стоимость списаний по равным под-окнам периода (для трендов/спарклайнов). */
function bucketCost(items: WriteOffDto[], start: number, end: number, n: number, refs: RefMaps): number[] {
  const span = (end - start) / n || 1;
  const out = new Array<number>(n).fill(0);
  items.forEach((it) => {
    const idx = Math.min(n - 1, Math.max(0, Math.floor((Date.parse(it.created_at) - start) / span)));
    out[idx] += writeOffCost(it, refs);
  });
  return out.map((v) => Math.round(v));
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export class HttpDataSource implements DashboardDataSource {
  private cache: Promise<RawData> | null = null;

  private load(): Promise<RawData> {
    if (!this.cache) {
      this.cache = (async (): Promise<RawData> => {
        const [writeOffs, outlets, employees, products, norms, reconciliation, investigations] =
          await Promise.all([
            apiClient.listAllWriteOffs(),
            apiClient.listOutlets(),
            apiClient.listEmployees(),
            apiClient.listProducts(),
            apiClient.listNorms(),
            apiClient.inventoryReconciliation(),
            apiClient.analyticsInvestigations(),
          ]);
        return {
          writeOffs, outlets, employees, products, norms, reconciliation, investigations,
          refs: buildRefMaps(outlets, employees, products),
        };
      })();
    }
    return this.cache;
  }

  /* ─────────────────────────── Locations ─────────────────────────── */

  private computeLocations(data: RawData, start: number, end: number): LocationStats[] {
    const { refs } = data;
    return data.outlets.map((outlet) => {
      const items = data.writeOffs.filter((r) => r.outlet_id === outlet.id && inRange(r, start, end));
      const approved = items.filter((r) => r.status === 'approved');
      const declaredWriteOffs = approved.reduce((s, r) => s + writeOffCost(r, refs), 0);
      const theoreticalLoss = approved
        .filter((r) => CATEGORY_BY_REASON[r.reason_code] !== 'employee')
        .reduce((s, r) => s + writeOffCost(r, refs), 0);

      // Инвентарная истина (накопительная) — необъяснённая недостача в ₸.
      const recRows = data.reconciliation.filter((r) => r.outlet_id === outlet.id);
      let unexplainedValue = 0;
      let theoreticalStockValue = 0;
      recRows.forEach((r) => {
        const cost = refs.productsById.get(r.product_id)?.cost_per_unit ?? 0;
        unexplainedValue += Math.abs(r.unexplained_variance) * cost;
        theoreticalStockValue += Math.max(0, r.theoretical_balance) * cost;
      });
      const unexplainedDeficit = Math.round(unexplainedValue);
      const variancePercent = theoreticalStockValue > 0
        ? Math.round((unexplainedValue / theoreticalStockValue) * 1000) / 10
        : 0;

      return {
        locationId: outlet.id,
        locationName: outlet.name,
        district: outlet.address ?? '',
        theoreticalLoss: Math.round(theoreticalLoss),
        actualDeficit: Math.round(declaredWriteOffs) + unexplainedDeficit,
        declaredWriteOffs: Math.round(declaredWriteOffs),
        variancePercent,
        unexplainedDeficit,
        status: statusFromVariance(variancePercent),
        monthlyRevenue: 0,
      };
    });
  }

  async getLocations(period: Period): Promise<LocationStats[]> {
    const data = await this.load();
    const { start, end } = periodWindow(period);
    return this.computeLocations(data, start, end);
  }

  async getNetworkKpis(period: Period): Promise<NetworkKpis> {
    const data = await this.load();
    const win = periodWindow(period);
    const curr = this.computeLocations(data, win.start, win.end);
    const prev = this.computeLocations(data, win.prevStart, win.prevEnd);

    const sumUnex = (ls: LocationStats[]): number => ls.reduce((s, l) => s + l.unexplainedDeficit, 0);
    const avgVar = (ls: LocationStats[]): number =>
      ls.length ? Math.round((ls.reduce((s, l) => s + l.variancePercent, 0) / ls.length) * 10) / 10 : 0;
    const red = (ls: LocationStats[]): number => ls.filter((l) => l.status === 'red').length;

    const pendingCurr = data.writeOffs.filter((r) => r.status === 'pending' && inRange(r, win.start, win.end)).length;
    const pendingPrev = data.writeOffs.filter((r) => r.status === 'pending' && inRange(r, win.prevStart, win.prevEnd)).length;
    const approvedWin = data.writeOffs.filter((r) => r.status === 'approved' && inRange(r, win.start, win.end));
    const spark = bucketCost(approvedWin, win.start, win.end, 6, data.refs);

    const metric = (value: number, prev_: number, s: number[]): Metric => ({ value, prev: prev_, spark: s });
    return {
      unexplainedDeficit: metric(sumUnex(curr), sumUnex(prev), spark),
      avgVariance: metric(avgVar(curr), avgVar(prev), spark),
      redLocations: metric(red(curr), red(prev), []),
      pendingReviews: metric(pendingCurr, pendingPrev, []),
    };
  }

  async getLocationDetail(period: Period, locationId: string): Promise<LocationDetail> {
    const data = await this.load();
    const { start, end } = periodWindow(period);
    const stats = this.computeLocations(data, start, end).find((l) => l.locationId === locationId);
    if (!stats) throw new Error(`Локация не найдена: ${locationId}`);

    const employees = this.computeEmployeeStats(data, start, end, locationId);
    const hourly = this.computeHourly(data, start, end, locationId);
    const shifts = shiftsFromHourly(hourly);
    const stages = this.computeStages(data, start, end, locationId);
    const reasonCategories = this.computeReasonCategories(data, start, end, locationId);
    const products = this.computeProductWaste(data, start, end);

    // Флаги точки — реальные кластеры из /analytics/investigations по её сотрудникам.
    const flags = data.investigations
      .filter((inv) => data.refs.employeesById.get(inv.employee_id)?.outlet_id === locationId)
      .map((inv) => `${inv.employee_name ?? inv.employee_id}: ${REASON_LABELS[inv.reason_code]} ×${inv.occurrences}`);

    return { stats, employees, hourly, shifts, stages, reasonCategories, products, flags };
  }

  /* ─────────────────────────── Employees ─────────────────────────── */

  private computeEmployeeStats(data: RawData, start: number, end: number, outletId?: string): EmployeeStats[] {
    const { refs } = data;
    const items = data.writeOffs.filter((r) => inRange(r, start, end));
    const byEmployee = new Map<string, WriteOffDto[]>();
    items.forEach((r) => {
      const list = byEmployee.get(r.employee_id);
      if (list) list.push(r);
      else byEmployee.set(r.employee_id, [r]);
    });

    // Медиана суммы списаний по всем активным сотрудникам сети — база множителя.
    const costByEmp = new Map<string, number>();
    byEmployee.forEach((list, id) => costByEmp.set(id, list.reduce((s, r) => s + writeOffCost(r, refs), 0)));
    const med = median([...costByEmp.values()].filter((v) => v > 0)) || 1;
    const flagged = new Set(data.investigations.map((inv) => inv.employee_id));

    const rows: EmployeeStats[] = [];
    byEmployee.forEach((list, employeeId) => {
      const employee = refs.employeesById.get(employeeId);
      if (outletId && employee?.outlet_id !== outletId) return;
      const total = costByEmp.get(employeeId) ?? 0;
      rows.push({
        employeeId,
        employeeName: employee?.name ?? employeeId,
        locationId: employee?.outlet_id ?? '',
        locationName: employee?.outlet?.name ?? '',
        totalWriteOffs: Math.round(total),
        writeOffCount: list.length,
        medianMultiplier: Math.round((total / med) * 10) / 10,
        flags: flagged.has(employeeId) ? ['anomaly-employee'] : [],
      });
    });
    rows.sort((a, b) => b.medianMultiplier - a.medianMultiplier);
    return rows;
  }

  async getEmployeeStats(period: Period, locationId?: string): Promise<EmployeeStats[]> {
    const data = await this.load();
    const { start, end } = periodWindow(period);
    return this.computeEmployeeStats(data, start, end, locationId);
  }

  async getEmployeeDetail(period: Period, employeeId: string): Promise<EmployeeDetail> {
    const data = await this.load();
    const win = periodWindow(period);
    const { refs } = data;
    const employee = refs.employeesById.get(employeeId);
    const stats = this.computeEmployeeStats(data, win.start, win.end).find((e) => e.employeeId === employeeId)
      ?? {
        employeeId,
        employeeName: employee?.name ?? employeeId,
        locationId: employee?.outlet_id ?? '',
        locationName: employee?.outlet?.name ?? '',
        totalWriteOffs: 0,
        writeOffCount: 0,
        medianMultiplier: 0,
        flags: [],
      };

    const items = data.writeOffs.filter((r) => r.employee_id === employeeId && inRange(r, win.start, win.end));
    const totalCost = items.reduce((s, r) => s + writeOffCost(r, refs), 0) || 1;

    // Срез по продуктам.
    const byProductMap = new Map<string, { count: number; amount: number }>();
    items.forEach((r) => {
      const acc = byProductMap.get(r.product_id) ?? { count: 0, amount: 0 };
      acc.count += 1;
      acc.amount += writeOffCost(r, refs);
      byProductMap.set(r.product_id, acc);
    });
    const byProduct: ProductSlice[] = [...byProductMap.entries()]
      .map(([productId, acc]) => ({
        product: refs.productsById.get(productId)?.name ?? productId,
        count: acc.count,
        amount: Math.round(acc.amount),
        share: Math.round((acc.amount / totalCost) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    // Срез по категориям причин (vs сеть).
    const netItems = data.writeOffs.filter((r) => inRange(r, win.start, win.end));
    const netTotal = netItems.reduce((s, r) => s + writeOffCost(r, refs), 0) || 1;
    const byReason: ReasonCategory[] = CATEGORY_ORDER.map((category) => {
      const own = items.filter((r) => CATEGORY_BY_REASON[r.reason_code] === category)
        .reduce((s, r) => s + writeOffCost(r, refs), 0);
      const net = netItems.filter((r) => CATEGORY_BY_REASON[r.reason_code] === category)
        .reduce((s, r) => s + writeOffCost(r, refs), 0);
      return {
        category,
        label: REASON_CATEGORY_LABELS[category],
        share: Math.round((own / totalCost) * 100),
        networkShare: Math.round((net / netTotal) * 100),
      };
    });

    // Срез по сменам.
    const shiftMap = new Map<string, number>();
    items.forEach((r) => {
      const shift = shiftFromHour(new Date(r.created_at).getHours());
      shiftMap.set(shift, (shiftMap.get(shift) ?? 0) + writeOffCost(r, refs));
    });
    const byShift: ShiftBreakdown[] = [SHIFT_LABELS.morning, SHIFT_LABELS.day, SHIFT_LABELS.evening].map((shift) => {
      const amount = shiftMap.get(shift) ?? 0;
      return { shift, amount: Math.round(amount), share: Math.round((amount / totalCost) * 100) };
    });

    const eveningShare = byShift.find((s) => s.shift === SHIFT_LABELS.evening)?.share ?? 0;
    const rejected = items.filter((r) => r.status === 'rejected');
    const attributedUnexplained = Math.round(
      items.filter((r) => r.status === 'rejected' || CATEGORY_BY_REASON[r.reason_code] === 'employee')
        .reduce((s, r) => s + writeOffCost(r, refs), 0),
    );

    const flagTexts: string[] = [];
    if (stats.flags.includes('anomaly-employee')) flagTexts.push('аномалия по сотруднику (повторяющийся кластер)');
    if (eveningShare > 50) flagTexts.push('перекос на вечернюю смену');
    if (rejected.length > 0) flagTexts.push(`${rejected.length} отклонённых заявок`);

    return {
      stats,
      role: employee?.role ?? 'Сотрудник',
      riskLevel: riskFromMultiplier(stats.medianMultiplier),
      attributedUnexplained,
      byProduct,
      byReason,
      byShift,
      weeklyTrend: bucketCost(items, win.start, win.end, 6, refs),
      flagTexts,
      requests: items
        .slice()
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .map((r) => toWriteOffRequest(r, refs)),
    };
  }

  /* ─────────────────────────── Products ─────────────────────────── */

  private computeProductWaste(data: RawData, start: number, end: number): ProductWaste[] {
    const { refs } = data;
    void start;
    void end;
    const result: ProductWaste[] = [];
    data.products.forEach((product) => {
      const rows = data.reconciliation.filter((r) => r.product_id === product.id);
      if (rows.length === 0) return;
      let totalWriteOff = 0;
      let totalTheoretical = 0;
      let worstPct = 0;
      let worstName = '';
      rows.forEach((r) => {
        totalWriteOff += r.write_off_total;
        totalTheoretical += Math.max(0, r.theoretical_balance);
        const pct = r.theoretical_balance > 0 ? (r.write_off_total / r.theoretical_balance) * 100 : 0;
        if (pct > worstPct) {
          worstPct = pct;
          worstName = refs.outletsById.get(r.outlet_id)?.name ?? r.outlet_id;
        }
      });
      const declared = totalTheoretical > 0 ? (totalWriteOff / totalTheoretical) * 100 : 0;
      result.push({
        product: product.name,
        norm: normFor(data.norms, product.id, null),
        declared: Math.round(declared * 10) / 10,
        worstLocation: Math.round(worstPct * 10) / 10,
        worstLocationName: worstName,
      });
    });
    return result;
  }

  async getProductWaste(period: Period): Promise<ProductWaste[]> {
    const data = await this.load();
    const { start, end } = periodWindow(period);
    return this.computeProductWaste(data, start, end);
  }

  async getProductDetails(period: Period): Promise<ProductDetail[]> {
    const data = await this.load();
    const { start, end } = periodWindow(period);
    const { refs } = data;
    const result: ProductDetail[] = [];

    data.products.forEach((product) => {
      const rows = data.reconciliation.filter((r) => r.product_id === product.id);
      if (rows.length === 0) return;

      const overNormOutlets = new Set<string>();
      let totalWriteOff = 0;
      let totalTheoretical = 0;
      let worstPct = 0;
      let worstName = '';
      const locations = rows.map((r) => {
        const norm = normFor(data.norms, product.id, r.outlet_id);
        const pct = r.theoretical_balance > 0 ? (r.write_off_total / r.theoretical_balance) * 100 : 0;
        totalWriteOff += r.write_off_total;
        totalTheoretical += Math.max(0, r.theoretical_balance);
        if (pct > worstPct) {
          worstPct = pct;
          worstName = refs.outletsById.get(r.outlet_id)?.name ?? r.outlet_id;
        }
        if (pct > norm) overNormOutlets.add(r.outlet_id);
        return {
          locationName: refs.outletsById.get(r.outlet_id)?.name ?? r.outlet_id,
          declared: Math.round(pct * 10) / 10,
          overNorm: pct > norm,
        };
      });

      // Стоимость за период — из одобренных списаний окна.
      const approved = data.writeOffs.filter(
        (r) => r.product_id === product.id && r.status === 'approved' && inRange(r, start, end),
      );
      const totalCost = approved.reduce((s, r) => s + writeOffCost(r, refs), 0);
      const overNormCost = approved
        .filter((r) => overNormOutlets.has(r.outlet_id))
        .reduce((s, r) => s + writeOffCost(r, refs), 0);

      result.push({
        product: product.name,
        type: product.unit === 'штуки' ? 'unit' : 'weight',
        norm: normFor(data.norms, product.id, null),
        networkDeclared: totalTheoretical > 0 ? Math.round((totalWriteOff / totalTheoretical) * 1000) / 10 : 0,
        worstLocationName: worstName,
        worstDeclared: Math.round(worstPct * 10) / 10,
        totalCost: Math.round(totalCost),
        overNormCost: Math.round(overNormCost),
        locations,
      });
    });
    return result;
  }

  /* ─────────────────────────── Hourly & breakdowns ─────────────────────────── */

  private computeHourly(data: RawData, start: number, end: number, outletId?: string): HourlyPoint[] {
    const { refs } = data;
    const net = data.writeOffs.filter((r) => inRange(r, start, end));
    const target = outletId ? net.filter((r) => r.outlet_id === outletId) : net;
    const outletCount = data.outlets.length || 1;

    const targetByHour = new Array<number>(24).fill(0);
    const netByHour = new Array<number>(24).fill(0);
    target.forEach((r) => { targetByHour[new Date(r.created_at).getHours()] += writeOffCost(r, refs); });
    net.forEach((r) => { netByHour[new Date(r.created_at).getHours()] += writeOffCost(r, refs); });

    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${pad2(hour)}:00`,
      value: Math.round(targetByHour[hour]),
      benchmark: Math.round(netByHour[hour] / outletCount),
    }));
  }

  async getHourly(period: Period, locationId?: string): Promise<HourlyPoint[]> {
    const data = await this.load();
    const { start, end } = periodWindow(period);
    return this.computeHourly(data, start, end, locationId);
  }

  private computeStages(data: RawData, start: number, end: number, outletId: string): StageBreakdown[] {
    const { refs } = data;
    const win = data.writeOffs.filter((r) => inRange(r, start, end));
    const items = win.filter((r) => r.outlet_id === outletId);
    const total = items.reduce((s, r) => s + writeOffCost(r, refs), 0) || 1;
    const netTotal = win.reduce((s, r) => s + writeOffCost(r, refs), 0) || 1;

    return STAGE_ORDER.map((code) => {
      const own = items.filter((r) => STAGE_BY_REASON[r.reason_code].code === code)
        .reduce((s, r) => s + writeOffCost(r, refs), 0);
      const net = win.filter((r) => STAGE_BY_REASON[r.reason_code].code === code)
        .reduce((s, r) => s + writeOffCost(r, refs), 0);
      return {
        stageCode: code,
        stageLabel: STAGE_META[code],
        amount: Math.round(own),
        share: Math.round((own / total) * 100),
        networkShare: Math.round((net / netTotal) * 100),
      };
    });
  }

  private computeReasonCategories(data: RawData, start: number, end: number, outletId: string): ReasonCategory[] {
    const { refs } = data;
    const win = data.writeOffs.filter((r) => inRange(r, start, end));
    const items = win.filter((r) => r.outlet_id === outletId);
    const total = items.reduce((s, r) => s + writeOffCost(r, refs), 0) || 1;
    const netTotal = win.reduce((s, r) => s + writeOffCost(r, refs), 0) || 1;

    return CATEGORY_ORDER.map((category) => {
      const own = items.filter((r) => CATEGORY_BY_REASON[r.reason_code] === category)
        .reduce((s, r) => s + writeOffCost(r, refs), 0);
      const net = win.filter((r) => CATEGORY_BY_REASON[r.reason_code] === category)
        .reduce((s, r) => s + writeOffCost(r, refs), 0);
      return {
        category,
        label: REASON_CATEGORY_LABELS[category],
        share: Math.round((own / total) * 100),
        networkShare: Math.round((net / netTotal) * 100),
      };
    });
  }

  /* ─────────────────────────── Anomalies ─────────────────────────── */

  async getAnomalies(period: Period): Promise<Anomaly[]> {
    const data = await this.load();
    const { start, end } = periodWindow(period);
    const { refs } = data;
    const win = data.writeOffs.filter((r) => inRange(r, start, end));

    const anomalies: Anomaly[] = [];
    data.investigations.forEach((inv) => {
      const matches = win.filter(
        (r) => r.employee_id === inv.employee_id && r.product_id === inv.product_id && r.reason_code === inv.reason_code,
      );
      if (matches.length === 0) return; // нет записей в окне периода
      const rep = matches.reduce((a, b) => (Date.parse(b.created_at) > Date.parse(a.created_at) ? b : a));
      const employee = refs.employeesById.get(inv.employee_id);
      const outlet = employee?.outlet_id ? refs.outletsById.get(employee.outlet_id) : undefined;
      const d = new Date(rep.created_at);
      anomalies.push({
        id: `${inv.employee_id}|${inv.product_id}|${inv.reason_code}`,
        time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
        date: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`,
        locationId: employee?.outlet_id ?? '',
        locationName: outlet?.name ?? '',
        text: `${inv.employee_name ?? inv.employee_id} · ${REASON_LABELS[inv.reason_code]} ×${inv.occurrences} (${inv.product_name ?? inv.product_id})`,
        // severity high → подтверждённый сигнал (theft), medium → под наблюдением (ok)
        type: inv.severity === 'high' ? 'theft' : 'ok',
      });
    });
    anomalies.sort((a, b) => Number(b.type === 'theft') - Number(a.type === 'theft'));
    return anomalies;
  }
}

/** Фабрика источника данных. HTTP-источник игнорирует `LiveData` — всё из бэкенда. */
export function createDataSource(_live: LiveData): DashboardDataSource {
  void _live;
  return new HttpDataSource();
}
