import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut } from 'lucide-react';
import { SyncIndicator } from '@/components/offline/SyncIndicator';
import { onSyncStatusChange, getCurrentSyncStatus } from '@/lib/sync';
import { useAuth } from '@/contexts/AuthContext';
import type { SyncStatus } from '@/types';

// ─── JornadaLayout ────────────────────────────────────────────────────────────
// Layout wrapper para las escenas del Modo Jornada.
// NO usa AppShell ni bottom navigation.
//
// Cada escena lo usa como wrapper con props para personalizar el título
// y el botón de retroceso:
//
//   <JornadaLayout titulo="Abrir Jornada">
//     {/* contenido de la escena */}
//   </JornadaLayout>
//
// Estructura visual:
// ┌───────────────────────────────────────┐
// │ [←] Título de escena   [●sync] [usr] │  ← Header fijo
// ├───────────────────────────────────────┤
// │                                       │
// │   {children}                          │  ← flex-1
// │                                       │
// └───────────────────────────────────────┘

interface JornadaLayoutProps {
  titulo: string;
  mostrarAtras?: boolean;
  onAtras?: () => void;
  children: React.ReactNode;
}

export default function JornadaLayout({
  titulo,
  mostrarAtras = false,
  onAtras,
  children,
}: JornadaLayoutProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getCurrentSyncStatus);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status, pending) => {
      setSyncStatus(status);
      setPendingCount(pending);
    });
    return unsubscribe;
  }, []);

  const handleBack = () => {
    if (onAtras) {
      onAtras();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-950 text-white flex flex-col">
      {/* Header Fijo */}
      <header className="sticky top-0 z-40 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Botón Atrás */}
          {mostrarAtras && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-xl transition-all active:scale-95 shrink-0"
              aria-label="Volver"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Logo + Título */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-zinc-100 truncate">
                {titulo}
              </h1>
              <p className="text-[10px] text-zinc-400 capitalize truncate">
                {user?.email?.split('@')[0] ?? 'Operador'} · {user?.rol ?? 'vendedor'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
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

      {/* Main Content — Escena */}
      <main className="flex-1 w-full max-w-2xl mx-auto">
        {children}
      </main>
    </div>
  );
}
