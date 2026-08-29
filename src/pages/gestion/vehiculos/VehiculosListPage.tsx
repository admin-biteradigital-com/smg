import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Truck,
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
  Weight,
  Calendar,
} from 'lucide-react';
import { getVehiculosAdmin, ApiRequestError } from '@/lib/api';
import type { VehiculoAdminItem } from '@/types';

const ESTADO_BADGES: Record<
  string,
  { label: string; className: string }
> = {
  disponible: {
    label: 'Disponible',
    className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  en_ruta: {
    label: 'En Ruta',
    className: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
  mantenimiento: {
    label: 'Mantenimiento',
    className: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  inactivo: {
    label: 'Inactivo',
    className: 'text-zinc-400 bg-zinc-800 border-zinc-700',
  },
};

const TIPO_LABELS: Record<string, string> = {
  camioneta: 'Camioneta',
  furgon: 'Furgón',
  camion: 'Camión',
  otro: 'Otro',
};

export default function VehiculosListPage() {
  const navigate = useNavigate();
  const [vehiculos, setVehiculos] = useState<VehiculoAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getVehiculosAdmin();
      if (res?.data) {
        setVehiculos(res.data);
      }
    } catch (err: unknown) {
      console.error('[VehiculosListPage] Error al cargar vehículos:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista de vehículos.';
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
            <Truck className="w-4 h-4 text-amber-400" />
            <h1 className="text-sm font-bold text-white">Vehículos</h1>
          </div>

          <button
            onClick={() => navigate('/gestion/vehiculos/nuevo')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-xs">Cargando vehículos...</p>
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
        ) : vehiculos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mb-3">
              <Truck className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-sm font-bold text-zinc-200">No hay vehículos registrados</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Registra los vehículos de tu flota para asignarlos a jornadas de reparto.
            </p>
            <button
              onClick={() => navigate('/gestion/vehiculos/nuevo')}
              className="mt-5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Vehículo</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-zinc-400 font-medium">
              <span>{vehiculos.length} {vehiculos.length === 1 ? 'vehículo' : 'vehículos'}</span>
            </div>

            {vehiculos.map((veh) => {
              const badge = ESTADO_BADGES[veh.estado] || {
                label: veh.estado,
                className: 'text-zinc-400 bg-zinc-800 border-zinc-700',
              };
              const tipoLabel = veh.tipo ? TIPO_LABELS[veh.tipo] || veh.tipo : null;
              const marcaModelo = [veh.marca, veh.modelo].filter(Boolean).join(' ');

              return (
                <button
                  key={veh.id}
                  onClick={() => navigate(`/gestion/vehiculos/${veh.id}/editar`)}
                  className="w-full p-4 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl flex items-center gap-3.5 transition-all active:scale-[0.99] text-left group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0 text-amber-400 group-hover:scale-105 transition-transform">
                    <Truck className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-mono text-sm font-bold text-zinc-100 tracking-wide">
                        {veh.patente}
                      </span>
                      <span
                        className={`inline-flex items-center text-[10px] font-bold border px-2 py-0.5 rounded-md ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                      {marcaModelo ? (
                        <span className="text-zinc-300 font-medium">{marcaModelo}</span>
                      ) : (
                        <span className="text-zinc-500 italic">Sin marca/modelo</span>
                      )}
                      {tipoLabel && (
                        <>
                          <span>·</span>
                          <span className="text-amber-300/90">{tipoLabel}</span>
                        </>
                      )}
                    </div>

                    {(veh.capacidadKg !== null || veh.anio !== null) && (
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-500">
                        {veh.capacidadKg !== null && (
                          <span className="flex items-center gap-1">
                            <Weight className="w-3 h-3" />
                            <span>{veh.capacidadKg} kg</span>
                          </span>
                        )}
                        {veh.anio !== null && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{veh.anio}</span>
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
