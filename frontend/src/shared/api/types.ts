// DTOs mirroring the backend HTTP contract (docs/API_CONTRACT.md).
// Field names match the JSON wire format exactly (snake_case).

export type Role = 'sender' | 'reviewer' | 'owner';

export interface OutletDto {
  id: string;
  name: string;
  address: string;
  iiko_store_id: string | null;
}

export interface UserDto {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  outlet: OutletDto | null;
  outlet_id: string | null;
}

export interface LoginResponse extends UserDto {
  token: string;
}

export interface EmployeeDto {
  id: string;
  name: string;
  role: string;
  active: boolean;
  outlet: OutletDto | null;
  outlet_id: string | null;
}

export interface ProductDto {
  id: string;
  name: string;
  /** `штуки` | `граммы` | `кг` */
  unit: string;
  cost_per_unit: number;
  iiko_product_id: string | null;
}

export type PhotoMetadataStatus = 'valid' | 'warning' | 'invalid';

/** AI verdict attached to a photo. All fields optional — the backend default is `{}`. */
export interface PhotoAiAnalysis {
  is_food_waste?: boolean | null;
  detected_product?: string | null;
  confidence?: number;
  condition?: string | null;
  suggested_reason?: ReasonCode | null;
  fraud_warnings?: string[];
  reviewer_note?: string | null;
  status?: string;
}

export interface PhotoDto {
  id: string;
  filename: string;
  storage_key: string;
  content_type: string;
  sha256_hash: string;
  perceptual_hash: string | null;
  taken_at: string | null;
  uploaded_at: string;
  metadata_status: PhotoMetadataStatus;
  validation_errors: string[];
  ai_analysis: PhotoAiAnalysis;
}

export type ReasonCode = 'DAMAGED' | 'EXPIRED' | 'OVERCOOKED' | 'RAW_WASTE' | 'DROPPED' | 'OTHER';
export type DeductionType = 'NO_DEDUCTION' | 'WITH_DEDUCTION';
export type WriteOffStatus = 'pending' | 'approved' | 'rejected';
export type ReviewDecision = 'approved' | 'rejected';
export type IikoSyncStatus = 'synced' | 'failed' | 'not_configured' | 'capability_missing' | 'pending';

export interface IikoSyncDto {
  status: IikoSyncStatus;
  external_id: string | null;
  error: string | null;
}

export interface WriteOffDto {
  id: string;
  outlet_id: string;
  employee_id: string;
  product_id: string;
  photo_id: string | null;
  quantity: number;
  unit: string;
  reason_code: ReasonCode;
  deduction_type: DeductionType;
  charged_employee_id: string | null;
  comment: string;
  status: WriteOffStatus;
  reviewer_id: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  iiko_sync: IikoSyncDto;
}

export interface CreatePhotoBody {
  filename: string;
  /** base64 payload without the `data:...;base64,` prefix */
  content_base64: string;
  content_type: string;
  taken_at?: string;
}

export interface CreateWriteOffBody {
  outlet_id: string;
  employee_id: string;
  product_id: string;
  photo_id?: string;
  quantity: number;
  unit: string;
  reason_code: ReasonCode;
  deduction_type: DeductionType;
  charged_employee_id?: string;
  comment: string;
}

export interface ReviewWriteOffBody {
  reviewer_id: string;
  decision: ReviewDecision;
  rejection_reason?: string;
}

export interface ListWriteOffsParams {
  status?: WriteOffStatus;
  employee_id?: string;
}

export interface AnalyticsSummaryDto {
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  approved_cost_value: number;
}

export interface IikoWebStatusDto {
  provider: string;
  configured: boolean;
  base_url: string | null;
  supported_endpoints: string[];
  write_off_act_endpoint_available: boolean;
}

export interface IikoServerStatusDto {
  provider: string;
  configured: boolean;
  base_url: string | null;
  write_off_act_endpoint: string;
  write_off_act_endpoint_available: boolean;
}

export interface IikoStatusDto {
  iiko_web: IikoWebStatusDto;
  iiko_server: IikoServerStatusDto;
  note: string;
}

export interface NormDto {
  id: string;
  product_id: string;
  outlet_id: string | null;
  max_waste_pct: number;
  effective_from: string | null;
  effective_to: string | null;
}

export interface ListNormsParams {
  outlet_id?: string;
  product_id?: string;
}

export interface CreateProductBody {
  name: string;
  unit: string;
  cost_per_unit: number;
  norm_waste_pct?: number;
  iiko_product_id?: string | null;
}

export interface CreateNormBody {
  product_id: string;
  outlet_id?: string | null;
  max_waste_pct: number;
  effective_from?: string;
}

export interface CreateOutletBody {
  name: string;
  address?: string;
  iiko_store_id?: string | null;
}

export interface CreateEmployeeBody {
  outlet_id: string;
  name: string;
  role: string;
  pin: string;
}
