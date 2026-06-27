import type {
  Period, NetworkKpis, LocationStats, LocationDetail, EmployeeStats, EmployeeDetail,
  ProductWaste, ProductDetail, HourlyPoint, Anomaly, ShiftBreakdown, StageBreakdown,
  ReasonCategory, ProductSlice, RiskLevel,
} from './types';
import type { DashboardDataSource, LiveData } from './datasource';
import {
  PERIOD_LOCATIONS, PERIOD_EMPLOYEES, PERIOD_PRODUCTS, PERIOD_PRODUCT_DETAILS,
  PERIOD_KPI_TRENDS, buildHourly, buildAnomalies, metric,
} from './periods';
import { EMPLOYEE_PROFILES, EMPLOYEES } from './seed';

/** Роль сотрудника по id (из справочника). */
const ROLE_BY_EMPLOYEE: Record<string, string> = Object.fromEntries(
  EMPLOYEES.map((e) => [e.id, e.role]),
);

/** Имитация сетевой задержки, чтобы UI был готов к настоящему async-бэкенду. */
const LATENCY_MS = 180;
function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

/** Свести почасовой профиль точки в разбивку по сменам. */
function shiftsFromHourly(hourly: HourlyPoint[]): ShiftBreakdown[] {
  const buckets: Record<string, number> = {
    'Утренняя (07:00–15:00)': 0,
    'Дневная (10:00–18:00)': 0,
    'Вечерняя (18:00–23:00)': 0,
  };
  hourly.forEach((p) => {
    const h = parseInt(p.hour, 10);
    if (h >= 18 || h <= 1) buckets['Вечерняя (18:00–23:00)'] += p.value;
    else if (h >= 10 && h < 18) buckets['Дневная (10:00–18:00)'] += p.value;
    else buckets['Утренняя (07:00–15:00)'] += p.value;
  });
  const total = Object.values(buckets).reduce((s, v) => s + v, 0) || 1;
  return Object.entries(buckets).map(([shift, amount]) => ({
    shift,
    amount: Math.round(amount),
    share: Math.round((amount / total) * 100),
  }));
}

/**
 * Разбивка потерь по этапу цикла.
 * Красные точки имеют аномально высокую долю потерь на «Выдаче» —
 * это классика: отдают без пробития кассы, потом списывают как «брак».
 */
function buildStages(locationId: string): StageBreakdown[] {
  const isThief = locationId === 'mega';
  const isAmber = locationId === 'khan-shatyr' || locationId === 'esentai';

  type StageRow = { code: string; label: string; share: number; net: number };
  const rows: StageRow[] = isThief
    ? [
        { code: 'receiving', label: 'Приёмка',  share: 6,  net: 18 },
        { code: 'storage',   label: 'Хранение', share: 8,  net: 25 },
        { code: 'cooking',   label: 'Готовка',  share: 21, net: 40 },
        { code: 'serving',   label: 'Выдача',   share: 65, net: 17 },
      ]
    : isAmber
    ? [
        { code: 'receiving', label: 'Приёмка',  share: 14, net: 18 },
        { code: 'storage',   label: 'Хранение', share: 28, net: 25 },
        { code: 'cooking',   label: 'Готовка',  share: 42, net: 40 },
        { code: 'serving',   label: 'Выдача',   share: 16, net: 17 },
      ]
    : [
        { code: 'receiving', label: 'Приёмка',  share: 20, net: 18 },
        { code: 'storage',   label: 'Хранение', share: 27, net: 25 },
        { code: 'cooking',   label: 'Готовка',  share: 38, net: 40 },
        { code: 'serving',   label: 'Выдача',   share: 15, net: 17 },
      ];

  return rows.map((r) => ({
    stageCode: r.code,
    stageLabel: r.label,
    amount: 0, // на демо показываем только %, amount считался бы из реальных данных
    share: r.share,
    networkShare: r.net,
  }));
}

/**
 * Разбивка причин по категории ответственности.
 * Ловим «перекладывание на поставщика»: Сарыарка винит внешних поставщиков
 * в 3× чаще среднего по сети, хотя другие точки с тем же поставщиком — в норме.
 */
function buildReasonCategories(locationId: string): ReasonCategory[] {
  const isThief = locationId === 'mega';
  const isAmber = locationId === 'khan-shatyr' || locationId === 'esentai';

  type RCRow = { category: ReasonCategory['category']; label: string; share: number; net: number };
  const rows: RCRow[] = isThief
    ? [
        { category: 'external',     label: 'Поставщик / недовоз', share: 34, net: 11 },
        { category: 'operational',  label: 'Операционный брак',   share: 17, net: 54 },
        { category: 'employee',     label: 'Вина сотрудника',      share: 49, net: 35 },
      ]
    : isAmber
    ? [
        { category: 'external',     label: 'Поставщик / недовоз', share: 13, net: 11 },
        { category: 'operational',  label: 'Операционный брак',   share: 51, net: 54 },
        { category: 'employee',     label: 'Вина сотрудника',      share: 36, net: 35 },
      ]
    : [
        { category: 'external',     label: 'Поставщик / недовоз', share: 9,  net: 11 },
        { category: 'operational',  label: 'Операционный брак',   share: 57, net: 54 },
        { category: 'employee',     label: 'Вина сотрудника',      share: 34, net: 35 },
      ];

  return rows.map((r) => ({
    category: r.category,
    label: r.label,
    share: r.share,
    networkShare: r.net,
  }));
}

const FLAG_TEXT: Record<string, string> = {
  'exceeds-norm': 'превышение нормы отхода',
  'duplicate-photo': 'дубликат фото',
  'anomaly-employee': 'аномалия по сотруднику',
  'supplier-anomaly': 'брак поставщика выше нормы по сети',
  'night-shift-pattern': 'паттерн ночных списаний',
};

const REASON_CATEGORY_LABELS: Record<ReasonCategory['category'], string> = {
  external: 'Поставщик / недовоз',
  operational: 'Операционный брак',
  employee: 'Вина сотрудника',
};

const NETWORK_REASON_SHARE: Record<ReasonCategory['category'], number> = {
  external: 11,
  operational: 54,
  employee: 35,
};

function riskFromMultiplier(m: number): RiskLevel {
  if (m >= 2.5) return 'high';
  if (m >= 1.5) return 'medium';
  return 'low';
}

/**
 * Мок-источник данных дашборда.
 *
 * Принимает `LiveData` (живые заявки из AppContext), чтобы счётчики и флаги отражали
 * реальный поток сотрудник→менеджер. Всё остальное — из мультипериодного seed.
 * Заменяется на HttpDataSource без изменений в UI.
 */
export class MockDataSource implements DashboardDataSource {
  constructor(private live: LiveData) {}

  async getNetworkKpis(period: Period): Promise<NetworkKpis> {
    const locations = PERIOD_LOCATIONS[period];
    const trends = PERIOD_KPI_TRENDS[period];

    const unexplained = locations.reduce((s, l) => s + l.unexplainedDeficit, 0);
    const avgVar =
      Math.round((locations.reduce((s, l) => s + l.variancePercent, 0) / locations.length) * 10) / 10;
    const red = locations.filter((l) => l.status === 'red').length;

    return delay({
      unexplainedDeficit: metric(unexplained, trends.unexplainedDeficit),
      avgVariance: metric(avgVar, trends.avgVariance),
      redLocations: metric(red, trends.redLocations),
      // Живое значение из Context, тренд/спарклайн — из seed.
      pendingReviews: metric(this.live.pendingCount, trends.pendingReviews),
    });
  }

  async getLocations(period: Period): Promise<LocationStats[]> {
    return delay(PERIOD_LOCATIONS[period]);
  }

  async getLocationDetail(period: Period, locationId: string): Promise<LocationDetail> {
    const stats = PERIOD_LOCATIONS[period].find((l) => l.locationId === locationId);
    if (!stats) throw new Error(`Локация не найдена: ${locationId}`);

    const employees = PERIOD_EMPLOYEES[period].filter((e) => e.locationId === locationId);
    const hourly = buildHourly(period, locationId);
    const shifts = shiftsFromHourly(hourly);
    const stages = buildStages(locationId);
    const reasonCategories = buildReasonCategories(locationId);
    const products = PERIOD_PRODUCTS[period];

    // Текстовые флаги по точке: из живых заявок этой локации.
    const locRequests = this.live.requests.filter((r) => r.locationId === locationId);
    const flagSet = new Set<string>();
    locRequests.forEach((r) => r.flags.forEach((f) => flagSet.add(f)));
    const flags = Array.from(flagSet).map((f) => FLAG_TEXT[f] ?? f);

    return delay({ stats, employees, hourly, shifts, stages, reasonCategories, products, flags });
  }

  async getEmployeeStats(period: Period, locationId?: string): Promise<EmployeeStats[]> {
    const all = PERIOD_EMPLOYEES[period];
    return delay(locationId ? all.filter((e) => e.locationId === locationId) : all);
  }

  async getEmployeeDetail(period: Period, employeeId: string): Promise<EmployeeDetail> {
    const stats = PERIOD_EMPLOYEES[period].find((e) => e.employeeId === employeeId);
    if (!stats) throw new Error(`Сотрудник не найден: ${employeeId}`);
    const profile = EMPLOYEE_PROFILES.find((p) => p.employeeId === employeeId);

    // Недостача точки за тот же период — основа приписываемой доли.
    const loc = PERIOD_LOCATIONS[period].find((l) => l.locationName === stats.locationName);
    const locUnexplained = loc?.unexplainedDeficit ?? 0;

    const byProduct: ProductSlice[] = (profile?.topProducts ?? []).map((tp) => ({
      product: tp.product,
      share: tp.share,
      amount: Math.round((stats.totalWriteOffs * tp.share) / 100),
      count: Math.max(1, Math.round((stats.writeOffCount * tp.share) / 100)),
    }));

    const byReason: ReasonCategory[] = (profile?.reasonShares ?? []).map((r) => ({
      category: r.category,
      label: REASON_CATEGORY_LABELS[r.category],
      share: r.share,
      networkShare: NETWORK_REASON_SHARE[r.category],
    }));

    const byShift: ShiftBreakdown[] = (profile?.shiftShares ?? []).map((s) => ({
      shift: s.shift,
      amount: Math.round((stats.totalWriteOffs * s.share) / 100),
      share: s.share,
    }));

    const attributedUnexplained = Math.round(
      locUnexplained * ((profile?.attributedShare ?? 0) / 100),
    );

    const flagTexts = stats.flags.map((f) => FLAG_TEXT[f] ?? f);
    const requests = this.live.requests.filter((r) => r.employeeId === employeeId);

    return delay({
      stats,
      role: ROLE_BY_EMPLOYEE[employeeId] ?? 'Сотрудник',
      riskLevel: riskFromMultiplier(stats.medianMultiplier),
      attributedUnexplained,
      byProduct,
      byReason,
      byShift,
      weeklyTrend: profile?.weeklyTrend ?? [],
      flagTexts,
      requests,
    });
  }

  async getProductWaste(period: Period): Promise<ProductWaste[]> {
    return delay(PERIOD_PRODUCTS[period]);
  }

  async getProductDetails(period: Period): Promise<ProductDetail[]> {
    return delay(PERIOD_PRODUCT_DETAILS[period]);
  }

  async getHourly(period: Period, locationId?: string): Promise<HourlyPoint[]> {
    return delay(buildHourly(period, locationId));
  }

  async getAnomalies(period: Period): Promise<Anomaly[]> {
    return delay(buildAnomalies(period));
  }
}

/** Фабрика — единственное место, где UI «знает» конкретную реализацию.
 *  Чтобы подключить бэкенд: вернуть здесь `new HttpDataSource(...)`. */
export function createDataSource(live: LiveData): DashboardDataSource {
  return new MockDataSource(live);
}
