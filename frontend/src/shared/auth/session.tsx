import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { apiClient } from 'shared/api/client';
import type { LoginResponse, UserDto } from 'shared/api/types';

interface AuthContextValue {
  user: UserDto | null;
  token: string | null;
  login: (pin: string) => Promise<LoginResponse>;
  logout: () => void;
}

const USER_STORAGE_KEY = 'qamqor_user';

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): UserDto | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserDto) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => apiClient.getToken());
  const [user, setUser] = useState<UserDto | null>(loadStoredUser);

  const login = useCallback(async (pin: string): Promise<LoginResponse> => {
    const result = await apiClient.login(pin);
    const { token: nextToken, ...nextUser } = result;
    apiClient.setToken(nextToken);
    setTokenState(nextToken);
    setUser(nextUser);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    } catch {
      // localStorage unavailable — keep the in-memory user.
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    apiClient.setToken(null);
    setTokenState(null);
    setUser(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, login, logout }),
    [user, token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
