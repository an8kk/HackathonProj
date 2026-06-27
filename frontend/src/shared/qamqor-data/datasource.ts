import type {
  Period, NetworkKpis, LocationStats, LocationDetail,
  EmployeeStats, EmployeeDetail, ProductWaste, ProductDetail,
  HourlyPoint, Anomaly, WriteOffRequest,
} from './types';

/**
 * Контракт слоя данных дашборда.
 *
 * UI работает ТОЛЬКО через этот интерфейс и не знает, откуда берутся цифры.
 * Сейчас его реализует `MockDataSource` (seed + живой Context). Чтобы подключить
 * реальный бэкенд в будущем — достаточно написать `HttpDataSource implements
 * DashboardDataSource` и поменять одну строку в `DashboardProvider`. UI не меняется.
 *
 * Все методы асинхронные (Promise) намеренно — мок имитирует сетевую задержку,
 * поэтому переход на fetch/axios не потребует правок в компонентах.
 */
export interface DashboardDataSource {
  /** Верхние KPI сети с трендами относительно прошлого периода. */
  getNetworkKpis(period: Period): Promise<NetworkKpis>;

  /** Список всех точек со статистикой за период. */
  getLocations(period: Period): Promise<LocationStats[]>;

  /** Полная детализация одной точки (drill-down). */
  getLocationDetail(period: Period, locationId: string): Promise<LocationDetail>;

  /** Статистика по сотрудникам (по всей сети или по точке). */
  getEmployeeStats(period: Period, locationId?: string): Promise<EmployeeStats[]>;

  /** Полное досье одного сотрудника (drill-down). */
  getEmployeeDetail(period: Period, employeeId: string): Promise<EmployeeDetail>;

  /** Списания vs норма отхода по продуктам. */
  getProductWaste(period: Period): Promise<ProductWaste[]>;

  /** Детализация по продуктам для раздела «Продукты». */
  getProductDetails(period: Period): Promise<ProductDetail[]>;

  /** Почасовые списания (по сети или по конкретной точке). */
  getHourly(period: Period, locationId?: string): Promise<HourlyPoint[]>;

  /** Лента автоматических флагов/аномалий. */
  getAnomalies(period: Period): Promise<Anomaly[]>;
}

/**
 * Живые данные, которые источник получает извне (из AppContext), а не из seed.
 * Это «гибридный» шов: статика истории — из seed, актуальные заявки — из стора.
 * Реальный бэкенд просто проигнорирует этот аргумент.
 */
export interface LiveData {
  requests: WriteOffRequest[];
  pendingCount: number;
}
