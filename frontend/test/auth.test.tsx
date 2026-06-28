import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/shared/auth/session';

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function Harness() {
  const { user, login } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.name : 'anon'}</span>
      <button onClick={() => { void login('2222'); }}>login</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the logged-in user and persists the token after login', async () => {
    const loginPayload = {
      id: 'emp-2',
      name: 'Дамир Ахметов',
      role: 'reviewer',
      active: true,
      outlet: { id: 'mega', name: 'Mega Silk Way', address: '', iiko_store_id: null },
      outlet_id: 'mega',
      token: 'jwt-token-abc',
    };
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true, data: loginPayload })));

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    expect(screen.getByTestId('user').textContent).toBe('anon');

    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('Дамир Ахметов');
    });
    expect(localStorage.getItem('qamqor_token')).toBe('jwt-token-abc');
  });
});
