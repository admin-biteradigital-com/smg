import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import {
  DollarSign,
  Banknote,
  CreditCard,
  FileText,
  QrCode,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Calendar,
  UserCheck,
  Building2,
  ArrowLeft,
  ShoppingBag,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useJornada } from '@/contexts/JornadaContext';
import JornadaLayout from '@/components/layout/JornadaLayout';
import { api, ApiRequestError, NetworkError, getVentasPendientesByCliente } from '@/lib/api';
import { db, enqueueOperation } from '@/lib/db';
import type { Cliente, Sucursal, VentaPendiente } from '@/types';

type MetodoPagoCobro = 'efectivo' | 'transferencia' | 'cheque' | 'pago_online';

interface PaymentPayload {
  idOrdenVenta: number;
  monto: number;
  metodo: MetodoPagoCobro;
  numeroDocumento: string | null;
}

interface PaymentResponse {
  data: {
    id: number;
  };
  meta?: unknown;
}

// ─── EscenaCobroSinVentaPage ──────────────────────────────────────────────────
// ADR-013 Fase 1: /jornada/cobro-pendiente/:clienteId
// Permite cobrar ventas pendientes de un cliente antes de emitir una nueva venta,
// o continuar directamente hacia la nueva venta o volver a la ruta.

export default function EscenaCobroSinVentaPage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const [searchParams] = useSearchParams();
  const sucursalId = searchParams.get('sucursalId');

  const navigate = useNavigate();
  const { jornada, loading: jornadaLoading } = useJornada();

  // Estados de datos
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [sucursal, setSucursal] = useState<Sucursal | null>(null);
  const [ventas, setVentas] = useState<VentaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Estados del formulario de cobro
  const [selectedVenta, setSelectedVenta] = useState<VentaPendiente | null>(null);
  const [montoCobro, setMontoCobro] = useState<string>('');
  const [metodoCobro, setMetodoCobro] = useState<MetodoPagoCobro>('efectivo');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [enviandoCobro, setEnviandoCobro] = useState(false);
  const [errorCobro, setErrorCobro] = useState<string | null>(null);
  const [cobroExitosoMsg, setCobroExitosoMsg] = useState<string | null>(null);

  // Redirigir si no hay jornada activa
  if (!jornadaLoading && !jornada) {
    return <Navigate to="/jornada" replace />;
  }

  // 1. Cargar cliente y sucursal desde Dexie
  useEffect(() => {
    async function loadClienteInfo() {
      if (!clienteId) return;
      try {
        const c = await db.clientes.get(clienteId);
        setCliente(c ?? null);

        if (sucursalId) {
          const s = await db.sucursales.get(sucursalId);
          setSucursal(s ?? null);
        }
      } catch (err) {
        console.error('[EscenaCobroSinVenta] Error al cargar cliente de Dexie:', err);
      }
    }
    loadClienteInfo();
  }, [clienteId, sucursalId]);

  // 2. Cargar ventas pendientes del cliente
  const fetchVentasPendientes = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    setErrorCarga(null);
    try {
      const res = await getVentasPendientesByCliente(Number(clienteId));
      setVentas(res.data || []);
    } catch (err: unknown) {
      console.error('[EscenaCobroSinVenta] Error al cargar ventas pendientes:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudieron cargar las ventas pendientes del cliente.';
      setErrorCarga(msg);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchVentasPendientes();
  }, [fetchVentasPendientes]);

  // Métodos de pago disponibles
  const metodos: Array<{ id: MetodoPagoCobro; label: string; icon: typeof Banknote }> = [
    { id: 'efectivo', label: 'Efectivo', icon: Banknote },
    { id: 'transferencia', label: 'Transferencia', icon: CreditCard },
    { id: 'cheque', label: 'Cheque', icon: FileText },
    { id: 'pago_online', label: 'Pago Online', icon: QrCode },
  ];

  // Iniciar cobro de una venta específica
  const handleAbrirCobro = (venta: VentaPendiente) => {
    setSelectedVenta(venta);
    setMontoCobro(String(venta.saldoRestante));
    setMetodoCobro('efectivo');
    setNumeroDocumento('');
    setErrorCobro(null);
    setCobroExitosoMsg(null);
  };

  const handleCancelarCobro = () => {
    setSelectedVenta(null);
    setErrorCobro(null);
  };

  // Navegar a nueva venta respetando sucursalId si existe
  const handleNuevaVenta = () => {
    if (!clienteId) return;
    const target = sucursalId
      ? `/jornada/venta/${clienteId}?sucursalId=${sucursalId}`
      : `/jornada/venta/${clienteId}`;
    navigate(target);
  };

  // Confirmar cobro
  const handleConfirmarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenta) return;

    const montoNum = Math.round(parseFloat(montoCobro));
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorCobro('Ingresa un monto válido mayor a 0.');
      return;
    }

    if (montoNum > selectedVenta.saldoRestante) {
      setErrorCobro(
        `El monto ($${montoNum.toLocaleString('es-CL')}) no puede exceder el saldo pendiente ($${selectedVenta.saldoRestante.toLocaleString('es-CL')}).`
      );
      return;
    }

    setEnviandoCobro(true);
    setErrorCobro(null);

    const paymentPayload: PaymentPayload = {
      idOrdenVenta: selectedVenta.id,
      monto: montoNum,
      metodo: metodoCobro,
      numeroDocumento: numeroDocumento.trim() ? numeroDocumento.trim() : null,
    };

    try {
      if (!navigator.onLine) {
        throw new NetworkError('Sin conexión a internet');
      }

      await api.post<PaymentResponse>('/api/v1/sales/payments', paymentPayload);

      const montoFormateado = montoNum.toLocaleString('es-CL');
      setCobroExitosoMsg(`Cobro de $${montoFormateado} registrado exitosamente para la Venta #${selectedVenta.id}.`);
      setSelectedVenta(null);

      // Refrescar lista de ventas pendientes
      const res = await getVentasPendientesByCliente(Number(clienteId));
      const updatedVentas = res.data || [];
      setVentas(updatedVentas);

      // Si ya no quedan ventas pendientes, redirigir automáticamente tras breve confirmación
      if (updatedVentas.length === 0) {
        setTimeout(() => {
          handleNuevaVenta();
        }, 1500);
      }
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        // Error de servidor — mostrar error, no encolar
        setErrorCobro(err.message || 'Error del servidor al registrar el cobro.');
        return;
      }

      // Sin red — encolar para sync posterior
      try {
        await enqueueOperation({
          type: 'CREATE_COBRO',
          endpoint: '/api/v1/sales/payments',
          method: 'POST',
          payload: paymentPayload,
          maxRetries: 5,
        });
        navigate('/jornada/ruta');
      } catch (qErr) {
        console.error('[EscenaCobroSinVenta] Error al encolar cobro offline:', qErr);
        setErrorCobro('No se pudo guardar el cobro en la cola offline. Intenta de nuevo.');
      }
    } finally {
      setEnviandoCobro(false);
    }
  };

  // Formateador de fecha
  const formatearFecha = (fechaStr: string) => {
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return fechaStr;
      return d.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return fechaStr;
    }
  };

  const totalDeuda = ventas.reduce((acc, v) => acc + (v.saldoRestante || 0), 0);

  return (
    <JornadaLayout titulo="Cobros Pendientes" mostrarAtras={false}>
      <div className="flex flex-col min-h-[calc(100dvh-57px)] pb-28 max-w-2xl mx-auto w-full">
        {/* Subheader: Info del Cliente */}
        <div className="bg-zinc-900/90 border-b border-zinc-800/60 px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h1 className="text-sm font-bold text-zinc-100 truncate">
                  {cliente?.razonSocial || 'Cargando cliente...'}
                </h1>
              </div>

              {cliente?.nombreFantasia && cliente.nombreFantasia !== cliente.razonSocial && (
                <p className="text-xs text-zinc-400 truncate mt-0.5 ml-9">
                  {cliente.nombreFantasia}
                </p>
              )}

              <div className="flex items-center gap-2 mt-1 ml-9">
                {cliente?.rut && (
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {cliente.rut}
                  </span>
                )}
                {sucursal && (
                  <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-zinc-500" />
                    {sucursal.nombre || 'Sucursal'}
                  </span>
                )}
              </div>
            </div>

            {/* Total deuda global del cliente */}
            {!loading && totalDeuda > 0 && (
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
                  Deuda Total
                </p>
                <p className="text-sm font-black text-amber-400 font-mono">
                  ${totalDeuda.toLocaleString('es-CL')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mensaje de confirmación de cobro exitoso */}
        {cobroExitosoMsg && (
          <div className="mx-4 mt-3 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-300">
              <p className="font-bold">¡Cobro registrado!</p>
              <p className="text-emerald-400/90 mt-0.5">{cobroExitosoMsg}</p>
              {ventas.length === 0 && (
                <p className="text-[11px] text-emerald-400/80 mt-1">
                  Redirigiendo automáticamente a nueva venta...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Contenido Principal: Formulario o Lista */}
        <div className="flex-1 px-4 py-4 space-y-3">
          {selectedVenta ? (
            /* ─── FORMULARIO DE COBRO PARA VENTA SELECCIONADA ─── */
            <form onSubmit={handleConfirmarCobro} className="space-y-4 animate-fade-in">
              <div className="bg-zinc-900 border border-brand-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <span className="text-xs font-bold text-zinc-200">
                      Cobrar Venta #{selectedVenta.id}
                    </span>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      {formatearFecha(selectedVenta.fechaVenta)}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {selectedVenta.estadoCobro === 'cobrado_parcial' ? 'Cobro Parcial' : 'Pendiente'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-1">
                  <div>
                    <span className="text-[11px] text-zinc-500">Monto total:</span>
                    <p className="font-semibold text-zinc-300">
                      ${selectedVenta.montoTotal.toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500">Saldo pendiente:</span>
                    <p className="font-bold text-amber-400 font-mono">
                      ${selectedVenta.saldoRestante.toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Monto a Cobrar */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Monto a cobrar
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max={selectedVenta.saldoRestante}
                    value={montoCobro}
                    onChange={(e) => setMontoCobro(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xl font-bold text-white placeholder:text-zinc-700 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Saldo sugerido: ${selectedVenta.saldoRestante.toLocaleString('es-CL')} (editable para cobro parcial)
                </p>
              </section>

              {/* Selector de Método de Pago */}
              <section className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Método de pago
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {metodos.map((m) => {
                    const Icon = m.icon;
                    const isSelected = metodoCobro === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetodoCobro(m.id)}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-brand-500/10 border-brand-500/50 text-brand-300 shadow-md shadow-brand-500/10'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl ${
                            isSelected
                              ? 'bg-brand-500/20 text-brand-400'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Nº Documento (opcional para transferencia o cheque) */}
              {(metodoCobro === 'transferencia' || metodoCobro === 'cheque') && (
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2 animate-fade-in">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Nº Comprobante / Cheque <span className="text-zinc-600 font-normal lowercase">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    placeholder="Ej: Transf. 98421, Cheque 004128"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </section>
              )}

              {/* Error de Cobro */}
              {errorCobro && (
                <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-400">
                    <p className="font-bold">Error al registrar cobro</p>
                    <p className="text-rose-400/90 mt-0.5">{errorCobro}</p>
                  </div>
                </div>
              )}

              {/* Botones de acción del formulario */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={enviandoCobro || !montoCobro || parseFloat(montoCobro) <= 0}
                  className="w-full py-3.5 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] text-xs"
                >
                  {enviandoCobro ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registrando cobro...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Confirmar Cobro de ${(parseFloat(montoCobro) || 0).toLocaleString('es-CL')}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancelarCobro}
                  disabled={enviandoCobro}
                  className="w-full py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors text-center"
                >
                  Cancelar y volver al listado
                </button>
              </div>
            </form>
          ) : (
            /* ─── LISTADO DE VENTAS PENDIENTES ─── */
            <>
              {loading ? (
                // Skeletons
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 animate-pulse"
                  >
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-zinc-800 rounded w-1/3" />
                      <div className="h-4 bg-zinc-800 rounded w-1/5" />
                    </div>
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                    <div className="h-6 bg-zinc-800 rounded w-2/3" />
                  </div>
                ))
              ) : errorCarga ? (
                // Error de carga
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
                  <AlertCircle className="w-8 h-8 text-rose-400" />
                  <div>
                    <p className="text-xs font-bold text-zinc-200">Error al cargar cobros pendientes</p>
                    <p className="text-[11px] text-zinc-500 mt-1">{errorCarga}</p>
                  </div>
                  <button
                    onClick={fetchVentasPendientes}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reintentar
                  </button>
                </div>
              ) : ventas.length === 0 ? (
                // Sin ventas pendientes (deuda saldada)
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-zinc-100">Sin deudas pendientes</p>
                    <p className="text-xs text-zinc-400 max-w-xs">
                      Este cliente no tiene ventas pendientes de pago. Puedes iniciar una nueva venta.
                    </p>
                  </div>
                  <button
                    onClick={handleNuevaVenta}
                    className="px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-brand-500/20"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Iniciar Nueva Venta
                  </button>
                </div>
              ) : (
                // Listado de ventas
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Ventas pendientes ({ventas.length})
                    </p>
                    <span className="text-[11px] text-zinc-500">
                      Selecciona una venta para cobrar
                    </span>
                  </div>

                  {ventas.map((venta) => {
                    const isParcial = venta.estadoCobro === 'cobrado_parcial';

                    return (
                      <div
                        key={venta.id}
                        className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 space-y-3 transition-all"
                      >
                        {/* Cabecera de la venta */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-zinc-100 font-mono">
                              Venta #{venta.id}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                isParcial
                                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                              }`}
                            >
                              {isParcial ? 'Cobro Parcial' : 'Pendiente'}
                            </span>
                          </div>

                          <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            {formatearFecha(venta.fechaVenta)}
                          </span>
                        </div>

                        {/* Desglose de montos */}
                        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                              Monto Total
                            </span>
                            <p className="font-semibold text-zinc-300 mt-0.5">
                              ${venta.montoTotal.toLocaleString('es-CL')}
                            </p>
                          </div>

                          {isParcial && venta.totalPagado > 0 && (
                            <div>
                              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                                Ya Pagado
                              </span>
                              <p className="font-semibold text-emerald-400 mt-0.5">
                                ${venta.totalPagado.toLocaleString('es-CL')}
                              </p>
                            </div>
                          )}

                          <div className={isParcial ? 'col-span-2 border-t border-zinc-800/60 pt-2 flex justify-between items-center' : ''}>
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                              Saldo Restante:
                            </span>
                            <p className="text-base font-black text-amber-400 font-mono mt-0.5">
                              ${venta.saldoRestante.toLocaleString('es-CL')}
                            </p>
                          </div>
                        </div>

                        {/* Botón Cobrar esta venta */}
                        <button
                          onClick={() => handleAbrirCobro(venta)}
                          className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md shadow-brand-500/10"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Cobrar Venta #{venta.id}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer fijo (visible cuando no se está editando el formulario de cobro) */}
        {!selectedVenta && (
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/jornada/ruta')}
                className="px-4 py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-700/80 text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
                Volver
              </button>

              <button
                type="button"
                onClick={handleNuevaVenta}
                className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Nueva Venta</span>
                <ChevronRight className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>
        )}
      </div>
    </JornadaLayout>
  );
}
