import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiError } from '../src/shared/api/client';

interface FakeResponseInit {
  ok?: boolean;
  status?: number;
}

function jsonResponse(body: unknown, init: FakeResponseInit = {}): Response {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear();
    apiClient.setToken(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unwraps the success envelope and returns data', async () => {
    const products = [{ id: 'p1', name: 'Помидор', unit: 'граммы', cost_per_unit: 1.2, iiko_product_id: null }];
    const fetchMock = vi.fn(async (_url?: unknown, _init?: unknown) => jsonResponse({ success: true, data: products }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiClient.listProducts();

    expect(result).toEqual(products);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/products');
  });

  it('throws ApiError carrying the error code and status on a failure envelope', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ success: false, error: 'invalid_pin' }, { ok: false, status: 401 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.login('0000')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'invalid_pin',
      status: 401,
    });
    await expect(apiClient.login('0000')).rejects.toBeInstanceOf(ApiError);
  });

  it('attaches the bearer header once a token is set', async () => {
    const fetchMock = vi.fn(async (_url?: unknown, _init?: unknown) => jsonResponse({ success: true, data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    apiClient.setToken('tok-123');
    await apiClient.listProducts();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-123');
  });

  it('omits the bearer header when no token is set', async () => {
    const fetchMock = vi.fn(async (_url?: unknown, _init?: unknown) => jsonResponse({ success: true, data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.listProducts();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});
