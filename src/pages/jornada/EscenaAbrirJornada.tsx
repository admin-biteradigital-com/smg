import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Truck,
  MapPin,
  FileText,
  AlertCircle,
  WifiOff,
  Check,
  Loader2,
} from 'lucide-react';
import { fetchVehiculos, fetchRutas, abrirJornada } from '@/lib/api';
import { useJornada } from '@/contexts/JornadaContext';
import JornadaLayout from '@/components/layout/JornadaLayout';
import type { Vehiculo, Ruta } from '@/types';

// ─── EscenaAbrirJornadaPage ───────────────────────────────────────────────────
// Escena 1 del Modo Jornada: /jornada
// Migrada desde src/components/jornada/ModalAbrirJornada.tsx
// Si ya existe jornada activa, redirige automáticamente a /jornada/ruta.

export default function EscenaAbrirJornadaPage() {
  const navigate = useNavigate();
  const { jornada, loading: jornadaLoading, refreshJornada } = useJornada();

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedVehiculoId, setSelectedVehiculoId] = useState<number | null>(null);
  const [selectedRutaId, setSelectedRutaId] = useState<number | null>(null);
  const [notasApertura, setNotasApertura] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isOnline = navigator.onLine;

  // Cargar vehículos y rutas al montar
  useEffect(() => {
    async function loadOptions() {
      setLoadingData(true);
      setLoadError(null);
      try {
        const [vehiculosRes, rutasRes] = await Promise.all([
          fetchVehiculos(),
          fetchRutas(),
        ]);
        const vList = vehiculosRes.data || [];
        const rList = rutasRes.data || [];
        setVehiculos(vList);
        setRutas(rList);
        if (vList.length > 0) {
          setSelectedVehiculoId(vList[0].id);
        }
      } catch (err: unknown) {
        console.error('[EscenaAbrirJornada] Error al cargar vehículos o rutas:', err);
        setLoadError('No se pudieron cargar los vehículos y rutas disponibles.');
      } finally {
        setLoadingData(false);
      }
    }

    if (isOnline) {
      loadOptions();
    }
  }, [isOnline]);

  // Si ya hay jornada activa → redirigir a /jornada/ruta
  if (!jornadaLoading && jornada) {
    return <Navigate to="/jornada/ruta" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculoId) {
      setSubmitError('Debes seleccionar un vehículo para iniciar la jornada.');
      return;
    }

    if (!isOnline) {
      setSubmitError('Se requiere conexión a internet para abrir la jornada.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await abrirJornada({
        idVehiculo: selectedVehiculoId,
        idRuta: selectedRutaId || null,
        notasApertura: notasApertura.trim() || null,
      });

      await refreshJornada();
      navigate('/jornada/carga');
    } catch (err: unknown) {
      console.error('[EscenaAbrirJornada] Error al abrir jornada:', err);
      const message = err instanceof Error ? err.message : 'No se pudo abrir la jornada. Intenta nuevamente.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <JornadaLayout titulo="Abrir Jornada" mostrarAtras={false}>
      <div className="px-4 py-6 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Advertencia Offline */}
          {!isOnline && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 text-amber-400">
              <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Sin conexión a internet</p>
                <p className="text-amber-400/80 mt-0.5">
                  La apertura de jornada requiere comunicación directa con el servidor y no puede registrarse offline.
                </p>
              </div>
            </div>
          )}

          {loadError && (
            <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3.5 text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs">{loadError}</p>
            </div>
          )}

          {loadingData || jornadaLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-zinc-400">
              <Loader2 className="w-7 h-7 animate-spin text-brand-400" />
              <p className="text-xs">Cargando flota de vehículos y rutas...</p>
            </div>
          ) : (
            <>
              {/* Selector de Vehículo */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-brand-400" />
                  Vehículo Asignado <span className="text-rose-400">*</span>
                </label>
                {vehiculos.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                    No hay vehículos registrados o disponibles.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {vehiculos.map((v) => {
                      const isSelected = selectedVehiculoId === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVehiculoId(v.id)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-brand-500/10 border-brand-500/50 text-white shadow-sm'
                              : 'bg-zinc-950/40 border-zinc-800/80 hover:bg-zinc-800/50 text-zinc-300'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm tracking-wider uppercase bg-zinc-800 px-2 py-0.5 rounded text-zinc-100 border border-zinc-700">
                                {v.patente}
                              </span>
                              <span className="text-xs font-semibold text-zinc-200">
                                {[v.marca, v.modelo].filter(Boolean).join(' ') || 'Vehículo'}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                              {v.tipo ? `${v.tipo} • ` : ''}
                              {v.capacidadKg ? `Capacidad: ${v.capacidadKg} kg` : ''}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'border-brand-500 bg-brand-500 text-white'
                                : 'border-zinc-700 bg-zinc-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selector de Ruta */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-accent-400" />
                  Ruta Planificada <span className="text-zinc-500 text-[10px] lowercase font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedRutaId || ''}
                    onChange={(e) => setSelectedRutaId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="">-- Sin ruta específica / Ruta libre --</option>
                    {rutas.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre} {r.distanciaEstimadaKm ? `(${r.distanciaEstimadaKm} km)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notas de Apertura */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  Notas de Apertura <span className="text-zinc-500 text-[10px] lowercase font-normal">(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  value={notasApertura}
                  onChange={(e) => setNotasApertura(e.target.value)}
                  placeholder="Ej: Kilometraje inicial, estado del vehículo..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>

              {/* Error de envío */}
              {submitError && (
                <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3.5 text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs">{submitError}</p>
                </div>
              )}
            </>
          )}

          {/* Footer / Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              disabled={submitting}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedVehiculoId || !isOnline}
              className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                'Confirmar Apertura'
              )}
            </button>
          </div>
        </form>
      </div>
    </JornadaLayout>
  );
}
