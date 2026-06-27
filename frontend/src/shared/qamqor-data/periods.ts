import type {
  Period, LocationStats, EmployeeStats, ProductWaste,
  HourlyPoint, Anomaly, LocationStatus, Metric,
  ProductDetail, ProductLocationShare,
} from './types';
import {
  LOCATION_STATS, EMPLOYEE_STATS, PRODUCT_WASTE_STATS, LOCATIONS,
} from './seed';

/**
 * Мультипериодные данные дашборда.
 *
 * `month` — канонический сюжет (совпадает с seed). Остальные периоды масштабируются
 * программно от него, но сохраняют главную историю: «Bahandi Сарыарка» ворует в любом
 * срезе (variance > 3%, ночной всплеск, аномальный сотрудник Асан Е.).
 *
 * Числа намеренно держатся в одном месте и согласованы между собой, чтобы при защите
 * перед жюри переключение периода выглядело как живая аналитика, а не случайные цифры.
 */

interface PeriodConfig {
  /** Множитель денежных сумм относительно месяца. */
  money: number;
  /** Множитель количества заявок/событий. */
  count: number;
  /** Поправка к variance (период «дышит»). */
  varianceFactor: number;
}

const PERIOD_CONFIG: Record<Period, PeriodConfig> = {
  today: { money: 0.038, count: 0.04, varianceFactor: 1.06 },
  week: { money: 0.25, count: 0.25, varianceFactor: 0.97 },
  month: { money: 1, count: 1, varianceFactor: 1 },
  quarter: { money: 3.05, count: 3.05, varianceFactor: 0.94 },
};

function statusFromVariance(v: number): LocationStatus {
  if (v < 2) return 'green';
  if (v < 3) return 'amber';
  return 'red';
}

function round(n: number, step = 100): number {
  return Math.round(n / step) * step;
}

/* ─────────────────────────── Локации по периодам ─────────────────────────── */

function buildLocations(period: Period): LocationStats[] {
  const cfg = PERIOD_CONFIG[period];
  return LOCATION_STATS.map((base) => {
    const variance = Math.round(base.variancePercent * cfg.varianceFactor * 10) / 10;
    return {
      ...base,
      theoreticalLoss: round(base.theoreticalLoss * cfg.money),
      actualDeficit: round(base.actualDeficit * cfg.money),
      declaredWriteOffs: round(base.declaredWriteOffs * cfg.money),
      unexplainedDeficit: round(base.unexplainedDeficit * cfg.money),
      monthlyRevenue: round(base.monthlyRevenue * cfg.money, 1000),
      variancePercent: variance,
      status: statusFromVariance(variance),
    };
  });
}

export const PERIOD_LOCATIONS: Record<Period, LocationStats[]> = {
  today: buildLocations('today'),
  week: buildLocations('week'),
  month: buildLocations('month'),
  quarter: buildLocations('quarter'),
};

/* ─────────────────────────── Сотрудники по периодам ─────────────────────────── */

function buildEmployees(period: Period): EmployeeStats[] {
  const cfg = PERIOD_CONFIG[period];
  return EMPLOYEE_STATS.map((base) => ({
    ...base,
    totalWriteOffs: round(base.totalWriteOffs * cfg.money),
    writeOffCount: Math.max(1, Math.round(base.writeOffCount * cfg.count)),
    medianMultiplier: Math.round(base.medianMultiplier * cfg.varianceFactor * 10) / 10,
  }));
}

export const PERIOD_EMPLOYEES: Record<Period, EmployeeStats[]> = {
  today: buildEmployees('today'),
  week: buildEmployees('week'),
  month: buildEmployees('month'),
  quarter: buildEmployees('quarter'),
};

/* ─────────────────────────── Продукты (списания vs норма) ─────────────────────────── */

function buildProducts(period: Period): ProductWaste[] {
  const cfg = PERIOD_CONFIG[period];
  return PRODUCT_WASTE_STATS.map((p) => ({
    product: p.product,
    norm: p.norm,
    declared: Math.round(p.declared * 10) / 10,
    worstLocation: Math.round(p.mega * cfg.varianceFactor * 10) / 10,
    worstLocationName: 'Mega Silk Way',
  }));
}

export const PERIOD_PRODUCTS: Record<Period, ProductWaste[]> = {
  today: buildProducts('today'),
  week: buildProducts('week'),
  month: buildProducts('month'),
  quarter: buildProducts('quarter'),
};

/* ─────────────────────── Детализация по продуктам (раздел «Продукты») ─────────────────────── */

/** Имена точек сети без префикса (для разбивки продукта по точкам). */
const LOCATION_SHORT_NAMES = LOCATION_STATS.map((l) => l.locationName.replace('Bahandi ', ''));

function buildProductDetails(period: Period): ProductDetail[] {
  const cfg = PERIOD_CONFIG[period];
  return PRODUCT_WASTE_STATS.map((p) => {
    const worst = Math.round(p.mega * cfg.varianceFactor * 10) / 10;
    const netAvg = Math.round(p.declared * 10) / 10;
    const totalCost = round(p.monthlyCost * cfg.money);

    // Распределяем точки: большинство около сетевого среднего, Mega Silk Way — худшая.
    const locations: ProductLocationShare[] = LOCATION_SHORT_NAMES.map((name, i) => {
      let declared: number;
      if (name === 'Mega Silk Way') declared = worst;
      else if (name === 'Хан Шатыр') declared = Math.round((p.norm * 0.95) * 10) / 10;
      else if (name === 'Есентай Молл') declared = Math.round((p.norm * 0.9) * 10) / 10;
      else declared = Math.round((netAvg + ((i % 3) - 1) * 0.8) * 10) / 10;
      return { locationName: name, declared, overNorm: declared > p.norm };
    }).sort((a, b) => b.declared - a.declared);

    // Стоимость сверх нормы: только то, что точки списали выше нормы отхода.
    const overNormCost = round(
      locations.reduce((s, l) => {
        const excess = Math.max(0, l.declared - p.norm) / 100;
        return s + excess * (totalCost / LOCATION_SHORT_NAMES.length) * 4;
      }, 0),
    );

    return {
      product: p.product,
      type: p.type,
      norm: p.norm,
      networkDeclared: netAvg,
      worstLocationName: 'Mega Silk Way',
      worstDeclared: worst,
      totalCost,
      overNormCost,
      locations,
    };
  });
}

export const PERIOD_PRODUCT_DETAILS: Record<Period, ProductDetail[]> = {
  today: buildProductDetails('today'),
  week: buildProductDetails('week'),
  month: buildProductDetails('month'),
  quarter: buildProductDetails('quarter'),
};

/* ─────────────────────────── Почасовые списания ─────────────────────────── */

/** Базовый дневной профиль точки (₸/час) — нормальная точка без воровства. */
function normalHourProfile(hour: number, scale: number): number {
  const peak = hour >= 12 && hour <= 14 ? 1.7 : 1;
  const day = hour >= 8 && hour <= 21 ? 1 : 0.35;
  return round(900 * scale * peak * day, 50);
}

/** Профиль ворующей точки: ночной всплеск 22–23ч перед закрытием. */
function thiefHourProfile(hour: number, scale: number): number {
  const base = normalHourProfile(hour, scale);
  const night = hour === 22 ? 9000 : hour === 23 ? 6500 : hour === 0 ? 2200 : 0;
  return base + round(night * scale, 50);
}

export function buildHourly(period: Period, locationId?: string): HourlyPoint[] {
  const cfg = PERIOD_CONFIG[period];
  const scale = cfg.money;
  // Для общесетевого графика показываем ворующую точку (Mega Silk Way) против среднего по сети.
  const isThief = locationId ? locationId === 'mega' : true;
  const targetId = locationId ?? 'mega';
  const loc = LOCATIONS.find((l) => l.id === targetId);
  const revScale = loc ? 1 : 1;

  return Array.from({ length: 24 }, (_, hour) => {
    const value = isThief
      ? thiefHourProfile(hour, scale * revScale)
      : normalHourProfile(hour, scale * revScale * 1.1);
    const benchmark = normalHourProfile(hour, scale);
    return {
      hour: `${String(hour).padStart(2, '0')}:00`,
      value,
      benchmark,
    };
  });
}

/* ─────────────────────────── Лента аномалий ─────────────────────────── */

const ALL_ANOMALIES: Anomaly[] = [
  {
    id: 'a1', time: '22:14', date: '26.06', locationId: 'mega', locationName: 'Mega Silk Way',
    text: 'Дамир А. — списание помидора 22.4% при норме 14%. Превышение ×1.6.', type: 'theft',
  },
  {
    id: 'a2', time: '22:47', date: '25.06', locationId: 'mega', locationName: 'Mega Silk Way',
    text: 'Дубликат фото в заявках req-001 и req-002. Идентичный снимок.', type: 'theft',
  },
  {
    id: 'a3', time: '23:02', date: '24.06', locationId: 'mega', locationName: 'Mega Silk Way',
    text: 'Ночной всплеск списаний: 6 заявок в окне 22:00–23:00.', type: 'theft',
  },
  {
    id: 'a4', time: '09:15', date: '27.06', locationId: 'mega', locationName: 'Mega Silk Way',
    text: 'Брак поставщика по помидорам: 19% vs 3% по сети в этом месяце.', type: 'theft',
  },
  {
    id: 'a5', time: '13:22', date: '27.06', locationId: 'dostyk', locationName: 'Достык Плаза',
    text: 'Списание котлет — причина: пережог на гриле. В норме.', type: 'ok',
  },
  {
    id: 'a6', time: '08:30', date: '27.06', locationId: 'dostyk', locationName: 'Достык Плаза',
    text: 'Недовоз булочек 8 шт — подтверждён с накладной.', type: 'ok',
  },
  {
    id: 'a7', time: '19:40', date: '23.06', locationId: 'esentai', locationName: 'Есентай Молл',
    text: 'Капуста: списание 21% при норме 20% — на грани, под наблюдением.', type: 'theft',
  },
  {
    id: 'a8', time: '14:05', date: '22.06', locationId: 'khan-shatyr', locationName: 'Хан Шатыр',
    text: 'Лёгкое превышение по соусу. Разовое, не критично.', type: 'ok',
  },
];

const ANOMALY_COUNT: Record<Period, number> = {
  today: 3,
  week: 5,
  month: 8,
  quarter: 8,
};

export function buildAnomalies(period: Period): Anomaly[] {
  // Сначала theft-флаги (важное наверх), затем ok — и обрезаем по периоду.
  const theft = ALL_ANOMALIES.filter((a) => a.type === 'theft');
  const ok = ALL_ANOMALIES.filter((a) => a.type === 'ok');
  return [...theft, ...ok].slice(0, ANOMALY_COUNT[period]);
}

/* ─────────────────────────── Тренды KPI (value/prev/spark) ─────────────────────────── */

/**
 * Заранее заданные «прошлый период» и мини-серии для спарклайнов.
 * `value` метрик считается на лету из локаций (чтобы всегда совпадало),
 * здесь только история для стрелок ↑↓ и графиков.
 */
interface KpiTrend { prev: number; spark: number[]; }

export const PERIOD_KPI_TRENDS: Record<Period, {
  unexplainedDeficit: KpiTrend;
  avgVariance: KpiTrend;
  redLocations: KpiTrend;
  pendingReviews: KpiTrend;
}> = {
  today: {
    unexplainedDeficit: { prev: 28_400, spark: [9, 12, 11, 18, 22, 26, 31] },
    avgVariance: { prev: 2.1, spark: [2.0, 2.2, 2.1, 2.3, 2.2, 2.3, 2.4] },
    redLocations: { prev: 1, spark: [1, 1, 0, 1, 1, 1, 1] },
    pendingReviews: { prev: 4, spark: [2, 3, 5, 4, 6, 5, 5] },
  },
  week: {
    unexplainedDeficit: { prev: 196_000, spark: [120, 150, 180, 175, 210, 230, 240] },
    avgVariance: { prev: 2.3, spark: [1.9, 2.1, 2.2, 2.3, 2.2, 2.3, 2.2] },
    redLocations: { prev: 1, spark: [1, 1, 1, 2, 1, 1, 1] },
    pendingReviews: { prev: 6, spark: [4, 5, 7, 6, 8, 6, 5] },
  },
  month: {
    unexplainedDeficit: { prev: 642_000, spark: [410, 520, 610, 700, 760, 800, 905] },
    avgVariance: { prev: 2.1, spark: [1.7, 1.9, 2.0, 2.2, 2.1, 2.2, 2.3] },
    redLocations: { prev: 0, spark: [0, 0, 1, 1, 1, 1, 1] },
    pendingReviews: { prev: 5, spark: [3, 4, 6, 5, 7, 6, 5] },
  },
  quarter: {
    unexplainedDeficit: { prev: 2_180_000, spark: [1400, 1700, 2000, 2300, 2500, 2700, 2900] },
    avgVariance: { prev: 1.9, spark: [1.6, 1.8, 1.9, 2.0, 2.1, 2.1, 2.2] },
    redLocations: { prev: 0, spark: [0, 1, 1, 1, 1, 1, 1] },
    pendingReviews: { prev: 14, spark: [9, 11, 13, 12, 15, 13, 12] },
  },
};

/** Удобный конструктор Metric. */
export function metric(value: number, trend: KpiTrend): Metric {
  return { value, prev: trend.prev, spark: trend.spark };
}
