// TanStack Query hook layer over `apiClient`. All server reads/writes flow through here.
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  AnalyticsOutletDto,
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
  LoginResponse,
  NormDto,
  OutletDto,
  PhotoDto,
  ProductDto,
  ReviewWriteOffBody,
  UpdateEmployeeBody,
  WriteOffDto,
} from './types';

/** Stable query keys — referenced by both queries and mutation invalidations. */
export const queryKeys = {
  products: ['products'] as const,
  outlets: ['outlets'] as const,
  employees: (outletId?: string) => ['employees', outletId ?? null] as const,
  norms: (params: ListNormsParams) =>
    ['norms', params.outlet_id ?? null, params.product_id ?? null] as const,
  pendingWriteOffs: ['write-offs', 'pending'] as const,
  allWriteOffs: ['write-offs', 'all'] as const,
  writeOffsByEmployee: (employeeId: string) => ['write-offs', 'employee', employeeId] as const,
  writeOff: (id: string) => ['write-offs', id] as const,
  photo: (id: string) => ['photo', id] as const,
  analyticsSummary: ['analytics', 'summary'] as const,
  analyticsOutlets: ['analytics', 'outlets'] as const,
  iikoStatus: ['integrations', 'iiko'] as const,
};

// --- Queries -----------------------------------------------------------------

export function useProducts(): UseQueryResult<ProductDto[]> {
  return useQuery({ queryKey: queryKeys.products, queryFn: () => apiClient.listProducts() });
}

export function useOutlets(): UseQueryResult<OutletDto[]> {
  return useQuery({ queryKey: queryKeys.outlets, queryFn: () => apiClient.listOutlets() });
}

export function useEmployees(outletId?: string): UseQueryResult<EmployeeDto[]> {
  return useQuery({
    queryKey: queryKeys.employees(outletId),
    queryFn: () => apiClient.listEmployees(outletId),
  });
}

export function useNorms(params: ListNormsParams = {}): UseQueryResult<NormDto[]> {
  return useQuery({
    queryKey: queryKeys.norms(params),
    queryFn: () => apiClient.listNorms(params),
  });
}

export function usePendingWriteOffs(): UseQueryResult<WriteOffDto[]> {
  return useQuery({
    queryKey: queryKeys.pendingWriteOffs,
    queryFn: () => apiClient.listWriteOffs({ status: 'pending' }),
  });
}

export function useAllWriteOffs(): UseQueryResult<WriteOffDto[]> {
  return useQuery({
    queryKey: queryKeys.allWriteOffs,
    queryFn: () => apiClient.listAllWriteOffs(),
  });
}

export function useEmployeeWriteOffs(
  employeeId: string | null | undefined,
): UseQueryResult<WriteOffDto[]> {
  return useQuery({
    queryKey: queryKeys.writeOffsByEmployee(employeeId ?? ''),
    queryFn: () => apiClient.listWriteOffs({ employee_id: employeeId as string }),
    enabled: Boolean(employeeId),
  });
}

export function useWriteOff(id: string | null | undefined): UseQueryResult<WriteOffDto> {
  return useQuery({
    queryKey: queryKeys.writeOff(id ?? ''),
    queryFn: () => apiClient.getWriteOff(id as string),
    enabled: Boolean(id),
  });
}

export function usePhoto(id: string | null | undefined): UseQueryResult<PhotoDto> {
  return useQuery({
    queryKey: queryKeys.photo(id ?? ''),
    queryFn: () => apiClient.getPhoto(id as string),
    enabled: Boolean(id),
  });
}

export function useAnalyticsSummary(): UseQueryResult<AnalyticsSummaryDto> {
  return useQuery({
    queryKey: queryKeys.analyticsSummary,
    queryFn: () => apiClient.analyticsSummary(),
  });
}

export function useAnalyticsOutlets(): UseQueryResult<AnalyticsOutletDto[]> {
  return useQuery({
    queryKey: queryKeys.analyticsOutlets,
    queryFn: () => apiClient.analyticsOutlets(),
  });
}

export function useIikoStatus(): UseQueryResult<IikoStatusDto> {
  return useQuery({ queryKey: queryKeys.iikoStatus, queryFn: () => apiClient.iikoStatus() });
}

// --- Mutations ---------------------------------------------------------------

export function useLogin(): UseMutationResult<LoginResponse, Error, string> {
  return useMutation({ mutationFn: (pin: string) => apiClient.login(pin) });
}

export function useUploadPhoto(): UseMutationResult<
  PhotoDto,
  Error,
  { outletId: string; body: CreatePhotoBody }
> {
  return useMutation({
    mutationFn: ({ outletId, body }: { outletId: string; body: CreatePhotoBody }) =>
      apiClient.uploadPhoto(outletId, body),
  });
}

export function useCreateWriteOff(): UseMutationResult<WriteOffDto, Error, CreateWriteOffBody> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWriteOffBody) => apiClient.createWriteOff(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['write-offs'] });
      void qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useReviewWriteOff(): UseMutationResult<
  WriteOffDto,
  Error,
  { id: string; body: ReviewWriteOffBody }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReviewWriteOffBody }) =>
      apiClient.reviewWriteOff(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['write-offs'] });
      void qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useCreateProduct(): UseMutationResult<ProductDto, Error, CreateProductBody> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductBody) => apiClient.createProduct(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.products });
    },
  });
}

export function useCreateNorm(): UseMutationResult<NormDto, Error, CreateNormBody> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateNormBody) => apiClient.createNorm(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['norms'] });
    },
  });
}

export function useCreateOutlet(): UseMutationResult<OutletDto, Error, CreateOutletBody> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOutletBody) => apiClient.createOutlet(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.outlets });
    },
  });
}

export function useCreateEmployee(): UseMutationResult<EmployeeDto, Error, CreateEmployeeBody> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEmployeeBody) => apiClient.createEmployee(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee(): UseMutationResult<
  EmployeeDto,
  Error,
  { id: string; body: UpdateEmployeeBody }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateEmployeeBody }) =>
      apiClient.updateEmployee(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
