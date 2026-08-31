import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Truck,
  MapPin,
  FileText,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react';
import { fetchVehiculos, fetchRutas, abrirJornada, ApiRequestError, NetworkError } from '@/lib/api';
import { db, enqueueOperation, generateUlid } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { useJornada } from '@/contexts/JornadaContext';
import JornadaLayout from '@/components/layout/JornadaLayout';
import type { Vehiculo, Ruta, AbrirJornadaPayload, Jornada } from '@/types';

// ─── EscenaAbrirJornadaPage ───────────────────────────────────────────────────
// Escena 1 del Modo Jornada: /jornada
// Soporta apertura offline (ADR-015 Fase 2).
// Si ya existe jornada activa, redirige automáticamente a /jornada/ruta.

export default function EscenaAbrirJornadaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Cargar vehículos y rutas al montar (desde Dexie local con actualización si hay red)
  useEffect(() => {
    async function loadOptions() {
      setLoadingData(true);
      setLoadError(null);
      try {
        // 1. Cargar desde Dexie local (disponible offline tras pullMasterData)
        const [vListDB, rListDB] = await Promise.all([
          db.vehiculos.toArray(),
          db.rutas.toArray(),
        ]);

        let vList = vListDB;
        let rList = rListDB;

        // 2. Si hay conexión, refrescar catálogos en segundo plano
        if (navigator.onLine) {
          try {
            const [vehiculosRes, rutasRes] = await Promise.all([
              fetchVehiculos(),
              fetchRutas(),
            ]);
            if (vehiculosRes.data && vehiculosRes.data.length > 0) {
              vList = vehiculosRes.data;
              await db.vehiculos.bulkPut(vList);
            }
            if (rutasRes.data && rutasRes.data.length > 0) {
              rList = rutasRes.data;
              await db.rutas.bulkPut(rList);
            }
          } catch (netErr) {
            console.warn('[EscenaAbrirJornada] Error al refrescar catálogos remotos, usando locales:', netErr);
          }
        }

        setVehiculos(vList);
        setRutas(rList);
        if (vList.length > 0) {
          setSelectedVehiculoId((prev) => prev ?? vList[0].id);
        }
      } catch (err: unknown) {
        console.error('[EscenaAbrirJornada] Error al cargar vehículos o rutas:', err);
        setLoadError('No se pudieron cargar los vehículos y rutas disponibles.');
      } finally {
        setLoadingData(false);
      }
    }

    loadOptions();
  }, []);

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

    setSubmitting(true);
    setSubmitError(null);

    const ulid = generateUlid();
    const payload: AbrirJornadaPayload = {
      id: ulid,
      idVehiculo: selectedVehiculoId,
      idRuta: selectedRutaId || null,
      notasApertura: notasApertura.trim() || null,
    };

    const selectedVeh = vehiculos.find((v) => v.id === selectedVehiculoId);
    const selectedRuta = rutas.find((r) => r.id === selectedRutaId);

    const nuevaJornada: Jornada = {
      id: ulid,
      idAbonado: 1,
      idVendedor: user?.userId ? Number(user.userId) : 1,
      idChofer: null,
      idVehiculo: selectedVehiculoId,
      idRuta: selectedRutaId || null,
      estado: 'abierta',
      fechaApertura: new Date().toISOString(),
      fechaCierre: null,
      notasApertura: notasApertura.trim() || null,
      notasCierre: null,
      vehiculoPatente: selectedVeh?.patente,
      vehiculoDescripcion: [selectedVeh?.marca, selectedVeh?.modelo].filter(Boolean).join(' ') || undefined,
      rutaNombre: selectedRuta?.nombre || null,
      stockVehiculo: [],
    };

    // Persistir localmente en Dexie de forma optimista
    await db.jornadas.put(nuevaJornada);

    try {
      if (!navigator.onLine) {
        throw new NetworkError('Sin conexión a internet');
      }

      const res = await abrirJornada(payload);
      if (res.data) {
        await db.jornadas.put({
          ...nuevaJornada,
          ...res.data,
        });
      }
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        // Conflicto del servidor (ej. vendedor ya tiene otra jornada abierta)
        await db.jornadas.delete(ulid);
        setSubmitError(err.message || 'Error del servidor al abrir la jornada.');
        setSubmitting(false);
        return;
      }

      // Sin conexión o fallo de red → encolar para sincronizar cuando haya señal
      try {
        await enqueueOperation({
          type: 'OPEN_JORNADA',
          endpoint: '/api/v1/jornadas',
          method: 'POST',
          payload,
          maxRetries: 5,
        });
      } catch (qErr) {
        console.error('[EscenaAbrirJornada] Error al encolar apertura offline:', qErr);
        await db.jornadas.delete(ulid);
        setSubmitError('No se pudo guardar la apertura en la cola offline. Intenta de nuevo.');
        setSubmitting(false);
        return;
      }
    }

    await refreshJornada();
    navigate('/jornada/carga');
  };

  return (
    <JornadaLayout titulo="Abrir Jornada" mostrarAtras={false}>
      <div className="px-4 py-6 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
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
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-brand-400" />
                  Vehículo Asignado <span className="text-rose-400">*</span>
                </label>

                {vehiculos.length === 0 ? (
                  <div className="p-4 bg-zinc-900/60 border border-dashed border-zinc-800 rounded-2xl text-center text-xs text-zinc-500">
                    No hay vehículos registrados en el sistema.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {vehiculos.map((v) => {
                      const isSelected = selectedVehiculoId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVehiculoId(v.id)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-brand-500/10 border-brand-500/50 text-white shadow-sm shadow-brand-500/10'
                              : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              <Truck className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="text-sm font-bold truncate">
                                {v.patente}
                              </p>
                              <p className="text-xs text-zinc-400 truncate">
                                {[v.marca, v.modelo, v.anio ? `(${v.anio})` : null]
                                  .filter(Boolean)
                                  .join(' ') || 'Sin descripción'}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0 ml-2">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selector de Ruta */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-accent-400" />
                  Ruta Planificada <span className="text-zinc-500 text-[10px] lowercase">(opcional)</span>
                </label>

                <div className="space-y-2">
                  <select
                    value={selectedRutaId ?? ''}
                    onChange={(e) =>
                      setSelectedRutaId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-xl px-3.5 py-3 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  >
                    <option value="">-- Sin ruta específica (Venta libre) --</option>
                    {rutas.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre} {r.descripcion ? `(${r.descripcion})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notas de Apertura */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  Notas de Inicio <span className="text-zinc-500 text-[10px] lowercase">(opcional)</span>
                </label>
                <textarea
                  value={notasApertura}
                  onChange={(e) => setNotasApertura(e.target.value)}
                  placeholder="Ej. Odómetro inicial 124.500 km, tanque lleno..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-zinc-600 resize-none transition-colors"
                />
              </div>
            </>
          )}

          {submitError && (
            <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3.5 text-rose-400 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs">{submitError}</p>
            </div>
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
              disabled={submitting || !selectedVehiculoId}
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
