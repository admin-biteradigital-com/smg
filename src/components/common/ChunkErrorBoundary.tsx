import { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldCheck, RotateCcw, MapPin, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onRetry?: () => void;
  returnPath?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ADR-018: Error Boundary para capturar fallos de carga de chunks dinámicos
 * especialmente en rutas de venta y cobro (/jornada/venta/*, /jornada/cobro/*).
 *
 * Evita la pantalla en blanco y le garantiza al vendedor que sus datos
 * guardados en Dexie están 100% a salvo.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ChunkErrorBoundary] Error capturado en escena:', error, errorInfo);
  }

  handleRetry = () => {
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    this.setState({ hasError: false, error: null });
  };

  handleReturn = () => {
    const target = this.props.returnPath || '/jornada/ruta';
    window.location.href = target;
  };

  render() {
    if (this.state.hasError) {
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

            {/* Banner de protección Dexie */}
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-left flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-400 leading-normal">
                Las operaciones previas, folios y saldos de la jornada permanecen intactos en la memoria local del dispositivo.
              </p>
            </div>

            {/* Botones de acción */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-brand-500/10"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reintentar</span>
              </button>

              <button
                type="button"
                onClick={this.handleReturn}
                className="w-full py-2.5 px-4 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Volver a la ruta</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;
