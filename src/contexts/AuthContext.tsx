import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, registerUnauthorizedCallback } from '@/lib/api';

export interface AuthUser {
  userId: number;
  email: string;
  rol: 'admin' | 'supervisor' | 'vendedor' | 'chofer' | 'cliente' | 'agente_ia';
  activo: boolean;
  id_cliente: number | null;
  betterAuthUserId: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const response = await api.get<{ data: AuthUser; meta: unknown }>('/api/v1/auth/me');
      const userData = response?.data;
      if (userData && userData.activo) {
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Hidratar sesión al montar
    fetchMe();

    // Redirigir a /login solo ante 401 en /api/v1/auth/me.
    // IMPORTANTE: No disparar logout por 401 en catalog/sync/clients —
    // esos pueden fallar por razones ajenas a la sesión y no deben
    // pisar una sesión válida que aún está siendo hidratada.
    registerUnauthorizedCallback((path: string) => {
      if (!path.includes('/api/v1/auth/me')) return;
      setUser(null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    });
  }, []);

  const logout = async () => {
    try {
      await api.post('/api/v1/auth/sign-out', {});
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
