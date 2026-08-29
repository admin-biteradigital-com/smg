import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Lock,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Interfaces de Respuesta de SIGLO API ─────────────────────────────────────

interface CheckoutResponse {
  url: string;
  token: string;
  referencia: string;
}

interface PaymentStatus {
  id: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'reembolsado' | 'expirado';
  monto: number;
  medioPago: string;
  proveedorPasarela: string;
}

interface PaymentStatusResponse {
  data: PaymentStatus;
}

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Params de retorno post-pago
  const pedidoIdParam = searchParams.get('pedido') || searchParams.get('pedido_id');
  const statusParam = searchParams.get('status');

  const [idPedidoInput, setIdPedidoInput] = useState(pedidoIdParam || '');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado para verificación de resultado
  const [statusLoading, setStatusLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);

  // Si hay un status en la URL (ej: /checkout?status=exito&pedido=XYZ), consultar estado a SIGLO API
  useEffect(() => {
    if (statusParam && pedidoIdParam) {
      consultarEstadoPago(pedidoIdParam);
    }
  }, [statusParam, pedidoIdParam]);

  const consultarEstadoPago = async (idPedido: string) => {
    setStatusLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get<PaymentStatusResponse>(`/api/v1/payments/${idPedido}/status`);
      setPaymentStatus(res.data);
    } catch (err: any) {
      console.error('Error al obtener estado del pago:', err);
      setErrorMsg(
        err?.message || 'No se pudo obtener el estado de la transacción. Intenta nuevamente.'
      );
    } finally {
      setStatusLoading(false);
    }
  };

  const handleIniciarWebpay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idPedidoInput.trim()) {
      setErrorMsg('Debes ingresar o seleccionar un ID de pedido válido.');
      return;
    }
    if (!aceptaTerminos) {
      setErrorMsg('Debes aceptar los términos de compra para continuar.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Iniciar checkout en SIGLO API (ADR-009 / Hosted Webpay Plus)
      const res = await api.post<CheckoutResponse>('/api/v1/payments/checkout', {
        idPedido: idPedidoInput.trim(),
      });

      if (!res.url || !res.token) {
        throw new Error('Respuesta de pasarela incompleta (falta URL o Token).');
      }

      // 2. Redirección Hosted/Redirect a Webpay Plus (Transbank)
      // En Webpay Plus redirect, se envía un formulario POST con `token_ws` a la URL provista por Webpay.
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = res.url;

      const hiddenToken = document.createElement('input');
      hiddenToken.type = 'hidden';
      hiddenToken.name = 'token_ws';
      hiddenToken.value = res.token;
      form.appendChild(hiddenToken);

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      console.error('Error al iniciar checkout Webpay:', err);
      setErrorMsg(
        err?.message || 'No se pudo conectar con Webpay Plus. Intenta nuevamente más tarde.'
      );
      setLoading(false);
    }
  };

  // ── Vista 1: Resultado del pago (si viene de redirect de vuelta) ──────────────

  if (statusParam) {
    const esExito = paymentStatus?.estado === 'aprobado';

    return (
      <div className="min-h-dvh bg-zinc-950 text-white flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center">
          {statusLoading ? (
            <div className="py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-zinc-400">Verificando resultado con Webpay Plus...</p>
            </div>
          ) : esExito ? (
            <>
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">¡Pago Aprobado!</h2>
                <p className="text-sm text-zinc-400">
                  Tu transacción mediante Webpay Plus ha sido procesada con éxito.
                </p>
              </div>

              {paymentStatus && (
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 text-left space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">ID Pago:</span>
                    <span className="text-zinc-200 font-bold">#{paymentStatus.id}</span>
                  </div>
                  {pedidoIdParam && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Pedido:</span>
                      <span className="text-zinc-200 font-bold">{pedidoIdParam}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Monto:</span>
                    <span className="text-emerald-400 font-bold">
                      ${paymentStatus.monto.toLocaleString('es-CL')} CLP
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Proveedor:</span>
                    <span className="text-zinc-300">{paymentStatus.proveedorPasarela} ({paymentStatus.medioPago})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Estado:</span>
                    <span className="text-emerald-400 uppercase font-bold">{paymentStatus.estado}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate('/catalogo')}
                className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98]"
              >
                Volver al Catálogo
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-rose-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Pago No Realizado</h2>
                <p className="text-sm text-zinc-400">
                  La transacción fue rechazada o cancelada en el portal de Webpay Plus.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigate('/checkout', { replace: true });
                  }}
                  className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 font-bold text-sm rounded-2xl transition-all"
                >
                  Reintentar Pago
                </button>
                <button
                  onClick={() => navigate('/catalogo')}
                  className="flex-1 py-3.5 bg-brand-600 hover:bg-brand-500 font-bold text-sm rounded-2xl transition-all"
                >
                  Ir al Catálogo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Vista 2: Formulario de inicio de checkout online Webpay ───────────────────

  return (
    <div className="min-h-dvh bg-zinc-950 text-white flex flex-col items-center justify-center px-4 py-8">
      {/* Container Principal */}
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Pago Online Directo</h2>
            <p className="text-xs text-zinc-400">Webpay Plus · Transbank (hosted redirect)</p>
          </div>
        </div>

        {/* Badge PCI / hosted warning */}
        <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 text-xs text-emerald-300">
          <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          <div>
            <p className="font-bold">Checkout 100% Seguro</p>
            <p className="text-[11px] text-emerald-400/80 leading-relaxed mt-0.5">
              Serás redirigido al sitio seguro de Transbank. SMG nunca almacena ni solicita datos de tus tarjetas.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleIniciarWebpay} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="idPedido" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              ID de Pedido Web
            </label>
            <div className="relative">
              <ShoppingBag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="idPedido"
                type="text"
                required
                value={idPedidoInput}
                onChange={(e) => {
                  setIdPedidoInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Ej: PED-2026-0042"
                className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm font-mono transition-all"
              />
            </div>
          </div>

          {/* Checkbox de términos (Obligatorio) */}
          <div className="flex items-start gap-3 pt-1">
            <input
              id="terminos"
              type="checkbox"
              checked={aceptaTerminos}
              onChange={(e) => {
                setAceptaTerminos(e.target.checked);
                if (errorMsg) setErrorMsg(null);
              }}
              className="mt-1 w-4 h-4 rounded border-zinc-800 text-brand-600 focus:ring-brand-500 bg-zinc-950 cursor-pointer"
            />
            <label htmlFor="terminos" className="text-xs text-zinc-400 leading-relaxed select-none cursor-pointer">
              Acepto los{' '}
              <a
                href="/terminos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 underline font-semibold hover:text-brand-300 inline-flex items-center gap-0.5"
              >
                términos y condiciones de compra <ExternalLink className="w-3 h-3" />
              </a>{' '}
              de SMG Distribuidora.
            </label>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3.5 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botón Pagar con Webpay */}
          <button
            type="submit"
            disabled={loading || !idPedidoInput.trim() || !aceptaTerminos}
            className="w-full py-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-2xl shadow-xl shadow-red-950/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Conectando con Webpay Plus...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Pagar con Webpay Plus
              </>
            )}
          </button>
        </form>

        {/* Footer explicativo */}
        <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
          Nota: Este pago es exclusivo para compras del sitio web. El registro de cobros en ruta por vendedores (efectivo/transferencia/cheque) se realiza de forma independiente en la app.
        </p>
      </div>
    </div>
  );
}
