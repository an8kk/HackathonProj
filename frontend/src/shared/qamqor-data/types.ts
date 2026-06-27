export type ProductType = 'unit' | 'weight';
export type WriteOffStatus = 'pending' | 'approved' | 'rejected';
export type LocationStatus = 'green' | 'amber' | 'red';

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  unit: string;
  wasteNorm?: number;
  costPerUnit: number;
}

export interface Location {
  id: string;
  name: string;
  district: string;
}

export interface Employee {
  id: string;
  name: string;
  shortName: string;
  locationId: string;
  role: string;
}

export interface WriteOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  locationId: string;
  locationName: string;
  productId: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  wastePercent?: number;
  reasonCode: string;
  reasonLabel: string;
  stageCode: string;
  stageLabel: string;
  comment: string;
  photoId: string;
  shift: string;
  timestamp: string;
  status: WriteOffStatus;
  /** 'with_deduction' | 'no_deduction' — matches mobile WriteOffEntry.writeOffType */
  writeOffType: 'with_deduction' | 'no_deduction';
  /** true if the write-off type was suggested by AI, false if manually overridden */
  aiSuggestedType: boolean;
  /** set when employee overrides AI suggestion */
  overrideExplanation?: string;
  flags: string[];
  rejectionReason?: string;
}

export interface LocationStats {
  locationId: string;
  locationName: string;
  district: string;
  theoreticalLoss: number;
  actualDeficit: number;
  declaredWriteOffs: number;
  variancePercent: number;
  unexplainedDeficit: number;
  status: LocationStatus;
  monthlyRevenue: number;
}

export interface EmployeeStats {
  employeeId: string;
  employeeName: string;
  locationId: string;
  locationName: string;
  totalWriteOffs: number;
  writeOffCount: number;
  medianMultiplier: number;
  flags: string[];
}

/* ─────────────────────────── Dashboard data layer ─────────────────────────── */

export type Period = 'today' | 'week' | 'month' | 'quarter';

export const PERIOD_LABELS: Record<Period, string> = {
  today: 'Сегодня',
  week: 'Неделя',
  month: 'Месяц',
  quarter: 'Квартал',
};

/** Одна метрика с трендом относительно прошлого периода. */
export interface Metric {
  value: number;
  prev: number;
  /** Историческая мини-серия для спарклайна (старое → новое). */
  spark: number[];
}

export interface NetworkKpis {
  /** Необъяснённая недостача, ₸. */
  unexplainedDeficit: Metric;
  /** Средний AvT variance по сети, %. */
  avgVariance: Metric;
  /** Кол-во точек в красной зоне. */
  redLocations: Metric;
  /** Заявок на проверке (живое из Context). */
  pendingReviews: Metric;
}

export interface ProductWaste {
  product: string;
  norm: number;
  declared: number;
  worstLocation: number;
  worstLocationName: string;
}

export interface HourlyPoint {
  hour: string;
  value: number;
  benchmark: number;
}

export type AnomalyType = 'theft' | 'ok';

export interface Anomaly {
  id: string;
  time: string;
  date: string;
  locationId: string;
  locationName: string;
  text: string;
  type: AnomalyType;
}

/** Разбивка списаний точки по сменам. */
export interface ShiftBreakdown {
  shift: string;
  amount: number;
  share: number;
}

/** Разбивка потерь по этапу производственного цикла. */
export interface StageBreakdown {
  stageCode: string;
  stageLabel: string;
  amount: number;
  share: number;
  /** Средний % по сети для этого этапа — для сравнения. */
  networkShare: number;
}

/** Разбивка причин списаний по категории ответственности. */
export interface ReasonCategory {
  category: 'external' | 'operational' | 'employee';
  label: string;
  /** % от суммы списаний этой точки. */
  share: number;
  /** Средний % по сети — чтобы поймать «перекладывание на поставщика». */
  networkShare: number;
}

/** Полная детализация точки для drill-down. */
export interface LocationDetail {
  stats: LocationStats;
  employees: EmployeeStats[];
  hourly: HourlyPoint[];
  shifts: ShiftBreakdown[];
  stages: StageBreakdown[];
  reasonCategories: ReasonCategory[];
  products: ProductWaste[];
  /** Краткие текстовые флаги по точке. */
  flags: string[];
}

/* ─────────────────────────── Dashboard navigation ─────────────────────────── */

export type DashboardView =
  | 'overview'
  | 'locations'
  | 'employees'
  | 'products'
  | 'investigations'
  | 'reconciliation';

/* ─────────────────────────── Employee dossier ─────────────────────────── */

export type RiskLevel = 'high' | 'medium' | 'low';

/** Долевой срез списаний сотрудника по продукту. */
export interface ProductSlice {
  product: string;
  count: number;
  amount: number;
  share: number;
}

/** Полное досье сотрудника для drill-down. */
export interface EmployeeDetail {
  stats: EmployeeStats;
  role: string;
  riskLevel: RiskLevel;
  /** Сколько необъяснённой недостачи «висит» на сотруднике, ₸. */
  attributedUnexplained: number;
  byProduct: ProductSlice[];
  byReason: ReasonCategory[];
  byShift: ShiftBreakdown[];
  /** Недельная динамика суммы списаний для спарклайна. */
  weeklyTrend: number[];
  /** Текстовые флаги по сотруднику. */
  flagTexts: string[];
  /** Живые заявки сотрудника (из Context). */
  requests: WriteOffRequest[];
}

/* ─────────────────────────── Product breakdown ─────────────────────────── */

/** Доля списания одной точки по продукту, %. */
export interface ProductLocationShare {
  locationName: string;
  declared: number;
  overNorm: boolean;
}

/** Детализация по одному продукту для раздела «Продукты». */
export interface ProductDetail {
  product: string;
  type: ProductType;
  /** Норма отхода, % (только для весовых). */
  norm: number;
  /** Средний задекларированный % по сети. */
  networkDeclared: number;
  worstLocationName: string;
  worstDeclared: number;
  /** Стоимость списанного за период, ₸. */
  totalCost: number;
  /** Стоимость сверх нормы (потенциальное хищение), ₸. */
  overNormCost: number;
  locations: ProductLocationShare[];
}

/* ─────────────────────────── Investigations ─────────────────────────── */

export type InvestigationStatus = 'open' | 'in_progress' | 'closed';

export const INVESTIGATION_STATUS_LABELS: Record<InvestigationStatus, string> = {
  open: 'Открыто',
  in_progress: 'В работе',
  closed: 'Закрыто',
};

export interface InvestigationNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Investigation {
  id: string;
  locationId: string;
  locationName: string;
  status: InvestigationStatus;
  assignee: string;
  reason: string;
  notes: InvestigationNote[];
  openedAt: string;
  /** Снимок недостачи на момент открытия, ₸. */
  deficitAtOpen: number;
}
