import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Users, Package, RefreshCw, LogOut } from 'lucide-react';
import { SyncIndicator } from '@/components/offline/SyncIndicator';
import { onSyncStatusChange, getCurrentSyncStatus } from '@/lib/sync';
import { useAuth } from '@/contexts/AuthContext';
import type { SyncStatus } from '@/types';

export default function AppShell() {
  const { user, logout } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getCurrentSyncStatus);
  const [pendingCount, setPendingCount] = useState(0);

  // Escuchar el estado de sincronización global
  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status, pending) => {
      setSyncStatus(status);
      setPendingCount(pending);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-dvh bg-zinc-950 text-white flex flex-col pb-[calc(56px+env(safe-area-inset-bottom))]">
      {/* Header Fijo */}
      <header className="sticky top-0 z-40 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100">SIGLO</h1>
            <p className="text-[10px] text-zinc-400 capitalize">Rol: {user?.rol}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SyncIndicator status={syncStatus} pendingCount={pendingCount} />
          
          <button
            onClick={logout}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 rounded-xl transition-all"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        <Outlet />
      </main>

      {/* Bottom Nav Bar Fija (Mobile-First) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-850 px-4 pt-2 pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 w-16 text-[10px] font-medium transition-all ${
                isActive ? 'text-brand-400 scale-105' : 'text-zinc-500 hover:text-zinc-350'
              }`
            }
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>Inicio</span>
          </NavLink>

          <NavLink
            to="/clientes"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 w-16 text-[10px] font-medium transition-all ${
                isActive ? 'text-brand-400 scale-105' : 'text-zinc-500 hover:text-zinc-350'
              }`
            }
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Clientes</span>
          </NavLink>

          <NavLink
            to="/catalogo"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 w-16 text-[10px] font-medium transition-all ${
                isActive ? 'text-brand-400 scale-105' : 'text-zinc-500 hover:text-zinc-350'
              }`
            }
          >
            <Package className="w-5 h-5 mb-0.5" />
            <span>Catálogo</span>
          </NavLink>

          <NavLink
            to="/sync"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 w-16 text-[10px] font-medium transition-all relative ${
                isActive ? 'text-brand-400 scale-105' : 'text-zinc-500 hover:text-zinc-350'
              }`
            }
          >
            <RefreshCw className={`w-5 h-5 mb-0.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
            {pendingCount > 0 && (
              <span className="absolute top-1 right-2.5 bg-brand-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center border border-zinc-900">
                {pendingCount}
              </span>
            )}
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
