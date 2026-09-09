import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Store,
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
  Search,
  Phone,
  Mail,
  MapPin,
  User,
  Power,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  getProveedoresAdmin,
  deleteProveedor,
  updateProveedor,
  ApiRequestError,
} from '@/lib/api';
import { formatRut } from '@/lib/rut';
import type { ProveedorAdminItem } from '@/types';

type FiltroEstado = 'activos' | 'todos' | 'inactivos';

export default function ProveedoresListPage() {
  const navigate = useNavigate();

  // Estados de datos
  const [proveedores, setProveedores] = useState<ProveedorAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('activos');

  // Estado para Modal de Confirmación de Baja
  const [proveedorParaBaja, setProveedorParaBaja] = useState<ProveedorAdminItem | null>(null);
  const [ejecutandoBaja, setEjecutandoBaja] = useState(false);

  // Estado para Reactivación directa
  const [ejecutandoReactivacionId, setEjecutandoReactivacionId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const activoParam =
        filtroEstado === 'todos'
          ? 'all'
          : filtroEstado === 'activos'
          ? true
          : false;

      const res = await getProveedoresAdmin({
        q: busqueda.trim() || undefined,
        activo: activoParam,
      });

      const lista = res?.data || [];
      setProveedores(lista);
    } catch (err: unknown) {
      console.error('[ProveedoresListPage] Error al cargar proveedores:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista de proveedores.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Confirmación de Soft Delete desde Modal
  const handleConfirmarBaja = async () => {
    if (!proveedorParaBaja) return;

    setEjecutandoBaja(true);
    setErrorMsg(null);
    setExitoMsg(null);

    try {
      await deleteProveedor(proveedorParaBaja.id);
      setExitoMsg(`Proveedor "${proveedorParaBaja.nombre}" dado de baja exitosamente.`);
      setProveedorParaBaja(null);
      await loadData();
    } catch (err: unknown) {
      console.error('[ProveedoresListPage] Error al dar de baja proveedor:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Error al dar de baja el proveedor.';
      setErrorMsg(msg);
    } finally {
      setEjecutandoBaja(false);
    }
  };

  // Reactivar proveedor inactivo
  const handleReactivar = async (prov: ProveedorAdminItem) => {
    setEjecutandoReactivacionId(prov.id);
    setErrorMsg(null);
    setExitoMsg(null);

    try {
      await updateProveedor(prov.id, { activo: true });
      setExitoMsg(`Proveedor "${prov.nombre}" reactivado exitosamente.`);
      await loadData();
    } catch (err: unknown) {
      console.error('[ProveedoresListPage] Error al reactivar proveedor:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Error al reactivar el proveedor.';
      setErrorMsg(msg);
    } finally {
      setEjecutandoReactivacionId(null);
    }
  };

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
            <Store className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white">Proveedores</h1>
          </div>

          <button
            onClick={() => navigate('/gestion/proveedores/nuevo')}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-4">
        {/* Mensajes de Feedback Global */}
        {exitoMsg && (
          <div className="flex items-start gap-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-300 font-medium animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed flex-1">{exitoMsg}</p>
            <button
              onClick={() => setExitoMsg(null)}
              className="text-emerald-400 hover:text-emerald-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-xs text-rose-400 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed flex-1">{errorMsg}</p>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-rose-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Barra de Búsqueda y Filtros */}
        <div className="space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por razón social o RUT..."
                className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-2xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-2xl text-xs font-bold transition-colors shrink-0"
            >
              Buscar
            </button>
          </form>

          {/* Chips de Filtro Estado */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: 'activos', label: 'Activos' },
                { id: 'todos', label: 'Todos' },
                { id: 'inactivos', label: 'Inactivos' },
              ] as const
            ).map((chip) => {
              const isSelected = filtroEstado === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFiltroEstado(chip.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800/80 hover:text-zinc-200'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Listado / Estados */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs">Cargando proveedores...</p>
          </div>
        ) : errorMsg && proveedores.length === 0 ? (
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
        ) : proveedores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mb-3">
              <Store className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-sm font-bold text-zinc-200">No se encontraron proveedores</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              {busqueda.trim()
                ? 'No hay proveedores que coincidan con los criterios de búsqueda.'
                : 'Registra a tus proveedores para gestionar compras, pedidos y datos de contacto comercial.'}
            </p>
            <button
              onClick={() => navigate('/gestion/proveedores/nuevo')}
              className="mt-5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Proveedor</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-zinc-400 font-medium">
              <span>
                {proveedores.length}{' '}
                {proveedores.length === 1 ? 'proveedor' : 'proveedores'}
              </span>
            </div>

            {proveedores.map((prov) => {
              const activo = prov.activo;
              const rutFormateado = formatRut(prov.rut);
              const estaReactivando = ejecutandoReactivacionId === prov.id;

              return (
                <div
                  key={prov.id}
                  onClick={() => navigate(`/gestion/proveedores/${prov.id}/editar`)}
                  className="w-full p-4 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl flex items-center gap-3.5 transition-all active:scale-[0.99] cursor-pointer group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-105 transition-transform">
                    <Store className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Fila 1: Nombre + Badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-bold text-zinc-100 truncate">
                        {prov.nombre}
                      </p>
                      {activo ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md">
                          Inactivo
                        </span>
                      )}
                    </div>

                    {/* Fila 2: RUT + Dirección */}
                    <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                      <span className="font-mono text-zinc-300 font-medium">
                        {rutFormateado || prov.rut}
                      </span>
                      {prov.direccion && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-zinc-400 truncate">
                            <MapPin className="w-3 h-3 shrink-0 text-zinc-500" />
                            <span className="truncate">{prov.direccion}</span>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Fila 3: Contacto / Teléfono / Email */}
                    {(prov.contacto || prov.telefono || prov.email) && (
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400 flex-wrap">
                        {prov.contacto && (
                          <span className="flex items-center gap-1 text-zinc-300">
                            <User className="w-3 h-3 text-zinc-500 shrink-0" />
                            <span>{prov.contacto}</span>
                          </span>
                        )}
                        {prov.telefono && (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Phone className="w-3 h-3 text-zinc-500 shrink-0" />
                            <span>{prov.telefono}</span>
                          </span>
                        )}
                        {prov.email && (
                          <span className="flex items-center gap-1 text-zinc-400 truncate max-w-[200px]">
                            <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                            <span className="truncate">{prov.email}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Acciones de la Tarjeta */}
                  <div className="flex items-center gap-2 shrink-0">
                    {activo ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProveedorParaBaja(prov);
                        }}
                        title="Dar de baja proveedor"
                        className="p-2 bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-rose-400 rounded-xl transition-all"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={estaReactivando}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReactivar(prov);
                        }}
                        title="Reactivar proveedor"
                        className="p-2 bg-zinc-900 hover:bg-emerald-950/40 border border-zinc-800 hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-400 rounded-xl transition-all disabled:opacity-50"
                      >
                        {estaReactivando ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL DE CONFIRMACIÓN DE SOFT DELETE */}
      {proveedorParaBaja && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-white">
                  Confirmar baja de proveedor
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  ¿Estás seguro de que deseas dar de baja al proveedor{' '}
                  <span className="font-bold text-zinc-200">
                    {proveedorParaBaja.nombre}
                  </span>{' '}
                  ({formatRut(proveedorParaBaja.rut)})?
                </p>
                <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
                  El proveedor pasará a estado inactivo y no se exhibirá en las listas de selección activa. Puedes reactivarlo en cualquier momento.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                disabled={ejecutandoBaja}
                onClick={() => setProveedorParaBaja(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={ejecutandoBaja}
                onClick={handleConfirmarBaja}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {ejecutandoBaja ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dando de baja...</span>
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5" />
                    <span>Dar de baja</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
