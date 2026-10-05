import { Component, ErrorInfo, ReactNode } from 'react';
import type { ContextType } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  MapPin,
  Home,
  AlertTriangle,
  ChevronDown,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { UpdateContext } from '@/contexts/UpdateContext';
import {
  recoverViaUpdate,
  recoverViaReset,
  collectDiagnosticInfo,
  formatDiagnosticText,
} from '@/lib/recovery';
import type { DiagnosticInfo } from '@/lib/recovery';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  /** Mensaje descriptivo mostrado debajo del título. */
  fallbackMessage?: string;
  /** Ruta de retorno del botón "Volver". Default: /jornada/ruta */
  returnPath?: string;
  /** Texto del botón de retorno. Default: "Volver a la ruta" */
  returnLabel?: string;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface State {
  hasError: boolean;
  error: Error | null;
  // Recuperación
  isRecovering: boolean;
  showResetConfirm: boolean;
  isResetting: boolean;
  // Diagnóstico
  showDetails: boolean;
  detailsCopied: boolean;
  diagnosticInfo: DiagnosticInfo | null;
  isOnline: boolean;
}

/**
 * ADR-018: Error Boundary para capturar fallos de carga de chunks dinámicos
 * y errores de render en Modo Jornada y Modo Gestión.
 *
 * Evita la pantalla en blanco y ofrece una escalera de recuperación:
 * 1. "Actualizar la app" — activa SW en espera o recarga.
 * 2. "Restablecer archivos" — desregistra SW y borra Cache Storage (nunca IndexedDB).
 * 3. "Volver" — navegación completa a la ruta de retorno.
 *
 * Incluye detalles técnicos colapsables para diagnóstico remoto.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  static contextType = UpdateContext;
  declare context: ContextType<typeof UpdateContext>;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRecovering: false,
      showResetConfirm: false,
      isResetting: false,
      showDetails: false,
      detailsCopied: false,
      diagnosticInfo: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidMount() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnlineChange);
      window.addEventListener('offline', this.handleOnlineChange);
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineChange);
      window.removeEventListener('offline', this.handleOnlineChange);
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.fetchDiagnostics(error);
    console.error('[ChunkErrorBoundary] Error capturado en escena:', error, errorInfo);
  }

  handleOnlineChange = () => {
    this.setState({ isOnline: navigator.onLine });
  };

  fetchDiagnostics = async (error: Error) => {
    try {
      const diagnosticInfo = await collectDiagnosticInfo(error);
      const text = formatDiagnosticText(diagnosticInfo);
      console.error('[ChunkErrorBoundary] Diagnóstico:\n' + text);
      this.setState({ diagnosticInfo, isOnline: diagnosticInfo.isOnline });
    } catch {
      /* silenciar errores de diagnóstico para no causar un bucle */
    }
  };

  // ─── Nivel 1: Actualizar la app ──────────────────────────────────────────

  handleUpdateApp = async () => {
    this.setState({ isRecovering: true });
    try {
      await recoverViaUpdate(this.context ?? undefined);
    } catch (err) {
      console.error('[ChunkErrorBoundary] Error en recuperación nivel 1:', err);
      window.location.reload();
    }
  };

  // ─── Nivel 2: Restablecer archivos de la app ────────────────────────────

  handleResetRequest = () => {
    this.setState({ showResetConfirm: true });
  };

  handleResetConfirm = async () => {
    this.setState({ showResetConfirm: false, isResetting: true });
    try {
      await recoverViaReset();
    } catch (err) {
      console.error('[ChunkErrorBoundary] Error en recuperación nivel 2:', err);
      window.location.reload();
    }
  };

  handleResetCancel = () => {
    this.setState({ showResetConfirm: false });
  };

  // ─── Volver ──────────────────────────────────────────────────────────────

  handleReturn = () => {
    const target = this.props.returnPath || '/jornada/ruta';
    window.location.href = target;
  };

  // ─── Copiar detalles técnicos ────────────────────────────────────────────

  handleCopyDetails = async () => {
    if (!this.state.diagnosticInfo) return;
    try {
      const text = formatDiagnosticText(this.state.diagnosticInfo);
      await navigator.clipboard.writeText(text);
      this.setState({ detailsCopied: true });
      setTimeout(() => this.setState({ detailsCopied: false }), 2000);
    } catch {
      /* clipboard API no disponible en algunos contextos */
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const {
      isRecovering,
      showResetConfirm,
      isResetting,
      showDetails,
      detailsCopied,
      diagnosticInfo,
      isOnline,
    } = this.state;

    const returnLabel = this.props.returnLabel || 'Volver a la ruta';
    const isGestion = (this.props.returnPath ?? '').startsWith('/gestion');
    const ReturnIcon = isGestion ? Home : MapPin;
    const anyActionInProgress = isRecovering || isResetting;

    return (
      <div className="min-h-dvh bg-zinc-950 flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="w-full max-w-sm bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
          {/* Ícono de seguridad de datos */}
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-7 h-7" />
          </div>

          {/* Mensajes */}
          <div className="space-y-2">
            <h2 className="text-base font-bold text-white">
              Problema al cargar la pantalla
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {this.props.fallbackMessage ||
                'Hubo un problema al cargar la pantalla. Tus datos guardados están seguros en el dispositivo.'}
            </p>
          </div>

          {/* Banner de protección de datos locales */}
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-left flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-400 leading-normal">
              Las operaciones previas, folios y saldos de la jornada permanecen
              intactos en la memoria local del dispositivo.
            </p>
          </div>

          {/* ── Escalera de recuperación ─────────────────────────────────── */}
          <div className="space-y-2 pt-1">
            {/* Nivel 1: Actualizar la app */}
            <button
              type="button"
              disabled={anyActionInProgress}
              onClick={this.handleUpdateApp}
              className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-brand-500/10"
            >
              {isRecovering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>
                {isRecovering ? 'Actualizando...' : 'Actualizar la app'}
              </span>
            </button>

            {/* Nivel 2: Restablecer archivos de la app */}
            <button
              type="button"
              disabled={!isOnline || anyActionInProgress}
              onClick={this.handleResetRequest}
              className="w-full py-2.5 px-4 bg-zinc-800/80 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              {isResetting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span>
                {isResetting
                  ? 'Restableciendo...'
                  : 'Restablecer archivos de la app'}
              </span>
            </button>
            {!isOnline && (
              <p className="text-[10px] text-zinc-500 -mt-1">
                Requiere conexión a internet para volver a descargar la app.
              </p>
            )}

            {/* Volver a la ruta / al inicio */}
            <button
              type="button"
              disabled={anyActionInProgress}
              onClick={this.handleReturn}
              className="w-full py-2.5 px-4 bg-zinc-800/80 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <ReturnIcon className="w-3.5 h-3.5" />
              <span>{returnLabel}</span>
            </button>
          </div>

          {/* ── Detalles técnicos (colapsable) ──────────────────────────── */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() =>
                this.setState({ showDetails: !showDetails })
              }
              className="w-full flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors py-1"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${
                  showDetails ? 'rotate-180' : ''
                }`}
              />
              <span>Detalles técnicos</span>
            </button>

            {showDetails && diagnosticInfo && (
              <div className="mt-2 p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/60 text-left space-y-2">
                <pre className="text-[9px] text-zinc-500 leading-relaxed whitespace-pre-wrap break-all font-mono overflow-x-auto max-h-40 overflow-y-auto">
                  {formatDiagnosticText(diagnosticInfo)}
                </pre>
                <button
                  type="button"
                  onClick={this.handleCopyDetails}
                  className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  {detailsCopied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>
                    {detailsCopied ? 'Copiado' : 'Copiar detalles'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Diálogo de confirmación: Restablecer archivos ───────────── */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">
                  ¿Restablecer archivos de la app?
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Se descargarán nuevamente los archivos de la aplicación desde
                  el servidor. Las operaciones, folios y saldos guardados en el
                  dispositivo se conservan intactos.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={this.handleResetCancel}
                  className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={this.handleResetConfirm}
                  className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Restablecer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default ChunkErrorBoundary;
