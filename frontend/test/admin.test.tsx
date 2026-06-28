import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import AdminPanel from '../src/pages/admin';
import { renderWithProviders } from './test-utils';

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const product = { id: 'p1', name: 'Помидор', unit: 'граммы', cost_per_unit: 1.2, iiko_product_id: null };
const created = { id: 'p2', name: 'Огурец', unit: 'кг', cost_per_unit: 2, iiko_product_id: null };

function routedFetch(url: string, _init?: RequestInit): Response {
  if (url.includes('/admin/products')) return jsonResponse({ success: true, data: created });
  if (url.includes('/products')) return jsonResponse({ success: true, data: [product] });
  return jsonResponse({ success: true, data: [] });
}

describe('AdminPanel — Products tab', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('qamqor_token', 'jwt-owner');
    localStorage.setItem(
      'qamqor_user',
      JSON.stringify({ id: 'own-1', name: 'Владелец', role: 'owner', active: true, outlet: null, outlet_id: null }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists products and creates one via POST /admin/products', async () => {
    const fetchMock = vi.fn(async (url: unknown, init?: unknown) =>
      routedFetch(String(url), init as RequestInit),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<AdminPanel />, { route: '/admin' });

    await waitFor(() => {
      expect(screen.getByText('Помидор')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Название'), { target: { value: 'Огурец' } });
    fireEvent.click(screen.getByRole('button', { name: /Добавить продукт/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(call => String(call[0]).includes('/admin/products'));
      expect(postCall).toBeDefined();
      const init = postCall?.[1] as RequestInit;
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({ name: 'Огурец', unit: 'штуки' });
    });
  });

  it('redirects a non-owner away from /admin', () => {
    localStorage.setItem(
      'qamqor_user',
      JSON.stringify({ id: 'rev-1', name: 'Проверяющий', role: 'reviewer', active: true, outlet: null, outlet_id: null }),
    );
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true, data: [] })));

    renderWithProviders(<AdminPanel />, { route: '/admin' });

    expect(screen.queryByText('Панель владельца')).not.toBeInTheDocument();
  });
});
