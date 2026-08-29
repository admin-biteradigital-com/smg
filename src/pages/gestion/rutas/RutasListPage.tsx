import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  MapPin,
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
  Route as RouteIcon,
  Clock,
} from 'lucide-react';
import { getRutasAdmin, ApiRequestError } from '@/lib/api';
import type { RutaAdminItem } from '@/types';

export default function RutasListPage() {
  const navigate = useNavigate();
  const [rutas, setRutas] = useState<RutaAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getRutasAdmin();
      if (res?.data) {
        setRutas(res.data);
      }
    } catch (err: unknown) {
      console.error('[RutasListPage] Error al cargar rutas:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista de rutas.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header Fijo */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/gestion')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-400" />
            <h1 className="text-sm font-bold text-white">Rutas</h1>
          </div>

          <button
            onClick={() => navigate('/gestion/rutas/nuevo')}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p className="text-xs">Cargando rutas...</p>
          </div>
        ) : errorMsg ? (
          <div className="space-y-4 py-8">
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
            <button
              onClick={loadData}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl text-xs font-bold transition-all"
            >
              Reintentar
            </button>
          </div>
        ) : rutas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mb-3">
              <MapPin className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-sm font-bold text-zinc-200">No hay rutas registradas</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Crea rutas de distribución y zonas de reparto para organizar a tus vendedores.
            </p>
            <button
              onClick={() => navigate('/gestion/rutas/nuevo')}
              className="mt-5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Ruta</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-zinc-400 font-medium">
              <span>{rutas.length} {rutas.length === 1 ? 'ruta' : 'rutas'}</span>
            </div>

            {rutas.map((r) => {
              const activa = r.activa === 1;

              return (
                <button
                  key={r.id}
                  onClick={() => navigate(`/gestion/rutas/${r.id}/editar`)}
                  className="w-full p-4 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl flex items-center gap-3.5 transition-all active:scale-[0.99] text-left group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0 text-purple-400 group-hover:scale-105 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-bold text-zinc-100 truncate">{r.nombre}</p>
                      {activa ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md">
                          Inactiva
                        </span>
                      )}
                    </div>

                    {r.descripcion ? (
                      <p className="text-xs text-zinc-400 line-clamp-1 mb-1">
                        {r.descripcion}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500 italic mb-1">Sin descripción</p>
                    )}

                    {(r.distanciaEstimadaKm !== null || r.duracionEstimadaHoras !== null) && (
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                        {r.distanciaEstimadaKm !== null && (
                          <span className="flex items-center gap-1">
                            <RouteIcon className="w-3 h-3" />
                            <span>{r.distanciaEstimadaKm} km</span>
                          </span>
                        )}
                        {r.duracionEstimadaHoras !== null && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{r.duracionEstimadaHoras} hrs</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
