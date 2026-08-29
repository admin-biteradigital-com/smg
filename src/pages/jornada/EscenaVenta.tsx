import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import {
  Search,
  X,
  Minus,
  Plus,
  AlertCircle,
  Loader2,
  Send,
  Building2,
  User,
  FileText,
  Boxes,
} from 'lucide-react';
import { useJornada } from '@/contexts/JornadaContext';
import JornadaLayout from '@/components/layout/JornadaLayout';
import { api, ApiRequestError, NetworkError } from '@/lib/api';
import { db, enqueueOperation } from '@/lib/db';
import type { Cliente, Sucursal } from '@/types';

// ─── Tipos locales ────────────────────────────────────────────────────────────

export interface LineaCarrito {
  idProducto: number;
  idLote: number;
  nombreProducto: string;
  codigoProducto: string;
  numeroLote: string;
  cantidadDisponible: number;
  cantidad: number;
  precioUnitario: number;
  unidadMedida: string;
}

interface SalePayload {
  id_cliente: number;
  id_sucursal: number | null;
  canal?: 'app_vendedor';
  lineas: Array<{
    id_producto: number;
    cantidad: number;
    precio_unitario: number;
  }>;
  notas: string | null;
}

interface SaleResponse {
  data: {
    id: number;
    total?: number;
  };
  meta?: unknown;
}

// ─── EscenaVentaPage ──────────────────────────────────────────────────────────
// Escena 4 del Modo Jornada: /jornada/venta/:clienteId
// Permite armar la venta utilizando exclusivamente el stock del vehículo.

export default function EscenaVentaPage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const [searchParams] = useSearchParams();
  const sucursalId = searchParams.get('sucursalId');

  const navigate = useNavigate();
  const { jornada, loading: jornadaLoading, refreshJornada } = useJornada();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [sucursal, setSucursal] = useState<Sucursal | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  // Carrito local
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [notas, setNotas] = useState('');

  // Estados de envío
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  // 1. Cargar cliente y sucursal desde Dexie
  useEffect(() => {
    async function loadClienteData() {
      if (!clienteId) return;
      setLoadingContext(true);
      try {
        const c = await db.clientes.get(clienteId);
        setCliente(c ?? null);

        if (sucursalId) {
          const s = await db.sucursales.get(sucursalId);
          setSucursal(s ?? null);
        }
      } catch (err) {
        console.error('[EscenaVenta] Error al cargar cliente:', err);
      } finally {
        setLoadingContext(false);
      }
    }
    loadClienteData();
  }, [clienteId, sucursalId]);

  // 2. Inicializar líneas del carrito con los ítems del stock del vehículo
  useEffect(() => {
    async function initStockLines() {
      if (!jornada?.stockVehiculo) return;

      try {
        // Cargar productos de Dexie para obtener precios base
        const todosProductos = await db.productos.toArray();
        const preciosMap = new Map<string, number>();
        for (const p of todosProductos) {
          preciosMap.set(String(p.id), p.precioBase || p.precioPublico || 0);
        }

        const lineasIniciales: LineaCarrito[] = jornada.stockVehiculo.map((item) => {
          const precioSugerido = preciosMap.get(String(item.idProducto)) ?? 0;
          return {
            idProducto: item.idProducto,
            idLote: item.idLote,
            nombreProducto: item.nombreProducto,
            codigoProducto: item.codigoProducto,
            numeroLote: item.numeroLote,
            cantidadDisponible: item.cantidadDisponible,
            cantidad: 0,
            precioUnitario: precioSugerido,
            unidadMedida: item.unidadMedida || 'unidad',
          };
        });

        setCarrito(lineasIniciales);
      } catch (err) {
        console.error('[EscenaVenta] Error al inicializar stock del vehículo:', err);
      }
    }

    initStockLines();
  }, [jornada?.stockVehiculo]);

  // Guard: si no hay jornada activa → redirigir a /jornada
  if (!jornadaLoading && !jornada) {
    return <Navigate to="/jornada" replace />;
  }

  // Modificar cantidad en carrito
  const handleUpdateCantidad = (idProducto: number, idLote: number, nuevaCantidad: number) => {
    setCarrito((prev) =>
      prev.map((l) => {
        if (l.idProducto === idProducto && l.idLote === idLote) {
          const val = Math.max(0, Math.min(l.cantidadDisponible, nuevaCantidad));
          return { ...l, cantidad: val };
        }
        return l;
      })
    );
  };

  // Modificar precio unitario en caso de ser necesario
  const handleUpdatePrecio = (idProducto: number, idLote: number, nuevoPrecio: number) => {
    setCarrito((prev) =>
      prev.map((l) => {
        if (l.idProducto === idProducto && l.idLote === idLote) {
          return { ...l, precioUnitario: Math.max(0, nuevoPrecio) };
        }
        return l;
      })
    );
  };

  // Filtrar productos por búsqueda
  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return carrito;
    return carrito.filter(
      (item) =>
        item.nombreProducto.toLowerCase().includes(q) ||
        item.codigoProducto.toLowerCase().includes(q) ||
        item.numeroLote.toLowerCase().includes(q)
    );
  }, [carrito, busqueda]);

  // Líneas con cantidad seleccionada > 0
  const lineasSeleccionadas = useMemo(() => {
    return carrito.filter((l) => l.cantidad > 0);
  }, [carrito]);

  const totalVenta = useMemo(() => {
    return lineasSeleccionadas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0);
  }, [lineasSeleccionadas]);

  const totalUnidades = useMemo(() => {
    return lineasSeleccionadas.reduce((acc, l) => acc + l.cantidad, 0);
  }, [lineasSeleccionadas]);

  // 3. Confirmar Venta
  const handleConfirmarVenta = async () => {
    if (lineasSeleccionadas.length === 0 || !jornada || !clienteId) return;

    setEnviando(true);
    setErrorEnvio(null);

    const payload: SalePayload = {
      id_cliente: Number(clienteId),
      id_sucursal: sucursalId ? Number(sucursalId) : null,
      lineas: lineasSeleccionadas.map((l) => ({
        id_producto: Number(l.idProducto),
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precioUnitario),
      })),
      notas: notas.trim() || null,
    };

    try {
      if (!navigator.onLine) {
        throw new NetworkError('Sin conexión a internet');
      }

      const res = await api.post<SaleResponse>('/api/v1/sales/sales', payload);

      // Refrescar stock de la jornada tras venta exitosa
      await refreshJornada();

      const ventaId = res?.data?.id;
      const ventaTotal = res?.data?.total ?? totalVenta;

      navigate(`/jornada/cobro/${ventaId}`, {
        state: {
          total: ventaTotal,
          clienteNombre: cliente?.razonSocial || 'Cliente',
        },
      });
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        setErrorEnvio(err.message || 'Error del servidor al registrar la venta.');
        setEnviando(false);
        return;
      }

      // Sin red o error de conexión → encolar para sync posterior
      try {
        await enqueueOperation({
          type: 'CREATE_PEDIDO',
          endpoint: '/api/v1/sales/sales',
          method: 'POST',
          payload,
          maxRetries: 5,
        });

        // Encolado exitoso: regresar a /jornada/ruta
        navigate('/jornada/ruta');
      } catch (qErr) {
        console.error('[EscenaVenta] Error al encolar venta offline:', qErr);
        setErrorEnvio('No se pudo guardar la venta en la cola offline. Intenta de nuevo.');
        setEnviando(false);
      }
    }
  };

  return (
    <JornadaLayout
      titulo="Nueva Venta"
      mostrarAtras={true}
      onAtras={() => navigate('/jornada/ruta')}
    >
      <div className="flex flex-col min-h-[calc(100dvh-57px)] pb-36">
        {/* Subheader: Info del cliente seleccionado */}
        <div className="bg-zinc-900/90 border-b border-zinc-800/60 px-4 py-3">
          {loadingContext ? (
            <div className="h-5 bg-zinc-800 rounded animate-pulse w-48" />
          ) : (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                <p className="text-sm font-bold text-zinc-100 truncate">
                  {cliente?.razonSocial || `Cliente #${clienteId}`}
                </p>
                {cliente?.rut && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    ({cliente.rut})
                  </span>
                )}
              </div>
              {sucursal && (
                <div className="flex items-center gap-1 text-[11px] text-zinc-400 pl-5">
                  <Building2 className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="truncate">
                    {sucursal.nombre || 'Sucursal'} — {sucursal.direccion}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buscador de productos en el vehículo */}
        <div className="sticky top-[57px] z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="search"
              inputMode="search"
              placeholder="Buscar en stock del vehículo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-brand-500 rounded-2xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition-all"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de productos del vehículo */}
        <div className="flex-1 px-4 py-4 space-y-3">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Boxes className="w-12 h-12 text-zinc-700" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-300">
                  Vehículo sin stock cargado
                </p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  No hay productos disponibles en el vehículo para realizar ventas.
                </p>
              </div>
              <button
                onClick={() => navigate('/jornada/carga')}
                className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all"
              >
                Ir a Cargar Vehículo
              </button>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-sm font-bold text-zinc-300 mb-1">Sin resultados</p>
              <p className="text-xs text-zinc-500">
                No hay productos en el vehículo que coincidan con "{busqueda}".
              </p>
            </div>
          ) : (
            productosFiltrados.map((item) => {
              const sinStock = item.cantidadDisponible <= 0;
              const tieneCantidad = item.cantidad > 0;

              return (
                <div
                  key={`${item.idProducto}-${item.idLote}`}
                  className={`bg-zinc-900 border rounded-2xl p-4 flex flex-col gap-3 transition-all ${
                    tieneCantidad
                      ? 'border-brand-500/50 ring-1 ring-brand-500/30'
                      : sinStock
                      ? 'border-zinc-800/50 opacity-50'
                      : 'border-zinc-800'
                  }`}
                >
                  {/* Cabecera del producto */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-zinc-100 leading-tight">
                        {item.nombreProducto}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {item.codigoProducto}
                        </span>
                        <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                          Lote: {item.numeroLote}
                        </span>
                      </div>
                    </div>

                    {/* Badge de stock disponible */}
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                          sinStock
                            ? 'bg-zinc-800 text-zinc-500'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {sinStock ? 'Agotado' : `${item.cantidadDisponible} ${item.unidadMedida}`}
                      </span>
                    </div>
                  </div>

                  {/* Precio y Stepper */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-800/60">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-zinc-500">$</span>
                      <input
                        type="number"
                        min="0"
                        value={item.precioUnitario || ''}
                        onChange={(e) =>
                          handleUpdatePrecio(
                            item.idProducto,
                            item.idLote,
                            Number(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="w-24 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl px-2.5 py-1 text-sm font-bold text-zinc-100 focus:outline-none transition-colors"
                      />
                      <span className="text-[10px] text-zinc-500">c/u</span>
                    </div>

                    {/* Stepper — Touch targets ≥ 44px */}
                    <div className="flex items-center gap-1.5 bg-zinc-800 rounded-2xl p-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateCantidad(item.idProducto, item.idLote, item.cantidad - 1)
                        }
                        disabled={item.cantidad === 0}
                        aria-label="Reducir cantidad"
                        className="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30 rounded-xl transition-all active:scale-90"
                      >
                        {item.cantidad === 1 ? <X className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      </button>

                      <input
                        type="number"
                        min="0"
                        max={item.cantidadDisponible}
                        value={item.cantidad === 0 ? '' : item.cantidad}
                        onChange={(e) =>
                          handleUpdateCantidad(
                            item.idProducto,
                            item.idLote,
                            Number(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        disabled={sinStock}
                        className="w-12 bg-transparent text-center text-sm font-bold text-white tabular-nums focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateCantidad(item.idProducto, item.idLote, item.cantidad + 1)
                        }
                        disabled={sinStock || item.cantidad >= item.cantidadDisponible}
                        aria-label="Aumentar cantidad"
                        className="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30 rounded-xl transition-all active:scale-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Campo opcional de Notas */}
          {carrito.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2 mt-4">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                Notas de la venta <span className="text-zinc-600 font-normal lowercase">(opcional)</span>
              </label>
              <textarea
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Entregar por recepción, cliente solicita factura..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
              />
            </div>
          )}

          {/* Error de envío */}
          {errorEnvio && (
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Error al confirmar venta</p>
                <p className="text-rose-400/90 mt-0.5">{errorEnvio}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer fijo con total y botón Confirmar Venta */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
          <div className="max-w-2xl mx-auto space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">
                  {lineasSeleccionadas.length}{' '}
                  {lineasSeleccionadas.length === 1 ? 'producto' : 'productos'} · {totalUnidades} uds
                </p>
                <p className="text-lg font-black text-white">
                  ${totalVenta.toLocaleString('es-CL')}
                </p>
              </div>

              <button
                onClick={handleConfirmarVenta}
                disabled={enviando || lineasSeleccionadas.length === 0}
                className="px-6 py-3.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-2xl shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95 text-xs"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Confirmar Venta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </JornadaLayout>
  );
}
