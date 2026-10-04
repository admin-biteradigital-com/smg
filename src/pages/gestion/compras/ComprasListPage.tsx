import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ShoppingCart,
  Plus,
  Loader2,
  AlertCircle,
  Clock,
  ChevronRight,
  Filter,
  RefreshCw,
  Calendar,
  Building2,
  DollarSign,
} from 'lucide-react';
import {
  getOrdenesCompra,
  getProveedoresAdmin,
  ApiRequestError,
} from '@/lib/api';
import {
  formatCLP,
  formatFecha,
  esPagoVencido,
  esEntregaDemorada,
  getEstadoBadge,
  getEstadoPagoBadge,
} from '@/lib/compras';
import type { OrdenCompraItem, ProveedorAdminItem } from '@/types';

type FiltroEstado = 'todos' | 'borrador' | 'confirmada' | 'recibida' | 'cancelada';

export default function ComprasListPage() {
  const navigate = useNavigate();

  // Estados de datos
  const [ordenes, setOrdenes] = useState<OrdenCompraItem[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [filtroProveedor, setFiltroProveedor] = useState<string>('todos');

  // Carga de proveedores para el selector de filtro
  useEffect(() => {
    async function loadProveedores() {
      try {
        const res = await getProveedoresAdmin({ activo: true });
        if (res?.data) {
          setProveedores(res.data);
        }
      } catch (err) {
        console.error('[ComprasListPage] Error al cargar proveedores:', err);
      }
    }
    loadProveedores();
  }, []);

  // Carga de órdenes de compra
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const filters: { estado?: string; id_proveedor?: number } = {};
      if (filtroEstado !== 'todos') {
        filters.estado = filtroEstado;
      }
      if (filtroProveedor !== 'todos') {
        const parsedId = Number(filtroProveedor);
        if (!isNaN(parsedId) && parsedId > 0) {
          filters.id_proveedor = parsedId;
        }
      }

      const res = await getOrdenesCompra(filters);
      setOrdenes(res?.data || []);
    } catch (err: unknown) {
      console.error('[ComprasListPage] Error al cargar órdenes de compra:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista de órdenes de compra.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroProveedor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header Fijo */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/gestion')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-rose-400" />
            <h1 className="text-sm font-bold text-white">Órdenes de Compra</h1>
          </div>

          <button
            onClick={() => navigate('/gestion/compras/nueva')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4">
        {/* Controles de Filtros */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>Filtros de búsqueda</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Filtro Estado */}
            <div>
              <label htmlFor="filtro-estado" className="block text-[11px] font-medium text-zinc-400 mb-1">
                Estado de la orden
              </label>
              <select
                id="filtro-estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="borrador">Borrador</option>
                <option value="confirmada">Confirmada</option>
                <option value="recibida">Recibida</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            {/* Filtro Proveedor */}
            <div>
              <label htmlFor="filtro-proveedor" className="block text-[11px] font-medium text-zinc-400 mb-1">
                Proveedor
              </label>
              <select
                id="filtro-proveedor"
                value={filtroProveedor}
                onChange={(e) => setFiltroProveedor(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="todos">Todos los proveedores</option>
                {proveedores.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-rose-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={loadData}
              className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors shrink-0"
              title="Reintentar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <Loader2 className="w-7 h-7 animate-spin text-rose-400" />
            <p className="text-xs">Cargando órdenes de compra...</p>
          </div>
        )}

        {/* Lista Vacía */}
        {!loading && !errorMsg && ordenes.length === 0 && (
          <div className="py-16 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-500">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-zinc-200">No hay órdenes de compra</h2>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              No se encontraron órdenes con los filtros seleccionados. Crea una nueva orden de compra para comenzar.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/gestion/compras/nueva')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Orden</span>
              </button>
            </div>
          </div>
        )}

        {/* Listado de Tarjetas */}
        {!loading && !errorMsg && ordenes.length > 0 && (
          <div className="space-y-3">
            {ordenes.map((orden) => {
              const badgeEstado = getEstadoBadge(orden.estado);
              const badgePago = getEstadoPagoBadge(orden.estado_pago);
              const pagoVencido = esPagoVencido(orden);
              const entregaDemorada = esEntregaDemorada(orden);

              return (
                <div
                  key={orden.id}
                  onClick={() => navigate(`/gestion/compras/${orden.id}`)}
                  className="w-full text-left bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-all active:scale-[0.99] group shadow-md cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      {/* Cabecera: ID, Proveedor y Fecha */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          #{orden.id}
                        </span>
                        <div className="flex items-center gap-1 text-sm font-bold text-white truncate">
                          <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{orden.proveedor_nombre || 'Proveedor sin nombre'}</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          {formatFecha(orden.fecha_creacion)}
                        </span>
                      </div>

                      {/* Badges de estado y alertas calculadas */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeEstado.className}`}
                        >
                          {badgeEstado.label}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgePago.className}`}
                        >
                          {badgePago.label}
                        </span>

                        {pagoVencido && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-md">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            Pago vencido
                          </span>
                        )}

                        {entregaDemorada && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3 shrink-0" />
                            Entrega demorada
                          </span>
                        )}
                      </div>

                      {/* Información Adicional: Total y Condiciones */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/80">
                        <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
                          <span>
                            Condición:{' '}
                            <strong className="text-zinc-200 capitalize font-medium">
                              {orden.condicion_pago || 'contado'}
                            </strong>
                            {orden.condicion_pago === 'credito' && orden.fecha_vencimiento_pago && (
                              <span className="ml-1 text-zinc-400">
                                (Vence: {formatFecha(orden.fecha_vencimiento_pago)})
                              </span>
                            )}
                          </span>

                          {orden.fecha_entrega_estimada && (
                            <span className="hidden sm:inline">
                              Entrega est.:{' '}
                              <strong className="text-zinc-200 font-medium">
                                {formatFecha(orden.fecha_entrega_estimada)}
                              </strong>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-sm font-extrabold text-white">
                          <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{formatCLP(orden.total)}</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0 self-center" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
