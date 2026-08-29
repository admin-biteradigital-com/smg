import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'supervisor' | 'vendedor' | 'chofer' | 'cliente' | 'agente_ia'>;
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-surface-900 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-white/50 animate-pulse">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return (
      <div className="min-h-dvh bg-surface-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-danger-500/10 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-danger-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Acceso Denegado</h1>
        <p className="text-sm text-white/50 max-w-xs mb-6">
          Tu cuenta con rol <span className="font-semibold text-brand-400">{user.rol}</span> no tiene permisos para acceder a esta sección.
        </p>
        <button
          onClick={() => { window.location.href = '/'; }}
          className="btn-primary px-6"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
