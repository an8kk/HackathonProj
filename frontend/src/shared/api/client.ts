import { buildApiUrl } from './http-client';
import type {
  AnalyticsEmployeeDto,
  AnalyticsHourlyDto,
  AnalyticsInvestigationDto,
  AnalyticsOutletDto,
  AnalyticsProductDto,
  AnalyticsSummaryDto,
  CreateEmployeeBody,
  CreateNormBody,
  CreateOutletBody,
  CreatePhotoBody,
  CreateProductBody,
  CreateWriteOffBody,
  EmployeeDto,
  IikoStatusDto,
  ListNormsParams,
  ListWriteOffsParams,
  LoginResponse,
  NormDto,
  OutletDto,
  PhotoDto,
  ProductDto,
  ReconciliationParams,
  ReconciliationRowDto,
  ReviewWriteOffBody,
  UpdateEmployeeBody,
  WriteOffDto,
} from './types';

const TOKEN_STORAGE_KEY = 'qamqor_token';

/** Error thrown for any non-2xx response. Carries the backend `error` code + HTTP status. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** Successful envelope shape from the backend. */
interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

/** Either the documented error envelope or a Litestar validation payload. */
interface ErrorEnvelope {
  success?: false;
  error?: string;
  detail?: string;
  message?: string;
}

let cachedToken: string | null = null;

function readStoredToken(): string | null {
  if (cachedToken !== null) return cachedToken;
  try {
    cachedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export function setToken(token: string | null): void {
  cachedToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage unavailable (e.g. SSR / private mode) — keep the in-memory copy.
  }
}

export function getToken(): string | null {
  return readStoredToken();
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.append(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readStoredToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body !== undefined && !('Content-Type' in headers)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(buildApiUrl(path), { ...init, headers });

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const err = (payload ?? {}) as ErrorEnvelope;
    const code = err.error ?? err.detail ?? err.message ?? `http_${response.status}`;
    throw new ApiError(code, response.status);
  }

  const envelope = payload as SuccessEnvelope<T> | null;
  if (envelope && envelope.success === true) return envelope.data;

  // 2xx without the documented envelope — surface as a protocol error.
  throw new ApiError('malformed_response', response.status);
}

export const apiClient = {
  setToken,
  getToken,

  login(pin: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },

  listProducts(): Promise<ProductDto[]> {
    return request<ProductDto[]>('/products');
  },

  listOutlets(): Promise<OutletDto[]> {
    return request<OutletDto[]>('/outlets');
  },

  listEmployees(outletId?: string): Promise<EmployeeDto[]> {
    return request<EmployeeDto[]>(`/employees${buildQuery({ outlet_id: outletId })}`);
  },

  listNorms(params: ListNormsParams = {}): Promise<NormDto[]> {
    return request<NormDto[]>(
      `/norms${buildQuery({ outlet_id: params.outlet_id, product_id: params.product_id })}`,
    );
  },

  getPhoto(id: string): Promise<PhotoDto> {
    return request<PhotoDto>(`/photos/${encodeURIComponent(id)}`);
  },

  uploadPhoto(outletId: string, body: CreatePhotoBody): Promise<PhotoDto> {
    return request<PhotoDto>(`/photos${buildQuery({ outlet_id: outletId })}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  createWriteOff(body: CreateWriteOffBody): Promise<WriteOffDto> {
    return request<WriteOffDto>('/write-offs', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  listWriteOffs(params: ListWriteOffsParams = {}): Promise<WriteOffDto[]> {
    return request<WriteOffDto[]>(
      `/write-offs${buildQuery({ status: params.status, employee_id: params.employee_id })}`,
    );
  },

  /** Full write-off list (no filter) for client-side aggregation. */
  listAllWriteOffs(): Promise<WriteOffDto[]> {
    return request<WriteOffDto[]>('/write-offs');
  },

  getWriteOff(id: string): Promise<WriteOffDto> {
    return request<WriteOffDto>(`/write-offs/${encodeURIComponent(id)}`);
  },

  reviewWriteOff(id: string, body: ReviewWriteOffBody): Promise<WriteOffDto> {
    return request<WriteOffDto>(`/write-offs/${encodeURIComponent(id)}/review`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  analyticsSummary(): Promise<AnalyticsSummaryDto> {
    return request<AnalyticsSummaryDto>('/analytics/summary');
  },

  analyticsOutlets(): Promise<AnalyticsOutletDto[]> {
    return request<AnalyticsOutletDto[]>('/analytics/outlets');
  },

  analyticsEmployees(): Promise<AnalyticsEmployeeDto[]> {
    return request<AnalyticsEmployeeDto[]>('/analytics/employees');
  },

  analyticsProducts(): Promise<AnalyticsProductDto[]> {
    return request<AnalyticsProductDto[]>('/analytics/products');
  },

  analyticsHourly(): Promise<AnalyticsHourlyDto[]> {
    return request<AnalyticsHourlyDto[]>('/analytics/hourly');
  },

  analyticsInvestigations(): Promise<AnalyticsInvestigationDto[]> {
    return request<AnalyticsInvestigationDto[]>('/analytics/investigations');
  },

  inventoryReconciliation(params: ReconciliationParams = {}): Promise<ReconciliationRowDto[]> {
    return request<ReconciliationRowDto[]>(
      `/inventory/reconciliation${buildQuery({ outlet_id: params.outlet_id })}`,
    );
  },

  iikoStatus(): Promise<IikoStatusDto> {
    return request<IikoStatusDto>('/integrations/iiko/status');
  },

  createProduct(body: CreateProductBody): Promise<ProductDto> {
    return request<ProductDto>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  createNorm(body: CreateNormBody): Promise<NormDto> {
    return request<NormDto>('/admin/norms', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  createOutlet(body: CreateOutletBody): Promise<OutletDto> {
    return request<OutletDto>('/admin/outlets', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  createEmployee(body: CreateEmployeeBody): Promise<EmployeeDto> {
    return request<EmployeeDto>('/admin/employees', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  updateEmployee(id: string, body: UpdateEmployeeBody): Promise<EmployeeDto> {
    return request<EmployeeDto>(`/admin/employees/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
};
