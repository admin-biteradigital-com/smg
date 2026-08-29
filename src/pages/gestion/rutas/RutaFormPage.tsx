import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  MapPin,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  getRutasAdmin,
  createRuta,
  updateRuta,
  ApiRequestError,
} from '@/lib/api';

export default function RutaFormPage() {
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
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [distanciaEstimadaKm, setDistanciaEstimadaKm] = useState<string>('');
  const [duracionEstimadaHoras, setDuracionEstimadaHoras] = useState<string>('');
  const [activa, setActiva] = useState<number>(1);

  // Cargar en modo edición
  useEffect(() => {
    if (!isEditing || !id) return;

    async function loadRuta() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await getRutasAdmin();
        if (res?.data) {
          const ruta = res.data.find((r) => r.id === Number(id));
          if (ruta) {
            setNombre(ruta.nombre || '');
            setDescripcion(ruta.descripcion || '');
            setDistanciaEstimadaKm(
              ruta.distanciaEstimadaKm !== null && ruta.distanciaEstimadaKm !== undefined
                ? String(ruta.distanciaEstimadaKm)
                : ''
            );
            setDuracionEstimadaHoras(
              ruta.duracionEstimadaHoras !== null && ruta.duracionEstimadaHoras !== undefined
                ? String(ruta.duracionEstimadaHoras)
                : ''
            );
            setActiva(ruta.activa ?? 1);
          } else {
            setErrorMsg('No se encontró la ruta solicitada.');
          }
        }
      } catch (err: unknown) {
        console.error('[RutaFormPage] Error al cargar ruta:', err);
        const msg =
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'No se pudo cargar la información de la ruta.';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    }

    loadRuta();
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    const cleanNombre = nombre.trim();
    if (!cleanNombre) {
      setErrorMsg('El nombre de la ruta es requerido.');
      return;
    }

    setGuardando(true);

    const distNum = distanciaEstimadaKm.trim()
      ? parseFloat(distanciaEstimadaKm.trim())
      : null;
    const durNum = duracionEstimadaHoras.trim()
      ? parseFloat(duracionEstimadaHoras.trim())
      : null;

    try {
      if (isEditing && id) {
        const payload = {
          nombre: cleanNombre,
          descripcion: descripcion.trim() || null,
          distanciaEstimadaKm: distNum,
          duracionEstimadaHoras: durNum,
          activa,
        };
        await updateRuta(Number(id), payload);
        setExitoMsg('Ruta actualizada exitosamente.');
      } else {
        const payload = {
          nombre: cleanNombre,
          descripcion: descripcion.trim() || null,
          distanciaEstimadaKm: distNum,
          duracionEstimadaHoras: durNum,
        };
        const res = await createRuta(payload);
        setExitoMsg('Ruta creada exitosamente.');
        if (res?.data?.id) {
          setTimeout(() => {
            navigate('/gestion/rutas');
          }, 1000);
        }
      }
    } catch (err: unknown) {
      console.error('[RutaFormPage] Error al guardar ruta:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo guardar la ruta.';
      setErrorMsg(msg);
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
            onClick={() => navigate('/gestion/rutas')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-400" />
            <h1 className="text-sm font-bold text-white">
              {isEditing ? 'Editar Ruta' : 'Nueva Ruta'}
            </h1>
          </div>

          <div className="w-16" />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p className="text-xs">Cargando ruta...</p>
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

            {/* SECCIÓN 1: Datos de la Ruta */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  Información de la Ruta
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Nombre identificador y zona de cobertura.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Nombre de la Ruta <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Ruta Norte - Coquimbo / La Serena"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Descripción (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej: Abarca locales comerciales de la zona centro y avenida costanera..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Distancia y Duración */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Distancia Estimada (km)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={distanciaEstimadaKm}
                      onChange={(e) => setDistanciaEstimadaKm(e.target.value)}
                      placeholder="Ej: 45.5"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Duración Estimada (horas)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={duracionEstimadaHoras}
                      onChange={(e) => setDuracionEstimadaHoras(e.target.value)}
                      placeholder="Ej: 4.5"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Toggle Activa / Inactiva (solo en edición) */}
                {isEditing && (
                  <div className="pt-2 border-t border-zinc-800/80">
                    <label className="block text-xs font-semibold text-zinc-300 mb-2">
                      Estado de la Ruta
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiva(1)}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          activa === 1
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <ToggleRight className="w-4 h-4 text-emerald-400" />
                        <span>Activa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiva(0)}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          activa === 0
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <ToggleLeft className="w-4 h-4 text-rose-400" />
                        <span>Inactiva</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Footer Fijo con Botón Guardar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/gestion/rutas')}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs flex items-center gap-2"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isEditing ? 'Guardar Cambios' : 'Crear Ruta'}
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
