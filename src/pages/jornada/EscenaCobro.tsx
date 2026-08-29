import { useState } from 'react';
import { useParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  CheckCircle2,
  DollarSign,
  Banknote,
  CreditCard,
  FileText,
  QrCode,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useJornada } from '@/contexts/JornadaContext';
import JornadaLayout from '@/components/layout/JornadaLayout';
import { api, ApiRequestError, NetworkError } from '@/lib/api';
import { enqueueOperation } from '@/lib/db';

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

// ─── EscenaCobroPage ──────────────────────────────────────────────────────────
// Escena 5 del Modo Jornada: /jornada/cobro/:ventaId
// Registra el cobro asociado a una orden de venta recién emitida.

export default function EscenaCobroPage() {
  const { ventaId } = useParams<{ ventaId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { jornada, loading: jornadaLoading } = useJornada();

  const stateData = (location.state as { total?: number; clienteNombre?: string } | null) ?? null;
  const initialTotal = stateData?.total ?? 0;
  const clienteNombre = stateData?.clienteNombre ?? '';

  const [montoCobro, setMontoCobro] = useState<string>(initialTotal > 0 ? String(initialTotal) : '');
  const [metodoCobro, setMetodoCobro] = useState<MetodoPagoCobro>('efectivo');
  const [numeroDocumento, setNumeroDocumento] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [errorCobro, setErrorCobro] = useState<string | null>(null);
  const [cobroExitoso, setCobroExitoso] = useState(false);

  // Guard: si no hay jornada activa → redirigir a /jornada
  if (!jornadaLoading && !jornada) {
    return <Navigate to="/jornada" replace />;
  }

  const metodos: Array<{ id: MetodoPagoCobro; label: string; icon: typeof Banknote }> = [
    { id: 'efectivo', label: 'Efectivo', icon: Banknote },
    { id: 'transferencia', label: 'Transferencia', icon: CreditCard },
    { id: 'cheque', label: 'Cheque', icon: FileText },
    { id: 'pago_online', label: 'Pago Online', icon: QrCode },
  ];

  // 1. Confirmar Cobro
  const handleConfirmarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventaId) return;

    const montoNum = Math.round(parseFloat(montoCobro));
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorCobro('Ingresa un monto válido mayor a 0.');
      return;
    }

    setEnviando(true);
    setErrorCobro(null);

    const paymentPayload: PaymentPayload = {
      idOrdenVenta: Number(ventaId),
      monto: montoNum,
      metodo: metodoCobro,
      numeroDocumento: numeroDocumento.trim() ? numeroDocumento.trim() : null,
    };

    try {
      if (!navigator.onLine) {
        throw new NetworkError('Sin conexión a internet');
      }

      await api.post<PaymentResponse>('/api/v1/sales/payments', paymentPayload);
      setCobroExitoso(true);
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        // Error de servidor (4xx/5xx) — mostrar error, no encolar
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
        // No hay confirmación del servidor — volver a la ruta
        navigate('/jornada/ruta');
      } catch (qErr) {
        console.error('[EscenaCobro] Error al encolar cobro offline:', qErr);
        setErrorCobro('No se pudo guardar el cobro en la cola offline. Intenta de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  };

  // 2. Saltar Cobro ("Cobrar después")
  const handleCobrarDespues = () => {
    navigate('/jornada/ruta');
  };

  // Vista de éxito tras cobro registrado
  if (cobroExitoso) {
    const metodoLabel = metodos.find((m) => m.id === metodoCobro)?.label || metodoCobro;

    return (
      <JornadaLayout titulo="Cobro Registrado" mostrarAtras={false}>
        <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-120px)] px-6 text-center animate-fade-in max-w-md mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 animate-pulse">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>

          <h2 className="text-2xl font-black text-white mb-1">
            ¡Cobro Registrado!
          </h2>

          <p className="text-xs text-zinc-400 leading-relaxed mb-4">
            Se registró el pago exitosamente para la venta #{ventaId}.
          </p>

          <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 my-2 space-y-2 text-left text-xs">
            {clienteNombre && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Cliente:</span>
                <span className="font-bold text-zinc-200 truncate max-w-[180px]">
                  {clienteNombre}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Nº Venta:</span>
              <span className="font-bold text-zinc-200">#{ventaId}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-800 pt-2">
              <span className="text-zinc-400">Monto cobrado:</span>
              <span className="font-black text-emerald-400 text-sm">
                ${(parseFloat(montoCobro) || 0).toLocaleString('es-CL')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Método de pago:</span>
              <span className="font-semibold text-zinc-300">{metodoLabel}</span>
            </div>
            {numeroDocumento && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Nº Documento:</span>
                <span className="font-mono text-zinc-300">{numeroDocumento}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/jornada/ruta')}
            className="w-full mt-6 py-3.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2"
          >
            <span>Volver a la Ruta</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </JornadaLayout>
    );
  }

  return (
    <JornadaLayout titulo="Registrar Cobro" mostrarAtras={false}>
      <div className="px-4 py-6 max-w-lg mx-auto pb-32">
        <form onSubmit={handleConfirmarCobro} className="space-y-5">
          {/* Banner informativo de venta creada */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-emerald-300">
                Venta #{ventaId} creada exitosamente
              </p>
              {clienteNombre && (
                <p className="text-[11px] text-emerald-400/80 truncate mt-0.5">
                  Cliente: {clienteNombre}
                </p>
              )}
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
                value={montoCobro}
                onChange={(e) => setMontoCobro(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xl font-bold text-white placeholder:text-zinc-700 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            {initialTotal > 0 && (
              <p className="text-[11px] text-zinc-500">
                Total de la venta: ${initialTotal.toLocaleString('es-CL')} (editable si es pago parcial)
              </p>
            )}
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

          {/* Nº Documento (opcional para transferencias / cheques) */}
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

          {/* Footer fijo con acciones */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
            <div className="max-w-lg mx-auto space-y-2">
              <button
                type="submit"
                disabled={enviando || !montoCobro || parseFloat(montoCobro) <= 0}
                className="w-full py-3.5 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] text-xs"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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
                disabled={enviando}
                className="w-full py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors text-center"
              >
                Cobrar después
              </button>
            </div>
          </div>
        </form>
      </div>
    </JornadaLayout>
  );
}
