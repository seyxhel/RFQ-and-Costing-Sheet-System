import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';

export type Role = 'MANAGEMENT' | 'SALES' | 'PURCHASING';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  department: string;
  phone: string;
  is_active: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isManagement: () => boolean;
  canApprove: () => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: check if session is still valid
  useEffect(() => {
    api.get('/accounts/me/')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post('/accounts/login/', { username, password });
    setUser(res.data);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/accounts/logout/'); } catch {}
    setUser(null);
    window.location.href = '/login';
  }, []);

  const isManagement = useCallback(() => user?.role === 'MANAGEMENT' || (user as any)?.is_superuser === true, [user]);
  const canApprove = useCallback(() => user?.role === 'MANAGEMENT', [user]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/accounts/me/');
      setUser(res.data);
    } catch {
      // keep existing user data on failure
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isManagement, canApprove, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
