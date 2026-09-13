import { useState } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { useUpdate } from '@/contexts/UpdateContext';

/**
 * ADR-018: Toast no bloqueante para Modo Gestión.
 * Informa al administrador que hay una actualización lista y le permite
 * aplicarla de forma inmediata y voluntaria con un toque.
 */
export function GestionUpdateToast() {
  const { updateAvailable, applyUpdate, isUpdating } = useUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 right-4 left-4 sm:left-auto sm:max-w-sm z-50 animate-in slide-in-from-bottom-5 fade-in duration-200"
    >
      <div className="bg-zinc-900/95 border border-violet-500/30 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 ring-1 ring-violet-500/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white leading-tight">
              Nueva versión disponible
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              Actualización lista para aplicar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={isUpdating}
            onClick={applyUpdate}
            className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-violet-500/20 transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Actualizando...' : 'Actualizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Cerrar aviso"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default GestionUpdateToast;
