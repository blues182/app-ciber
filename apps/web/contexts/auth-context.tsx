'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch } from '../lib/api';

interface AuthUser {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AuthCtx {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (saved && savedUser) {
      setToken(saved);
      setUser(JSON.parse(savedUser) as AuthUser);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ accessToken: string; user: AuthUser }>(
      '/auth/login',
      { method: 'POST', body: { email, password } },
    );
    setToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem('auth_token', data.accessToken);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }, []);

  const hasPermission = useCallback(
    (perm: string) => user?.permissions.includes(perm) ?? false,
    [user],
  );

  const value = useMemo(
    () => ({ token, user, login, logout, hasPermission }),
    [token, user, login, logout, hasPermission],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
