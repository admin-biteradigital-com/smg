import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Truck,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import {
  getVehiculosAdmin,
  createVehiculo,
  updateVehiculo,
  ApiRequestError,
} from '@/lib/api';

const TIPOS_VEHICULO = [
  { value: '', label: 'Sin especificar' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'furgon', label: 'Furgón' },
  { value: 'camion', label: 'Camión' },
  { value: 'otro', label: 'Otro' },
] as const;

const ESTADOS_VEHICULO = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_ruta', label: 'En Ruta' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'inactivo', label: 'Inactivo' },
] as const;

export default function VehiculoFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  // Estados de datos
  const [loading, setLoading] = useState(isEditing);
  const [guardando, setGuardando] = useState(false);

  // Estados de feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Campos
  const [patente, setPatente] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState<string>('');
  const [tipo, setTipo] = useState<string>('');
  const [capacidadKg, setCapacidadKg] = useState<string>('');
  const [estado, setEstado] = useState<string>('disponible');

  // Cargar datos en edición
  useEffect(() => {
    if (!isEditing || !id) return;

    async function loadVehiculo() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await getVehiculosAdmin();
        if (res?.data) {
          const veh = res.data.find((v) => v.id === Number(id));
          if (veh) {
            setPatente(veh.patente || '');
            setMarca(veh.marca || '');
            setModelo(veh.modelo || '');
            setAnio(veh.anio !== null && veh.anio !== undefined ? String(veh.anio) : '');
            setTipo(veh.tipo || '');
            setCapacidadKg(
              veh.capacidadKg !== null && veh.capacidadKg !== undefined
                ? String(veh.capacidadKg)
                : ''
            );
            setEstado(veh.estado || 'disponible');
          } else {
            setErrorMsg('No se encontró el vehículo solicitado.');
          }
        }
      } catch (err: unknown) {
        console.error('[VehiculoFormPage] Error al cargar vehículo:', err);
        const msg =
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'No se pudo cargar la información del vehículo.';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    }

    loadVehiculo();
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    const cleanPatente = patente.trim().toUpperCase();
    if (!cleanPatente) {
      setErrorMsg('La patente es requerida.');
      return;
    }

    setGuardando(true);

    const anioNum = anio.trim() ? parseInt(anio.trim(), 10) : null;
    const capacidadNum = capacidadKg.trim() ? parseFloat(capacidadKg.trim()) : null;

    try {
      if (isEditing && id) {
        const payload = {
          patente: cleanPatente,
          marca: marca.trim() || null,
          modelo: modelo.trim() || null,
          anio: anioNum,
          tipo: tipo || null,
          capacidadKg: capacidadNum,
          estado,
        };
        await updateVehiculo(Number(id), payload);
        setExitoMsg('Vehículo actualizado exitosamente.');
      } else {
        const payload = {
          patente: cleanPatente,
          marca: marca.trim() || null,
          modelo: modelo.trim() || null,
          anio: anioNum,
          tipo: tipo || null,
          capacidadKg: capacidadNum,
        };
        const res = await createVehiculo(payload);
        setExitoMsg('Vehículo creado exitosamente.');
        if (res?.data?.id) {
          setTimeout(() => {
            navigate('/gestion/vehiculos');
          }, 1000);
        }
      }
    } catch (err: unknown) {
      console.error('[VehiculoFormPage] Error al guardar vehículo:', err);
      if (err instanceof ApiRequestError) {
        if (err.status === 409 || err.code === 'DUPLICATE_PATENTE') {
          setErrorMsg('Ya existe un vehículo con esa patente');
        } else {
          setErrorMsg(err.message);
        }
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('No se pudo guardar el vehículo.');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header Fijo */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/gestion/vehiculos')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" />
            <h1 className="text-sm font-bold text-white">
              {isEditing ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            </h1>
          </div>

          <div className="w-16" />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-xs">Cargando vehículo...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mensajes de Alerta / Éxito */}
            {errorMsg && (
              <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-xs text-rose-400 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {exitoMsg && (
              <div className="flex items-start gap-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-300 font-medium animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{exitoMsg}</p>
              </div>
            )}

            {/* SECCIÓN 1: Identificación del Vehículo */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  Identificación y Características
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Patente y datos principales del vehículo.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Patente */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Patente <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={patente}
                    onChange={(e) => setPatente(e.target.value.toUpperCase())}
                    placeholder="Ej: AB-CD-12 o ABCD12"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono uppercase tracking-wider"
                  />
                </div>

                {/* Marca y Modelo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      placeholder="Ej: Peugeot"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      placeholder="Ej: Boxer"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Tipo y Año */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Tipo de Vehículo
                    </label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl text-xs text-zinc-100 focus:outline-none transition-colors"
                    >
                      {TIPOS_VEHICULO.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Año
                    </label>
                    <input
                      type="number"
                      min="1990"
                      max="2035"
                      value={anio}
                      onChange={(e) => setAnio(e.target.value)}
                      placeholder="Ej: 2022"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Capacidad en Kg */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Capacidad de Carga (kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={capacidadKg}
                    onChange={(e) => setCapacidadKg(e.target.value)}
                    placeholder="Ej: 1500"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: Estado Operativo (solo en edición) */}
            {isEditing && (
              <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
                <div className="border-b border-zinc-800 pb-3">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    Estado Operativo
                  </h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Disponibilidad del vehículo para nuevas jornadas.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Estado Actual
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl text-xs text-zinc-100 focus:outline-none transition-colors"
                  >
                    {ESTADOS_VEHICULO.map((est) => (
                      <option key={est.value} value={est.value}>
                        {est.label}
                      </option>
                    ))}
                  </select>
                </div>
              </section>
            )}

            {/* Footer Fijo con Botón Guardar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/gestion/vehiculos')}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs flex items-center gap-2"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isEditing ? 'Guardar Cambios' : 'Crear Vehículo'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
