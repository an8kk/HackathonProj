import type { Product, Location, Employee, WriteOffRequest, LocationStats, EmployeeStats, ProductType } from './types';

export const PRODUCTS: Product[] = [
  { id: 'beef-patty', name: 'Котлета говяжья', type: 'unit', unit: 'шт', costPerUnit: 850 },
  { id: 'chicken-patty', name: 'Котлета куриная', type: 'unit', unit: 'шт', costPerUnit: 720 },
  { id: 'bun', name: 'Булочка', type: 'unit', unit: 'шт', costPerUnit: 180 },
  { id: 'cheese-slice', name: 'Сыр-слайс', type: 'unit', unit: 'шт', costPerUnit: 250 },
  { id: 'tomato', name: 'Помидор', type: 'weight', unit: 'г', wasteNorm: 14, costPerUnit: 1.2 },
  { id: 'onion', name: 'Лук', type: 'weight', unit: 'г', wasteNorm: 16, costPerUnit: 0.38 },
  { id: 'cabbage', name: 'Капуста', type: 'weight', unit: 'г', wasteNorm: 20, costPerUnit: 0.29 },
  { id: 'sauce', name: 'Соус', type: 'weight', unit: 'г', wasteNorm: 5, costPerUnit: 3.2 },
  { id: 'fries', name: 'Картофель фри', type: 'weight', unit: 'г', wasteNorm: 8, costPerUnit: 0.68 },
];

// Matches allOutlets in mobile/lib/store/auth_store.dart
export const LOCATIONS: Location[] = [
  { id: 'mega', name: 'Mega Silk Way', district: 'пр. Алтынсарина, 7/1' },
  { id: 'dostyk', name: 'Достык Плаза', district: 'пр. Достык, 111' },
  { id: 'khan-shatyr', name: 'Хан Шатыр', district: 'пр. Туран, 37' },
  { id: 'esentai', name: 'Есентай Молл', district: 'пр. Аль-Фараби, 77/8' },
  { id: 'almaty-mall', name: 'Алматы Молл', district: 'ул. Розыбакиева, 247' },
];

// Mirrors mockEmployees in mobile/lib/store/auth_store.dart (IDs 1001–1007)
export const EMPLOYEES: Employee[] = [
  { id: '1001', name: 'Айгерим Сейткали', shortName: 'Айгерим С.', locationId: 'mega', role: 'Кассир' },
  { id: '1002', name: 'Дамир Ахметов', shortName: 'Дамир А.', locationId: 'mega', role: 'Повар' },
  { id: '1006', name: 'Берик Нурланов', shortName: 'Берик Н.', locationId: 'mega', role: 'Супервайзер' },
  { id: '1003', name: 'Нурзат Бекова', shortName: 'Нурзат Б.', locationId: 'dostyk', role: 'Повар' },
  { id: '1004', name: 'Санжар Ержанов', shortName: 'Санжар Е.', locationId: 'dostyk', role: 'Кассир' },
  { id: '1007', name: 'Алия Джаксыбекова', shortName: 'Алия Д.', locationId: 'dostyk', role: 'Супервайзер' },
  { id: '1005', name: 'Мадина Касымова', shortName: 'Мадина К.', locationId: 'khan-shatyr', role: 'Кассир' },
];

export const WRITE_OFF_REASONS: { code: string; label: string; forTypes?: ProductType[] }[] = [
  { code: 'expired', label: 'Истёк срок годности', forTypes: ['unit', 'weight'] },
  { code: 'equipment-failure', label: 'Поломка оборудования', forTypes: ['unit', 'weight'] },
  { code: 'trimming', label: 'Обрезка', forTypes: ['weight'] },
  { code: 'drying', label: 'Усушка/Утруска', forTypes: ['weight'] },
  { code: 'dropped', label: 'Упал/Разбился', forTypes: ['unit', 'weight'] },
  { code: 'overcooked', label: 'Пережарил/Испортил', forTypes: ['unit', 'weight'] },
  { code: 'supplier-defect', label: 'Брак поставщика', forTypes: ['unit', 'weight'] },
  { code: 'short-delivery', label: 'Недовоз', forTypes: ['unit', 'weight'] },
];

export const STAGES = [
  { code: 'receiving', label: 'Приёмка' },
  { code: 'storage', label: 'Хранение' },
  { code: 'cooking', label: 'Готовка' },
  { code: 'serving', label: 'Выдача' },
];

export const SEEDED_REQUESTS: WriteOffRequest[] = [
  {
    id: 'req-001',
    employeeId: '1002',
    employeeName: 'Дамир А.',
    locationId: 'mega',
    locationName: 'Bahandi Mega Silk Way',
    productId: 'tomato',
    productName: 'Помидор',
    productType: 'weight',
    quantity: 4800,
    wastePercent: 22.4,
    reasonCode: 'trimming',
    reasonLabel: 'Обрезка',
    stageCode: 'cooking',
    stageLabel: 'Готовка',
    comment: 'Помидоры пришли мягкие, пришлось срезать много',
    photoId: 'photo-dup-A',
    shift: 'Вечерняя (18:00–23:00)',
    timestamp: '2026-06-26T22:14:00',
    status: 'pending',
    writeOffType: 'no_deduction',
    aiSuggestedType: true,
    flags: ['exceeds-norm', 'anomaly-employee'],
  },
  {
    id: 'req-002',
    employeeId: '1002',
    employeeName: 'Дамир А.',
    locationId: 'mega',
    locationName: 'Bahandi Mega Silk Way',
    productId: 'tomato',
    productName: 'Помидор',
    productType: 'weight',
    quantity: 3200,
    wastePercent: 19.1,
    reasonCode: 'supplier-defect',
    reasonLabel: 'Брак поставщика',
    stageCode: 'receiving',
    stageLabel: 'Приёмка',
    comment: 'Поставщик привёз бракованную партию, много тёмных пятен',
    photoId: 'photo-dup-A',
    shift: 'Вечерняя (18:00–23:00)',
    timestamp: '2026-06-25T22:47:00',
    status: 'pending',
    writeOffType: 'with_deduction',
    aiSuggestedType: false,
    overrideExplanation: 'Не проверил партию при приёмке, перекладываю на поставщика',
    flags: ['exceeds-norm', 'duplicate-photo', 'supplier-anomaly'],
  },
  {
    id: 'req-003',
    employeeId: '1003',
    employeeName: 'Нурзат Б.',
    locationId: 'dostyk',
    locationName: 'Bahandi Достык Плаза',
    productId: 'beef-patty',
    productName: 'Котлета говяжья',
    productType: 'unit',
    quantity: 3,
    reasonCode: 'overcooked',
    reasonLabel: 'Пережарил/Испортил',
    stageCode: 'cooking',
    stageLabel: 'Готовка',
    comment: 'Три котлеты подгорели во время пиковой нагрузки, гриль перегрелся',
    photoId: 'photo-003',
    shift: 'Дневная (10:00–18:00)',
    timestamp: '2026-06-27T13:22:00',
    status: 'pending',
    writeOffType: 'no_deduction',
    aiSuggestedType: true,
    flags: [],
  },
  {
    id: 'req-004',
    employeeId: '1001',
    employeeName: 'Айгерим С.',
    locationId: 'mega',
    locationName: 'Bahandi Mega Silk Way',
    productId: 'fries',
    productName: 'Картофель фри',
    productType: 'weight',
    quantity: 1800,
    wastePercent: 7.2,
    reasonCode: 'drying',
    reasonLabel: 'Усушка/Утруска',
    stageCode: 'storage',
    stageLabel: 'Хранение',
    comment: 'Обычная усушка при хранении в холодильнике — в пределах нормы',
    photoId: 'photo-004',
    shift: 'Дневная (10:00–18:00)',
    timestamp: '2026-06-27T11:05:00',
    status: 'pending',
    writeOffType: 'no_deduction',
    aiSuggestedType: true,
    flags: [],
  },
  {
    id: 'req-005',
    employeeId: '1004',
    employeeName: 'Санжар Е.',
    locationId: 'dostyk',
    locationName: 'Bahandi Достык Плаза',
    productId: 'bun',
    productName: 'Булочка',
    productType: 'unit',
    quantity: 8,
    reasonCode: 'short-delivery',
    reasonLabel: 'Недовоз',
    stageCode: 'receiving',
    stageLabel: 'Приёмка',
    comment: 'В накладной 200 булочек, по факту пришло 192, при приёмке пересчитали с кладовщиком',
    photoId: 'photo-005',
    shift: 'Утренняя (07:00–15:00)',
    timestamp: '2026-06-27T08:30:00',
    status: 'approved',
    writeOffType: 'no_deduction',
    aiSuggestedType: true,
    flags: [],
  },
  {
    id: 'req-006',
    employeeId: '1005',
    employeeName: 'Мадина К.',
    locationId: 'khan-shatyr',
    locationName: 'Bahandi Хан Шатыр',
    productId: 'cabbage',
    productName: 'Капуста',
    productType: 'weight',
    quantity: 2400,
    wastePercent: 18.5,
    reasonCode: 'trimming',
    reasonLabel: 'Обрезка',
    stageCode: 'cooking',
    stageLabel: 'Готовка',
    comment: 'Снимал верхние листья и обрезал кочерыжку перед нарезкой',
    photoId: 'photo-006',
    shift: 'Дневная (10:00–18:00)',
    timestamp: '2026-06-27T10:45:00',
    status: 'pending',
    writeOffType: 'no_deduction',
    aiSuggestedType: true,
    flags: [],
  },
];

export const LOCATION_STATS: LocationStats[] = [
  {
    locationId: 'esentai',
    locationName: 'Bahandi Есентай Молл',
    district: 'пр. Аль-Фараби, 77/8',
    theoreticalLoss: 63_000,
    actualDeficit: 56_700,
    declaredWriteOffs: 58_200,
    variancePercent: 0.9,
    unexplainedDeficit: 0,
    status: 'green',
    monthlyRevenue: 4_200_000,
  },
  {
    locationId: 'almaty-mall',
    locationName: 'Bahandi Алматы Молл',
    district: 'ул. Розыбакиева, 247',
    theoreticalLoss: 76_500,
    actualDeficit: 56_100,
    declaredWriteOffs: 62_400,
    variancePercent: 1.1,
    unexplainedDeficit: 0,
    status: 'green',
    monthlyRevenue: 5_100_000,
  },
  {
    locationId: 'dostyk',
    locationName: 'Bahandi Достык Плаза',
    district: 'пр. Достык, 111',
    theoreticalLoss: 73_500,
    actualDeficit: 88_200,
    declaredWriteOffs: 85_700,
    variancePercent: 1.8,
    unexplainedDeficit: 14_700,
    status: 'green',
    monthlyRevenue: 4_900_000,
  },
  {
    locationId: 'khan-shatyr',
    locationName: 'Bahandi Хан Шатыр',
    district: 'пр. Туран, 37',
    theoreticalLoss: 108_000,
    actualDeficit: 172_800,
    declaredWriteOffs: 166_400,
    variancePercent: 2.4,
    unexplainedDeficit: 38_400,
    status: 'amber',
    monthlyRevenue: 7_200_000,
  },
  {
    locationId: 'mega',
    locationName: 'Bahandi Mega Silk Way',
    district: 'пр. Алтынсарина, 7/1',
    theoreticalLoss: 87_000,
    actualDeficit: 1_046_600,
    declaredWriteOffs: 234_600,
    variancePercent: 6.2,
    unexplainedDeficit: 812_000,
    status: 'red',
    monthlyRevenue: 5_800_000,
  },
];

export const EMPLOYEE_STATS: EmployeeStats[] = [
  {
    employeeId: '1002',
    employeeName: 'Дамир А.',
    locationId: 'mega',
    locationName: 'Bahandi Mega Silk Way',
    totalWriteOffs: 184_500,
    writeOffCount: 23,
    medianMultiplier: 4.1,
    flags: ['anomaly-employee', 'night-shift-pattern', 'exceeds-norm', 'duplicate-photo'],
  },
  {
    employeeId: '1001',
    employeeName: 'Айгерим С.',
    locationId: 'mega',
    locationName: 'Bahandi Mega Silk Way',
    totalWriteOffs: 71_800,
    writeOffCount: 14,
    medianMultiplier: 2.3,
    flags: ['anomaly-employee', 'night-shift-pattern'],
  },
  {
    employeeId: '1005',
    employeeName: 'Мадина К.',
    locationId: 'khan-shatyr',
    locationName: 'Bahandi Хан Шатыр',
    totalWriteOffs: 29_400,
    writeOffCount: 6,
    medianMultiplier: 1.4,
    flags: [],
  },
  {
    employeeId: '1003',
    employeeName: 'Нурзат Б.',
    locationId: 'dostyk',
    locationName: 'Bahandi Достык Плаза',
    totalWriteOffs: 26_100,
    writeOffCount: 8,
    medianMultiplier: 1.3,
    flags: [],
  },
  {
    employeeId: '1004',
    employeeName: 'Санжар Е.',
    locationId: 'dostyk',
    locationName: 'Bahandi Достык Плаза',
    totalWriteOffs: 21_700,
    writeOffCount: 9,
    medianMultiplier: 1.1,
    flags: [],
  },
];

/**
 * Профили сотрудников для досье (drill-down).
 * База на «месяц»; periods.ts масштабирует. История держится: у Асана — помидор/капуста,
 * вечерняя смена, перекос на «вину сотрудника» и «поставщика»; у честных — ровный профиль.
 */
export interface EmployeeProfile {
  employeeId: string;
  /** Топ-продукты: доля % от суммы списаний сотрудника. */
  topProducts: { product: string; share: number }[];
  /** Перекос по сменам: доли % (утро/день/вечер). */
  shiftShares: { shift: string; share: number }[];
  /** Категории причин: доли % (внешнее/операционное/вина). */
  reasonShares: { category: 'external' | 'operational' | 'employee'; share: number }[];
  /** Недельная динамика суммы списаний (старое→новое). */
  weeklyTrend: number[];
  /** Доля необъяснённой недостачи точки, приписываемая сотруднику, %. */
  attributedShare: number;
}

const SHIFT_LABELS = {
  morning: 'Утренняя (07:00–15:00)',
  day: 'Дневная (10:00–18:00)',
  evening: 'Вечерняя (18:00–23:00)',
};

export const EMPLOYEE_PROFILES: EmployeeProfile[] = [
  {
    employeeId: '1002',
    topProducts: [
      { product: 'Помидор', share: 44 },
      { product: 'Капуста', share: 27 },
      { product: 'Соус', share: 18 },
      { product: 'Котлета говяжья', share: 11 },
    ],
    shiftShares: [
      { shift: SHIFT_LABELS.morning, share: 9 },
      { shift: SHIFT_LABELS.day, share: 24 },
      { shift: SHIFT_LABELS.evening, share: 67 },
    ],
    reasonShares: [
      { category: 'external', share: 38 },
      { category: 'operational', share: 14 },
      { category: 'employee', share: 48 },
    ],
    weeklyTrend: [21, 28, 34, 39, 44, 52, 61],
    attributedShare: 71,
  },
  {
    employeeId: '1001',
    topProducts: [
      { product: 'Лук', share: 38 },
      { product: 'Помидор', share: 31 },
      { product: 'Картофель фри', share: 19 },
      { product: 'Булочка', share: 12 },
    ],
    shiftShares: [
      { shift: SHIFT_LABELS.morning, share: 14 },
      { shift: SHIFT_LABELS.day, share: 30 },
      { shift: SHIFT_LABELS.evening, share: 56 },
    ],
    reasonShares: [
      { category: 'external', share: 21 },
      { category: 'operational', share: 38 },
      { category: 'employee', share: 41 },
    ],
    weeklyTrend: [12, 14, 16, 15, 19, 22, 24],
    attributedShare: 18,
  },
  {
    employeeId: '1005',
    topProducts: [
      { product: 'Булочка', share: 41 },
      { product: 'Котлета куриная', share: 33 },
      { product: 'Сыр-слайс', share: 26 },
    ],
    shiftShares: [
      { shift: SHIFT_LABELS.morning, share: 28 },
      { shift: SHIFT_LABELS.day, share: 44 },
      { shift: SHIFT_LABELS.evening, share: 28 },
    ],
    reasonShares: [
      { category: 'external', share: 12 },
      { category: 'operational', share: 55 },
      { category: 'employee', share: 33 },
    ],
    weeklyTrend: [6, 7, 5, 6, 8, 6, 7],
    attributedShare: 6,
  },
  {
    employeeId: '1003',
    topProducts: [
      { product: 'Капуста', share: 46 },
      { product: 'Лук', share: 32 },
      { product: 'Помидор', share: 22 },
    ],
    shiftShares: [
      { shift: SHIFT_LABELS.morning, share: 20 },
      { shift: SHIFT_LABELS.day, share: 52 },
      { shift: SHIFT_LABELS.evening, share: 28 },
    ],
    reasonShares: [
      { category: 'external', share: 14 },
      { category: 'operational', share: 58 },
      { category: 'employee', share: 28 },
    ],
    weeklyTrend: [5, 6, 4, 5, 6, 5, 6],
    attributedShare: 0,
  },
  {
    employeeId: '1004',
    topProducts: [
      { product: 'Картофель фри', share: 48 },
      { product: 'Котлета говяжья', share: 30 },
      { product: 'Соус', share: 22 },
    ],
    shiftShares: [
      { shift: SHIFT_LABELS.morning, share: 24 },
      { shift: SHIFT_LABELS.day, share: 48 },
      { shift: SHIFT_LABELS.evening, share: 28 },
    ],
    reasonShares: [
      { category: 'external', share: 10 },
      { category: 'operational', share: 56 },
      { category: 'employee', share: 34 },
    ],
    weeklyTrend: [4, 5, 6, 5, 5, 6, 5],
    attributedShare: 0,
  },
];

/** Весовой контур: % отхода факт vs норма. `monthlyCost` — стоимость списанного по сети, ₸/мес. */
export const PRODUCT_WASTE_STATS = [
  { product: 'Помидор', type: 'weight' as const, norm: 14, declared: 8.2, mega: 19.0, monthlyCost: 420_000 },
  { product: 'Лук', type: 'weight' as const, norm: 16, declared: 11.4, mega: 17.1, monthlyCost: 180_000 },
  { product: 'Капуста', type: 'weight' as const, norm: 20, declared: 14.8, mega: 21.3, monthlyCost: 150_000 },
  { product: 'Картофель фри', type: 'weight' as const, norm: 8, declared: 5.9, mega: 9.4, monthlyCost: 240_000 },
  { product: 'Соус', type: 'weight' as const, norm: 5, declared: 3.2, mega: 6.8, monthlyCost: 90_000 },
];

/** Штучный контур: контроль сверкой штук с продажами (не нормой отхода). */
export const UNIT_PRODUCT_STATS = [
  { product: 'Котлета говяжья', type: 'unit' as const, soldVsWrittenOff: 2.1, mega: 7.8, monthlyCost: 310_000 },
  { product: 'Котлета куриная', type: 'unit' as const, soldVsWrittenOff: 1.8, mega: 5.2, monthlyCost: 190_000 },
  { product: 'Булочка', type: 'unit' as const, soldVsWrittenOff: 2.4, mega: 4.1, monthlyCost: 95_000 },
  { product: 'Сыр-слайс', type: 'unit' as const, soldVsWrittenOff: 1.5, mega: 6.3, monthlyCost: 140_000 },
];

export const HOURLY_STATS = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const isNight = hour >= 22 || hour <= 1;
  const isPeak = hour >= 12 && hour <= 14;
  const saryarka =
    isNight ? 12_000 + (hour === 22 ? 8_000 : hour === 23 ? 6_000 : 2_000) :
    isPeak ? 4_200 : 1_800 + Math.floor(Math.sin(hour) * 600);
  const network =
    isPeak ? 3_400 : isNight ? 800 : 2_100;
  return {
    hour: `${String(i).padStart(2, '0')}:00`,
    'Mega Silk Way': saryarka,
    'Ср. по сети': network,
  };
});

export const ANOMALY_FEED = [
  {
    id: 'a1',
    time: '22:14',
    date: '26.06',
    locationName: 'Mega Silk Way',
    text: 'Дамир А. — списание помидора 22.4% при норме 14%. Превышение ×1.6.',
    type: 'theft' as const,
  },
  {
    id: 'a2',
    time: '22:47',
    date: '25.06',
    locationName: 'Mega Silk Way',
    text: 'Дубликат фото в заявках req-001 и req-002. Идентичный снимок.',
    type: 'theft' as const,
  },
  {
    id: 'a3',
    time: '23:02',
    date: '24.06',
    locationName: 'Mega Silk Way',
    text: 'Ночной всплеск списаний: 6 заявок в окне 22:00–23:00.',
    type: 'theft' as const,
  },
  {
    id: 'a4',
    time: '09:15',
    date: '27.06',
    locationName: 'Mega Silk Way',
    text: 'Брак поставщика по помидорам: 19% vs 3% по сети в этом месяце.',
    type: 'theft' as const,
  },
  {
    id: 'a5',
    time: '13:22',
    date: '27.06',
    locationName: 'Достык Плаза',
    text: 'Списание котлет — причина: пережог на гриле. В норме.',
    type: 'ok' as const,
  },
  {
    id: 'a6',
    time: '08:30',
    date: '27.06',
    locationName: 'Хан Шатыр',
    text: 'Недовоз булочек 8 шт — подтверждён с накладной.',
    type: 'ok' as const,
  },
];
