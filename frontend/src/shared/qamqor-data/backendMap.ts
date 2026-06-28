// Pure mappings between the backend HTTP DTOs and the dashboard data shapes.
// Centralised so both `HttpDataSource` and the employee page agree on labels.
import type {
  EmployeeDto,
  OutletDto,
  ProductDto,
  ReasonCode,
  WriteOffDto,
} from 'shared/api/types';
import type { ReasonCategory, WriteOffRequest } from './types';

/** Human label for each backend reason code (RU). */
export const REASON_LABELS: Record<ReasonCode, string> = {
  DAMAGED: 'Брак / повреждение',
  EXPIRED: 'Истёк срок годности',
  OVERCOOKED: 'Пережарил / испортил',
  RAW_WASTE: 'Обрезка / сырьё',
  DROPPED: 'Упал / разбился',
  OTHER: 'Прочее',
};

/**
 * reason_code → этап производственного цикла.
 * Маппинг (детерминированный, документированный):
 *   RAW_WASTE          → raw     (сырьё/обрезка на подготовке)
 *   EXPIRED, DAMAGED   → storage (порча на хранении/приёмке)
 *   OVERCOOKED, DROPPED→ ready   (готовая продукция / выдача)
 *   OTHER              → other
 */
export const STAGE_BY_REASON: Record<ReasonCode, { code: string; label: string }> = {
  RAW_WASTE: { code: 'raw', label: 'Сырьё / подготовка' },
  EXPIRED: { code: 'storage', label: 'Хранение' },
  DAMAGED: { code: 'storage', label: 'Хранение' },
  OVERCOOKED: { code: 'ready', label: 'Готовая продукция' },
  DROPPED: { code: 'ready', label: 'Готовая продукция' },
  OTHER: { code: 'other', label: 'Прочее' },
};

/** Порядок и метки этапов для стабильной сортировки разбивки. */
export const STAGE_ORDER = ['raw', 'storage', 'ready', 'other'] as const;
export const STAGE_META: Record<string, string> = {
  raw: 'Сырьё / подготовка',
  storage: 'Хранение',
  ready: 'Готовая продукция',
  other: 'Прочее',
};

/**
 * reason_code → категория ответственности.
 * Маппинг:
 *   DAMAGED, EXPIRED   → external    (поставщик / хранение вне зоны сотрудника)
 *   RAW_WASTE, OTHER   → operational (операционный брак на кухне)
 *   OVERCOOKED, DROPPED→ employee    (прямая вина сотрудника)
 */
export const CATEGORY_BY_REASON: Record<ReasonCode, ReasonCategory['category']> = {
  DAMAGED: 'external',
  EXPIRED: 'external',
  RAW_WASTE: 'operational',
  OTHER: 'operational',
  OVERCOOKED: 'employee',
  DROPPED: 'employee',
};

export const REASON_CATEGORY_LABELS: Record<ReasonCategory['category'], string> = {
  external: 'Поставщик / приёмка',
  operational: 'Операционный брак',
  employee: 'Вина сотрудника',
};

/** Метки смен — общие с разбивкой по часам. */
export const SHIFT_LABELS = {
  morning: 'Утренняя (07:00–15:00)',
  day: 'Дневная (10:00–18:00)',
  evening: 'Вечерняя (18:00–23:00)',
} as const;

/** Час → смена (та же логика, что и в hourly→shift свёртке). */
export function shiftFromHour(hour: number): string {
  if (hour >= 18 || hour <= 1) return SHIFT_LABELS.evening;
  if (hour >= 10 && hour < 18) return SHIFT_LABELS.day;
  return SHIFT_LABELS.morning;
}

/** Справочники по id для маппинга записей. */
export interface RefMaps {
  outletsById: Map<string, OutletDto>;
  employeesById: Map<string, EmployeeDto>;
  productsById: Map<string, ProductDto>;
}

export function buildRefMaps(
  outlets: OutletDto[],
  employees: EmployeeDto[],
  products: ProductDto[],
): RefMaps {
  return {
    outletsById: new Map(outlets.map((o) => [o.id, o])),
    employeesById: new Map(employees.map((e) => [e.id, e])),
    productsById: new Map(products.map((p) => [p.id, p])),
  };
}

/** Стоимость списания в ₸ по реальной цене продукта. */
export function writeOffCost(dto: WriteOffDto, refs: RefMaps): number {
  const product = refs.productsById.get(dto.product_id);
  return dto.quantity * (product?.cost_per_unit ?? 0);
}

/** Маппинг бэкенд-записи списания в форму дашборда `WriteOffRequest`. */
export function toWriteOffRequest(dto: WriteOffDto, refs: RefMaps): WriteOffRequest {
  const product = refs.productsById.get(dto.product_id);
  const outlet = refs.outletsById.get(dto.outlet_id);
  const employee = refs.employeesById.get(dto.employee_id);
  const stage = STAGE_BY_REASON[dto.reason_code];
  const hour = new Date(dto.created_at).getHours();

  return {
    id: dto.id,
    employeeId: dto.employee_id,
    employeeName: employee?.name ?? dto.employee_id,
    locationId: dto.outlet_id,
    locationName: outlet?.name ?? dto.outlet_id,
    productId: dto.product_id,
    productName: product?.name ?? dto.product_id,
    productType: (product?.unit ?? dto.unit) === 'штуки' ? 'unit' : 'weight',
    quantity: dto.quantity,
    reasonCode: dto.reason_code,
    reasonLabel: REASON_LABELS[dto.reason_code],
    stageCode: stage.code,
    stageLabel: stage.label,
    comment: dto.comment,
    photoId: dto.photo_id ?? '',
    shift: shiftFromHour(hour),
    timestamp: dto.created_at,
    status: dto.status,
    writeOffType: dto.deduction_type === 'WITH_DEDUCTION' ? 'with_deduction' : 'no_deduction',
    aiSuggestedType: false,
    flags: [],
    rejectionReason: dto.rejection_reason ?? undefined,
  };
}
