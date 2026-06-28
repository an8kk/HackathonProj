import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { EmployeesTab } from '../src/pages/admin/tabs';
import { renderWithProviders } from './test-utils';

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const outlet = { id: 'o1', name: 'Достык', address: 'ул. Достык 1', iiko_store_id: null };
const employee = {
  id: 'e1',
  name: 'Асан',
  role: 'sender',
  active: true,
  outlet,
  outlet_id: 'o1',
};

function routedFetch(url: string, init?: RequestInit): Response {
  // PATCH /admin/employees/{id} — echo back the merged employee.
  if (url.includes('/admin/employees/')) {
    const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {};
    return jsonResponse({ success: true, data: { ...employee, ...body } });
  }
  if (url.includes('/outlets')) return jsonResponse({ success: true, data: [outlet] });
  if (url.includes('/employees')) return jsonResponse({ success: true, data: [employee] });
  return jsonResponse({ success: true, data: [] });
}

describe('EmployeesTab — management', () => {
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

  it('lists employees with name, role and outlet', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: unknown) => routedFetch(String(url), init as RequestInit)));

    renderWithProviders(<EmployeesTab />);

    await waitFor(() => {
      expect(screen.getByText('Асан')).toBeInTheDocument();
    });
    expect(screen.getByText('активен')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Изменить/i })).toBeInTheDocument();
  });

  it('edits a name via PATCH /admin/employees/{id}', async () => {
    const fetchMock = vi.fn(async (url: unknown, init?: unknown) => routedFetch(String(url), init as RequestInit));
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<EmployeesTab />);

    await waitFor(() => {
      expect(screen.getByText('Асан')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Изменить/i }));
    fireEvent.change(screen.getByDisplayValue('Асан'), { target: { value: 'Асан Обновлён' } });
    fireEvent.click(screen.getByRole('button', { name: /Сохранить/i }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(call => String(call[0]).includes('/admin/employees/e1'));
      expect(patchCall).toBeDefined();
      const reqInit = patchCall?.[1] as RequestInit;
      expect(reqInit.method).toBe('PATCH');
      expect(JSON.parse(reqInit.body as string)).toEqual({ name: 'Асан Обновлён' });
    });
  });

  it('deactivates an employee with PATCH { active: false }', async () => {
    const fetchMock = vi.fn(async (url: unknown, init?: unknown) => routedFetch(String(url), init as RequestInit));
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<EmployeesTab />);

    await waitFor(() => {
      expect(screen.getByText('Асан')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Отключить/i }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(call => String(call[0]).includes('/admin/employees/e1'));
      expect(patchCall).toBeDefined();
      const reqInit = patchCall?.[1] as RequestInit;
      expect(reqInit.method).toBe('PATCH');
      expect(JSON.parse(reqInit.body as string)).toEqual({ active: false });
    });
  });
});
