import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  CloudOff,
  Wifi,
  AlertCircle,
  ChevronLeft,
  Send,
  Truck,
  ArrowRight,
  DollarSign,
  Banknote,
  CreditCard,
  FileText,
  QrCode,
} from 'lucide-react';
import { api, ApiRequestError, NetworkError } from '@/lib/api';
import { enqueueOperation, db } from '@/lib/db';
import { useBorradorPedido } from '@/hooks/useBorradorPedido';
import { useAuth } from '@/contexts/AuthContext';
import { LineaPedidoCard } from '@/components/pedido/LineaPedidoCard';

// ─── Payloads para el backend ──────────────────────────────────────────────────

interface OrderPayload {
  id_cliente: number;
  canal: 'app_vendedor';
  lineas: Array<{
    id_producto: number;
    cantidad: number;
    precio_unitario: number;
  }>;
  notas?: string;
}

interface VentaResponse {
  data: {
    id: number;
    total: number;
  };
  meta: {
    timestamp: string;
    version: string;
  };
}

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
  meta: {
    timestamp: string;
    version: string;
  };
}

type EstadoFlujo =
  | 'idle'
  | 'enviando_venta'
  | 'error_venta'
  | 'exito_venta'
  | 'cobrando'
  | 'enviando_cobro'
  | 'exito_cobro';

// ─── Pantalla de Confirmación y Cobro ─────────────────────────────────────────

export default function ConfirmarPedidoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    borrador,
    totalPedido,
    limpiarPedido,
  } = useBorradorPedido();

  const [estado, setEstado] = useState<EstadoFlujo>('idle');
  const [errorVentaMsg, setErrorVentaMsg] = useState('');
  const [isNoJornada, setIsNoJornada] = useState(false);
  const [encolado, setEncolado] = useState(false);

  // Datos de la venta confirmada
  const [ventaData, setVentaData] = useState<{ id: number; total: number } | null>(null);

  // Formulario de cobro
  const [montoCobro, setMontoCobro] = useState<string>('');
  const [metodoCobro, setMetodoCobro] = useState<MetodoPagoCobro>('efectivo');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [errorCobroMsg, setErrorCobroMsg] = useState('');
  const [cobroRealizado, setCobroRealizado] = useState(false);

  const isOnline = navigator.onLine;

  // 1. Confirmar Venta
  const handleConfirmarVenta = async () => {
    if (!borrador.cliente || borrador.lineas.length === 0) return;

    setEstado('enviando_venta');
    setErrorVentaMsg('');
    setIsNoJornada(false);

    const payload: OrderPayload = {
      id_cliente: Number(borrador.cliente.id),
      canal: 'app_vendedor',
      lineas: borrador.lineas.map((l) => ({
        id_producto: Number(l.id_producto),
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario),
      })),
      notas: borrador.notas || undefined,
    };

    try {
      if (!isOnline) {
        throw new NetworkError('Sin conexión a internet');
      }

      // Intentar envío directo a la API de ventas
      const res = await api.post<VentaResponse>('/api/v1/sales/sales', payload);

      // Marcar borrador como sincronizado
      if (borrador.borradorId != null) {
        await db.borradores_pedido
          .where('id')
          .equals(borrador.borradorId)
          .modify({ estado: 'sincronizado' });
      }

      const vId = res?.data?.id;
      const vTotal = res?.data?.total ?? totalPedido;

      setVentaData({ id: vId, total: vTotal });
      setMontoCobro(String(vTotal));
      setEncolado(false);
      setEstado('exito_venta');
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        setEstado('error_venta');
        if (err.code === 'NO_JORNADA_ABIERTA') {
          setIsNoJornada(true);
          setErrorVentaMsg(
            err.message ||
              'No hay jornada abierta para este vendedor — debe abrir jornada antes de registrar ventas'
          );
        } else {
          setIsNoJornada(false);
          setErrorVentaMsg(err.message || 'Error del servidor al procesar el pedido.');
        }
        return;
      }

      // Sin red o fallo de conexión → encolar para sync posterior
      try {
        await enqueueOperation({
          type: 'CREATE_PEDIDO',
          endpoint: '/api/v1/sales/sales',
          method: 'POST',
          payload,
          maxRetries: 5,
        });

        // Marcar borrador como encolado
        if (borrador.borradorId != null) {
          await db.borradores_pedido
            .where('id')
            .equals(borrador.borradorId)
            .modify({ estado: 'encolado' });
        }

        setEncolado(true);
        setEstado('exito_venta');
      } catch (qErr) {
        setEstado('error_venta');
        setIsNoJornada(false);
        setErrorVentaMsg('No se pudo guardar el pedido en la cola offline. Intenta de nuevo.');
        console.error('[ConfirmarPedido] Error al encolar:', qErr);
      }
    }
  };

  // 2. Enviar Cobro
  const handleConfirmarCobro = async () => {
    if (!ventaData?.id) return;

    const montoNum = parseFloat(montoCobro);
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorCobroMsg('Ingresa un monto válido mayor a 0');
      return;
    }

    setEstado('enviando_cobro');
    setErrorCobroMsg('');

    const paymentPayload: PaymentPayload = {
      idOrdenVenta: ventaData.id,
      monto: montoNum,
      metodo: metodoCobro,
      numeroDocumento: numeroDocumento.trim() ? numeroDocumento.trim() : null,
    };

    try {
      await api.post<PaymentResponse>('/api/v1/sales/payments', paymentPayload);
      setCobroRealizado(true);
      setEstado('exito_cobro');
    } catch (err: any) {
      console.error('[ConfirmarPedido] Error al registrar cobro:', err);
      setEstado('cobrando');
      setErrorCobroMsg(
        err.message || 'No se pudo registrar el cobro. Puedes reintentar o cobrar después.'
      );
    }
  };

  // 3. Omitir Cobro ("Cobrar después")
  const handleCobrarDespues = () => {
    setCobroRealizado(false);
    setEstado('exito_cobro');
  };

  // 4. Volver a Jornada (Limpiar y redirigir)
  const handleIrAJornada = async () => {
    await limpiarPedido();
    navigate('/jornada', { replace: true });
  };

  // ── Vista 4: Éxito Final (Cobro registrado o venta finalizada) ─────────────

  if (estado === 'exito_cobro') {
    const metodosLabels: Record<MetodoPagoCobro, string> = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia',
      cheque: 'Cheque',
      pago_online: 'Pago online',
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 animate-pulse">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>

        <h2 className="text-2xl font-black text-white mb-2">
          {cobroRealizado ? '¡Cobro registrado!' : '¡Venta finalizada!'}
        </h2>

        <p className="text-sm text-zinc-400 leading-relaxed max-w-xs mb-2">
          {cobroRealizado
            ? `Se registró el cobro para la orden #${ventaData?.id}.`
            : encolado
            ? 'El pedido quedó guardado en la cola offline y se sincronizará al reconectar.'
            : `La orden #${ventaData?.id ?? ''} fue registrada. El cobro quedó pendiente.`}
        </p>

        <div className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-2xl p-4 my-4 space-y-2 text-left text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Cliente:</span>
            <span className="font-bold text-zinc-200 truncate max-w-[180px]">
              {borrador.cliente?.razonSocial}
            </span>
          </div>
          {ventaData?.id && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Nº Venta:</span>
              <span className="font-bold text-zinc-200">#{ventaData.id}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-zinc-500">Total Venta:</span>
            <span className="font-bold text-emerald-400">
              ${(ventaData?.total ?? totalPedido).toLocaleString('es-CL')}
            </span>
          </div>
          {cobroRealizado && (
            <div className="flex justify-between border-t border-zinc-800 pt-2">
              <span className="text-zinc-500">Cobrado:</span>
              <span className="font-bold text-white">
                ${(parseFloat(montoCobro) || 0).toLocaleString('es-CL')}{' '}
                <span className="text-zinc-400 text-[11px]">({metodosLabels[metodoCobro]})</span>
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleIrAJornada}
          className="w-full max-w-xs py-3.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
        >
          Volver a Jornada
        </button>
      </div>
    );
  }

  // ── Vista 3: Formulario de Cobro ──────────────────────────────────────────

  if (estado === 'cobrando' || estado === 'enviando_cobro') {
    const metodos: Array<{ id: MetodoPagoCobro; label: string; icon: typeof Banknote }> = [
      { id: 'efectivo', label: 'Efectivo', icon: Banknote },
      { id: 'transferencia', label: 'Transferencia', icon: CreditCard },
      { id: 'cheque', label: 'Cheque', icon: FileText },
      { id: 'pago_online', label: 'Pago online', icon: QrCode },
    ];

    return (
      <div className="flex flex-col min-h-[calc(100vh-120px)] pb-36 animate-fade-in">
        {/* Header */}
        <div className="sticky top-14 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-100">Registrar Cobro</h2>
              <p className="text-[10px] text-zinc-500">
                Venta #{ventaData?.id} · {borrador.cliente?.razonSocial}
              </p>
            </div>
            <button
              onClick={handleCobrarDespues}
              disabled={estado === 'enviando_cobro'}
              className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-all"
            >
              Cobrar después
            </button>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 space-y-5">
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
                value={montoCobro}
                onChange={(e) => setMontoCobro(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xl font-bold text-white placeholder:text-zinc-700 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-zinc-500">
              Total venta: ${(ventaData?.total ?? totalPedido).toLocaleString('es-CL')} (editable para cobro parcial)
            </p>
          </section>

          {/* Método de pago */}
          <section className="space-y-2.5">
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
                        ? 'bg-brand-500/10 border-brand-500/40 text-brand-300 shadow-md shadow-brand-500/10'
                        : 'bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
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

          {/* Nº Documento (opcional para cheques/transferencias) */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
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

          {/* Error de Cobro */}
          {errorCobroMsg && (
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-400">
                <p className="font-bold">Error al registrar cobro</p>
                <p className="text-rose-400/80 mt-0.5">{errorCobroMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer fijo cobro */}
        <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-2">
          <div className="max-w-lg mx-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-2.5">
            <button
              onClick={handleConfirmarCobro}
              disabled={estado === 'enviando_cobro'}
              className="w-full py-3.5 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
            >
              {estado === 'enviando_cobro' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registrando cobro...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Confirmar Cobro
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCobrarDespues}
              disabled={estado === 'enviando_cobro'}
              className="w-full py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors text-center"
            >
              Omitir y cobrar después
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Vista 2: Éxito de Venta (Resumen + opción de cobrar) ───────────────────

  if (estado === 'exito_venta') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 animate-pulse">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>

        <h2 className="text-2xl font-black text-white mb-1">
          {encolado ? '¡Venta guardada!' : '¡Venta confirmada!'}
        </h2>

        <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mb-3">
          {encolado
            ? 'La venta quedó en la cola offline y se sincronizará al reconectar.'
            : `La orden #${ventaData?.id ?? ''} fue registrada y el stock del vehículo descontado.`}
        </p>

        {encolado && (
          <div className="flex items-center gap-2 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
            <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-400 font-semibold">En cola offline</p>
          </div>
        )}

        {/* Resumen de la venta */}
        <div className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-2xl p-4 my-3 space-y-2 text-left text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Cliente:</span>
            <span className="font-bold text-zinc-200 truncate max-w-[180px]">
              {borrador.cliente?.razonSocial}
            </span>
          </div>
          {ventaData?.id && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Nº Venta:</span>
              <span className="font-bold text-zinc-200">#{ventaData.id}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-zinc-800/80 pt-2">
            <span className="text-zinc-400">Total a pagar:</span>
            <span className="font-black text-emerald-400 text-sm">
              ${(ventaData?.total ?? totalPedido).toLocaleString('es-CL')}
            </span>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-2.5 mt-2">
          {ventaData?.id && isOnline ? (
            <>
              <button
                onClick={() => setEstado('cobrando')}
                className="w-full py-3.5 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
              >
                <DollarSign className="w-4 h-4" />
                Registrar Cobro
              </button>

              <button
                onClick={handleCobrarDespues}
                className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white text-xs font-bold rounded-2xl transition-all"
              >
                Cobrar después
              </button>
            </>
          ) : (
            <button
              onClick={handleIrAJornada}
              className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
            >
              Volver a Jornada
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Vista 1: Revisión y Confirmación de Venta (Inicial) ───────────────────

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] pb-28">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/pedidos/nuevo', { replace: true })}
            className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-xl transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-bold text-zinc-100">Confirmar Pedido</h2>
            <p className="text-[10px] text-zinc-500">
              {borrador.lineas.length} producto{borrador.lineas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5">
        {/* Cliente */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
            Cliente
          </p>
          <p className="text-sm font-bold text-zinc-100">{borrador.cliente?.razonSocial}</p>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">{borrador.cliente?.rut}</p>
        </section>

        {/* Líneas — sólo lectura */}
        <section className="space-y-2.5">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Artículos
          </p>
          {borrador.lineas.map((linea) => (
            <LineaPedidoCard
              key={linea.id_producto}
              linea={linea}
              onCantidadChange={() => {}}
              onEliminar={() => {}}
              readonly
            />
          ))}
        </section>

        {/* Notas */}
        {borrador.notas && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Notas
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">{borrador.notas}</p>
          </section>
        )}

        {/* Indicador de conectividad */}
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 border ${
            isOnline
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-amber-500/5 border-amber-500/20'
          }`}
        >
          {isOnline ? (
            <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <CloudOff className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <p className={`text-xs font-bold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isOnline ? 'Conectado' : 'Sin conexión'}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {isOnline
                ? 'El pedido se enviará directamente al sistema.'
                : 'El pedido se guardará en la cola offline y se sincronizará al reconectar.'}
            </p>
          </div>
        </div>

        {/* Error de venta */}
        {estado === 'error_venta' && (
          isNoJornada ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3 animate-fade-in shadow-lg">
              <div className="flex items-start gap-3 text-amber-400">
                <div className="p-2 bg-amber-500/20 rounded-xl shrink-0 mt-0.5">
                  <Truck className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Jornada No Iniciada
                  </h4>
                  <p className="text-xs text-amber-400/90 mt-1 leading-relaxed">
                    {errorVentaMsg}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/jornada')}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <span>Ir a abrir jornada</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-400">{errorVentaMsg}</p>
            </div>
          )
        )}
      </div>

      {/* Footer fijo: total + botón confirmar venta */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-2">
        <div className="max-w-lg mx-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-400">Total del pedido</p>
            <p className="text-xl font-black text-white">
              ${totalPedido.toLocaleString('es-CL')}
            </p>
          </div>

          <button
            onClick={handleConfirmarVenta}
            disabled={estado === 'enviando_venta' || !user}
            className="w-full py-3.5 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
          >
            {estado === 'enviando_venta' ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando venta...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {isOnline ? 'Confirmar y enviar' : 'Confirmar y encolar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
