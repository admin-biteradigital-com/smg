import { useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  AlertCircle,
  Loader2,
  RefreshCw,
  Barcode,
} from 'lucide-react';
import {
  useBarcodeScanner,
  isBarcodeScannerSupported,
  type BarcodeScanMode,
} from '@/hooks/useBarcodeScanner';

// TODO: BarcodeDetector no funciona en iOS Safari — evaluar @zxing/browser si se necesita soporte cross-browser

export { isBarcodeScannerSupported };

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (codigo: string) => void;
  title?: string;
  subtitle?: string;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras',
  subtitle = 'Captura con cámara',
}: BarcodeScannerModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    mode,
    setMode,
    videoRef,
    cameraLoading,
    cameraError,
    photoProcessing,
    photoError,
    startCamera,
    stopCamera,
    processImageFile,
    clearErrors,
  } = useBarcodeScanner({
    onScan: (codigo) => {
      onScan(codigo);
      onClose();
    },
  });

  // Manejo de apertura / cierre del modal
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      clearErrors();
      return;
    }

    if (mode === 'live') {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, mode, startCamera, stopCamera, clearErrors]);

  const handleSwitchMode = (newMode: BarcodeScanMode) => {
    if (newMode === mode) return;
    stopCamera();
    clearErrors();
    setMode(newMode);
    if (newMode === 'live' && isOpen) {
      startCamera();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Resetear input para permitir elegir el mismo archivo si se desea
    if (!file) return;

    await processImageFile(file);
  };

  const handleClose = () => {
    stopCamera();
    clearErrors();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      />

      {/* Panel Principal */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-slide-up sm:animate-fade-in text-zinc-100 flex flex-col max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{title}</h2>
              <p className="text-[11px] text-zinc-400">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
            title="Cerrar scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de Modo */}
        <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800/90">
          <button
            type="button"
            onClick={() => handleSwitchMode('live')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'live'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Cámara en vivo</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMode('photo')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'photo'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Foto única</span>
          </button>
        </div>

        {/* MODO 1: Cámara en Vivo */}
        {mode === 'live' && (
          <div className="space-y-3">
            <div className="relative aspect-video sm:aspect-square max-h-[300px] w-full bg-black rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Retículo de enfoque y escaneo */}
              {!cameraLoading && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  <div className="relative w-56 h-36 border-2 border-violet-400/80 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.35)] flex items-center justify-center">
                    {/* Esquinas destacadas */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-violet-300 rounded-tl" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-violet-300 rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-violet-300 rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-violet-300 rounded-br" />

                    {/* Línea láser de escaneo */}
                    <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-pulse shadow-[0_0_10px_rgba(167,139,250,0.9)]" />
                  </div>
                  <span className="text-[11px] text-zinc-300 font-medium mt-3 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
                    Apuntá la cámara al código de barras
                  </span>
                </div>
              )}

              {/* Estado de carga de cámara */}
              {cameraLoading && (
                <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center gap-2 text-zinc-400">
                  <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
                  <p className="text-xs">Iniciando cámara...</p>
                </div>
              )}

              {/* Estado de error de cámara */}
              {cameraError && (
                <div className="absolute inset-0 bg-zinc-950/95 p-6 flex flex-col items-center justify-center text-center gap-3 text-rose-400">
                  <AlertCircle className="w-8 h-8 shrink-0 text-rose-500" />
                  <p className="text-xs leading-relaxed max-w-xs">{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar cámara</span>
                  </button>
                </div>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 text-center">
              La detección es automática. Si tenés problemas con el enfoque, podés usar{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('photo')}
                className="text-violet-400 hover:text-violet-300 font-bold underline underline-offset-2 ml-0.5"
              >
                Foto única
              </button>
              .
            </p>
          </div>
        )}

        {/* MODO 2: Foto Única */}
        {mode === 'photo' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="p-6 border-2 border-dashed border-zinc-800 hover:border-violet-500/50 rounded-2xl bg-zinc-950/50 text-center space-y-3 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 mx-auto flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-xs font-bold text-zinc-200">
                  Captura o sube una fotografía
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-xs mx-auto">
                  Abre la app de cámara nativa para tomar una foto clara del código de barras.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoProcessing}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 inline-flex items-center gap-2"
              >
                {photoProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analizando imagen...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Tomar foto del código</span>
                  </>
                )}
              </button>
            </div>

            {/* Error de modo foto */}
            {photoError && (
              <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3.5 text-xs text-rose-400 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <p>{photoError}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
