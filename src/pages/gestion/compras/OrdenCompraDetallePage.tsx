import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ShoppingCart,
  Edit,
  CheckCircle,
  XCircle,
  PlusCircle,
  Loader2,
  AlertCircle,
  Clock,
  Building2,
  FileText,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  X,
  User,
} from 'lucide-react';
import {
  getOrdenCompraById,
  confirmarOrdenCompra,
  cancelarOrdenCompra,
  registrarPagoOrdenCompra,
  ApiRequestError,
} from '@/lib/api';
import {
  formatCLP,
  formatFecha,
  formatFechaHora,
  calcularSaldoOrden,
  esPagoVencido,
  esEntregaDemorada,
  getEstadoBadge,
  getEstadoPagoBadge,
  getHoyString,
} from '@/lib/compras';
import type {
  OrdenCompraDetalle,
  CreatePagoProveedorPayload,
} from '@/types';

export default function OrdenCompraDetallePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const ordenId = Number(id);

  // Estados de datos
  const [orden, setOrden] = useState<OrdenCompraDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Modales de confirmación
  const [modalConfirmarOpen, setModalConfirmarOpen] = useState(false);
  const [modalCancelarOpen, setModalCancelarOpen] = useState(false);
  const [ejecutandoAccion, setEjecutandoAccion] = useState(false);

  // Modal de registro de pago
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [pagoMonto, setPagoMonto] = useState<string>('');
  const [pagoFecha, setPagoFecha] = useState<string>(getHoyString());
  const [pagoMetodo, setPagoMetodo] = useState<string>('transferencia');
  const [pagoConfirmarExceso, setPagoConfirmarExceso] = useState(false);
  const [ejecutandoPago, setEjecutandoPago] = useState(false);
  const [errorPagoMsg, setErrorPagoMsg] = useState<string | null>(null);

  // Carga inicial y recarga del detalle
  const loadData = useCallback(async () => {
    if (isNaN(ordenId) || ordenId <= 0) {
      setErrorMsg('ID de orden de compra inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getOrdenCompraById(ordenId);
      if (res?.data) {
        setOrden(res.data);
      } else {
        setErrorMsg('No se encontró la orden de compra.');
      }
    } catch (err: unknown) {
      console.error('[OrdenCompraDetallePage] Error al cargar detalle:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Error al cargar la orden de compra.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [ordenId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejo de Errores de API
  const handleApiError = async (err: unknown, fallbackMsg: string) => {
    if (err instanceof ApiRequestError) {
      if (err.code === 'INVALID_ORDER_STATE') {
        setErrorMsg('El estado de la orden cambió. Se recargó la información actualizada.');
        await loadData();
        return;
      }
      if (err.code === 'ORDER_CANCELLED') {
        setErrorMsg('La orden fue cancelada; no se pueden realizar más pagos.');
        await loadData();
        return;
      }
      if (err.code === 'INVALID_INPUT' && err.details) {
        setErrorMsg(`Datos inválidos: ${JSON.stringify(err.details)}`);
        return;
      }
      setErrorMsg(err.message || fallbackMsg);
      return;
    }

    if (err instanceof Error) {
      setErrorMsg(err.message);
      return;
    }

    setErrorMsg(fallbackMsg);
  };

  // Confirmar orden ('borrador' -> 'confirmada')
  const handleConfirmar = async () => {
    if (!orden) return;
    setEjecutandoAccion(true);
    setErrorMsg(null);
    setExitoMsg(null);
    try {
      await confirmarOrdenCompra(orden.id);
      setModalConfirmarOpen(false);
      setExitoMsg('Orden de compra confirmada exitosamente.');
      await loadData();
    } catch (err) {
      console.error('[OrdenCompraDetallePage] Error al confirmar:', err);
      await handleApiError(err, 'No se pudo confirmar la orden.');
    } finally {
      setEjecutandoAccion(false);
    }
  };

  // Cancelar orden ('borrador' o 'confirmada' -> 'cancelada')
  const handleCancelar = async () => {
    if (!orden) return;
    setEjecutandoAccion(true);
    setErrorMsg(null);
    setExitoMsg(null);
    try {
      await cancelarOrdenCompra(orden.id);
      setModalCancelarOpen(false);
      setExitoMsg('Orden de compra cancelada.');
      await loadData();
    } catch (err) {
      console.error('[OrdenCompraDetallePage] Error al cancelar:', err);
      await handleApiError(err, 'No se pudo cancelar la orden.');
    } finally {
      setEjecutandoAccion(false);
    }
  };

  // Registrar Pago
  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orden) return;

    const montoNum = parseInt(pagoMonto, 10);
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorPagoMsg('El monto debe ser un entero positivo.');
      return;
    }

    if (!pagoFecha) {
      setErrorPagoMsg('La fecha de pago es requerida.');
      return;
    }

    const saldoActual = calcularSaldoOrden(orden.total, orden.pagos);
    if (montoNum > saldoActual && !pagoConfirmarExceso) {
      setErrorPagoMsg(
        `El monto ($${montoNum.toLocaleString('es-CL')}) supera el saldo pendiente ($${saldoActual.toLocaleString('es-CL')}). Marca la casilla para confirmar.`
      );
      return;
    }

    setEjecutandoPago(true);
    setErrorPagoMsg(null);
    try {
      const payload: CreatePagoProveedorPayload = {
        monto: montoNum,
        fecha_pago: pagoFecha,
        metodo: pagoMetodo || undefined,
      };

      await registrarPagoOrdenCompra(orden.id, payload);
      setModalPagoOpen(false);
      setPagoMonto('');
      setPagoConfirmarExceso(false);
      setExitoMsg('Pago registrado exitosamente.');
      await loadData();
    } catch (err) {
      console.error('[OrdenCompraDetallePage] Error al registrar pago:', err);
      if (err instanceof ApiRequestError) {
        if (err.code === 'INVALID_ORDER_STATE') {
          setErrorPagoMsg('La orden cambió de estado. Por favor revisa el detalle.');
          await loadData();
          return;
        }
        if (err.code === 'ORDER_CANCELLED') {
          setErrorPagoMsg('La orden fue cancelada; no admite nuevos pagos.');
          await loadData();
          return;
        }
        setErrorPagoMsg(err.message || 'Error al registrar el pago.');
        return;
      }
      setErrorPagoMsg('Error de conexión al registrar el pago.');
    } finally {
      setEjecutandoPago(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
        <p className="text-xs text-zinc-400 font-medium">Cargando orden de compra #{id}...</p>
      </div>
    );
  }

  if (errorMsg && !orden) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col p-4">
        <header className="py-3 max-w-3xl mx-auto w-full">
          <button
            onClick={() => navigate('/gestion/compras')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver a Órdenes</span>
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
          <h2 className="text-base font-bold text-white mb-1">No se pudo cargar la orden</h2>
          <p className="text-xs text-zinc-400 mb-4">{errorMsg}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!orden) return null;

  const totalPagos = (orden.pagos || []).reduce((acc, p) => acc + (p.monto || 0), 0);
  const saldoPendiente = calcularSaldoOrden(orden.total, orden.pagos);
  const badgeEstado = getEstadoBadge(orden.estado);
  const badgePago = getEstadoPagoBadge(orden.estado_pago);
  const pagoVencido = esPagoVencido(orden);
  const entregaDemorada = esEntregaDemorada(orden);

  const esBorrador = orden.estado === 'borrador';
  const esConfirmada = orden.estado === 'confirmada';
  const esRecibida = orden.estado === 'recibida';
  const esCancelada = orden.estado === 'cancelada';

  // El botón de pagos está disponible solo en 'confirmada' y 'recibida'
  const permitePagos = esConfirmada || esRecibida;

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header Fijo */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/gestion/compras')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-rose-400" />
            <h1 className="text-sm font-bold text-white">Orden #{orden.id}</h1>
          </div>

          <div className="flex items-center gap-2">
            {esBorrador && (
              <button
                onClick={() => navigate(`/gestion/compras/${orden.id}/editar`)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-zinc-700 shadow-md"
              >
                <Edit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}
            <button
              onClick={loadData}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              title="Refrescar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4">
        {/* Banner de Mensaje de Éxito o Error */}
        {exitoMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 text-emerald-300 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{exitoMsg}</span>
            </div>
            <button
              onClick={() => setExitoMsg(null)}
              className="p-1 hover:bg-emerald-500/20 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-rose-300 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 1. Cabecera y Estados */}
        <section className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-extrabold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20">
                  #{orden.id}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${badgeEstado.className}`}>
                  {badgeEstado.label}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${badgePago.className}`}>
                  {badgePago.label}
                </span>
              </div>
              <h2 className="text-lg font-black text-white flex items-center gap-2 pt-1">
                <Building2 className="w-5 h-5 text-zinc-400 shrink-0" />
                <span>{orden.proveedor_nombre || 'Proveedor no especificado'}</span>
              </h2>
              {orden.proveedor_rut && (
                <p className="text-xs text-zinc-400">RUT: {orden.proveedor_rut}</p>
              )}
            </div>

            {/* Badges de Alerta */}
            <div className="flex flex-col sm:items-end gap-1.5">
              {pagoVencido && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-3 py-1 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Pago Vencido
                </span>
              )}
              {entregaDemorada && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-xl">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  Entrega Demorada
                </span>
              )}
            </div>
          </div>

          {/* Grid de Fechas y Condiciones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-800 text-xs">
            <div className="space-y-0.5">
              <span className="text-[11px] text-zinc-400">Fecha Creación</span>
              <p className="font-semibold text-zinc-200">{formatFecha(orden.fecha_creacion)}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] text-zinc-400">Entrega Estimada</span>
              <p className="font-semibold text-zinc-200">
                {orden.fecha_entrega_estimada ? formatFecha(orden.fecha_entrega_estimada) : 'Sin fecha'}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] text-zinc-400">Condición de Pago</span>
              <p className="font-semibold text-zinc-200 capitalize">
                {orden.condicion_pago || 'contado'}
                {orden.condicion_pago === 'credito' && orden.fecha_vencimiento_pago && (
                  <span className="block text-[11px] text-zinc-400 font-normal">
                    Vencimiento: {formatFecha(orden.fecha_vencimiento_pago)}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Notas */}
          {orden.notas && (
            <div className="pt-3 border-t border-zinc-800 text-xs">
              <span className="text-[11px] text-zinc-400 block mb-0.5">Notas de la Orden:</span>
              <p className="text-zinc-300 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 whitespace-pre-line">
                {orden.notas}
              </p>
            </div>
          )}

          {/* Botones de Acción de Estado */}
          <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-zinc-800">
            {esBorrador && (
              <>
                <button
                  type="button"
                  onClick={() => setModalConfirmarOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirmar Orden</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalCancelarOpen(true)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-rose-900/40 text-rose-300 border border-zinc-700 hover:border-rose-700/60 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </>
            )}

            {esConfirmada && (
              <button
                type="button"
                onClick={() => setModalCancelarOpen(true)}
                className="px-4 py-2 bg-zinc-800 hover:bg-rose-900/40 text-rose-300 border border-zinc-700 hover:border-rose-700/60 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelar Orden</span>
              </button>
            )}

            {esRecibida && (
              <span className="text-xs text-zinc-400 italic">
                Orden recibida en depósito. Registra pagos o consulta el historial.
              </span>
            )}

            {esCancelada && (
              <span className="text-xs text-rose-400 font-medium">
                Esta orden fue cancelada y se encuentra cerrada.
              </span>
            )}
          </div>
        </section>

        {/* 2. Resumen Financiero y Saldo */}
        <section className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-lg">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
            Resumen Financiero
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4">
              <span className="text-[11px] font-medium text-zinc-400">Total Orden</span>
              <p className="text-xl font-black text-white mt-1">{formatCLP(orden.total)}</p>
            </div>

            {/* Total Pagado */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4">
              <span className="text-[11px] font-medium text-zinc-400">Total Pagado</span>
              <p className="text-xl font-black text-emerald-400 mt-1">{formatCLP(totalPagos)}</p>
            </div>

            {/* Saldo Pendiente */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4">
              <span className="text-[11px] font-medium text-zinc-400">Saldo Pendiente</span>
              <p
                className={`text-xl font-black mt-1 ${
                  saldoPendiente > 0 ? 'text-amber-400' : 'text-zinc-400'
                }`}
              >
                {formatCLP(saldoPendiente)}
              </p>
            </div>
          </div>
        </section>

        {/* 3. Líneas de la Orden */}
        <section className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Líneas de la Orden ({orden.lineas?.length || 0})</span>
            </h3>
          </div>

          <div className="space-y-2.5">
            {(!orden.lineas || orden.lineas.length === 0) ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No hay líneas en esta orden.</p>
            ) : (
              orden.lineas.map((linea, index) => (
                <div
                  key={linea.id || index}
                  className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-zinc-200">
                      {linea.producto_nombre || `Producto #${linea.id_producto}`}
                    </p>
                    {linea.producto_codigo && (
                      <p className="text-[11px] text-zinc-400 font-mono">
                        SKU: {linea.producto_codigo}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-right">
                    <div>
                      <span className="text-[11px] text-zinc-400 block">Cantidad</span>
                      <span className="font-bold text-white text-sm">{linea.cantidad}</span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block">Precio acordado</span>
                      <span className="font-semibold text-zinc-300">
                        {formatCLP(linea.precio_unitario_acordado)}
                      </span>
                    </div>

                    <div className="min-w-[80px]">
                      <span className="text-[11px] text-zinc-400 block">Subtotal</span>
                      <span className="font-black text-rose-400 text-sm">
                        {formatCLP(linea.subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 4. Sección de Pagos */}
        <section className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Historial de Pagos ({orden.pagos?.length || 0})</span>
            </h3>

            {permitePagos && (
              <button
                type="button"
                onClick={() => {
                  setErrorPagoMsg(null);
                  setPagoMonto(saldoPendiente > 0 ? String(saldoPendiente) : '');
                  setPagoConfirmarExceso(false);
                  setModalPagoOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Registrar Pago</span>
              </button>
            )}
          </div>

          {/* Lista de Pagos */}
          <div className="space-y-2.5">
            {(!orden.pagos || orden.pagos.length === 0) ? (
              <div className="text-center py-6 text-zinc-500 text-xs">
                No hay pagos registrados para esta orden.
              </div>
            ) : (
              orden.pagos.map((pago) => (
                <div
                  key={pago.id}
                  className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-emerald-400 text-sm">
                        {formatCLP(pago.monto)}
                      </span>
                      <span className="capitalize text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-[11px]">
                        {pago.metodo || 'No especificado'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Fecha de pago: <strong className="text-zinc-300 font-medium">{formatFecha(pago.fecha_pago)}</strong>
                    </p>
                  </div>

                  <div className="text-[11px] text-zinc-400 sm:text-right space-y-0.5">
                    <p className="flex items-center gap-1 sm:justify-end">
                      <User className="w-3 h-3 text-zinc-500" />
                      <span>{pago.registrado_por || 'Sistema'}</span>
                    </p>
                    <p className="text-zinc-500">Reg: {formatFechaHora(pago.creado_en)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* MODAL: Confirmar Orden */}
      {modalConfirmarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !ejecutandoAccion && setModalConfirmarOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl text-zinc-100 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h4 className="text-base font-bold text-white">¿Confirmar orden de compra?</h4>
              <p className="text-xs text-zinc-400">
                Al confirmar, la orden pasa a estado <strong>confirmada</strong> y <strong>ya no podrá ser editada</strong>.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={ejecutandoAccion}
                onClick={() => setModalConfirmarOpen(false)}
                className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={ejecutandoAccion}
                onClick={handleConfirmar}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-md"
              >
                {ejecutandoAccion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancelar Orden */}
      {modalCancelarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !ejecutandoAccion && setModalCancelarOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl text-zinc-100 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h4 className="text-base font-bold text-white">¿Cancelar orden de compra?</h4>
              <p className="text-xs text-zinc-400">
                Esta acción es <strong>irreversible</strong>. La orden pasará a estado <strong>cancelada</strong> y no se podrán registrar pagos ni recepciones.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={ejecutandoAccion}
                onClick={() => setModalCancelarOpen(false)}
                className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Descartar
              </button>
              <button
                type="button"
                disabled={ejecutandoAccion}
                onClick={handleCancelar}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-md"
              >
                {ejecutandoAccion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Sí, Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Pago */}
      {modalPagoOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !ejecutandoPago && setModalPagoOpen(false)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl text-zinc-100 animate-slide-up sm:animate-fade-in flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Registrar Pago a Proveedor</h3>
                  <p className="text-[11px] text-zinc-400">Orden #{orden.id} · Saldo actual: {formatCLP(saldoPendiente)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPagoOpen(false)}
                disabled={ejecutandoPago}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorPagoMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorPagoMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegistrarPago} className="space-y-3.5">
              {/* Monto */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Monto del pago (CLP) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 font-bold text-xs">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={pagoMonto}
                    onChange={(e) => setPagoMonto(e.target.value)}
                    placeholder="Ej: 50000"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Advertencia de monto mayor al saldo */}
              {Number(pagoMonto) > saldoPendiente && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-amber-300 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <p className="font-bold">El monto supera el saldo pendiente</p>
                      <p className="text-[11px] text-amber-400/80">
                        El monto ingresado ({formatCLP(Number(pagoMonto))}) es superior al saldo pendiente ({formatCLP(saldoPendiente)}).
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pagoConfirmarExceso}
                      onChange={(e) => setPagoConfirmarExceso(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0 w-4 h-4"
                    />
                    <span className="text-[11px] font-semibold text-white">
                      Confirmar que deseo registrar este pago por encima del saldo
                    </span>
                  </label>
                </div>
              )}

              {/* Fecha de Pago */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Fecha de pago *
                </label>
                <input
                  type="date"
                  required
                  value={pagoFecha}
                  onChange={(e) => setPagoFecha(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Método de pago
                </label>
                <select
                  value={pagoMetodo}
                  onChange={(e) => setPagoMetodo(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {/* Botones de Envío */}
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  disabled={ejecutandoPago}
                  onClick={() => setModalPagoOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={ejecutandoPago}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-md"
                >
                  {ejecutandoPago ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Guardar Pago'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
