import { useState, useRef, useCallback, useEffect } from 'react';

// TODO: BarcodeDetector no funciona en iOS Safari — evaluar @zxing/browser si se necesita soporte cross-browser
export const isBarcodeScannerSupported =
  typeof window !== 'undefined' && 'BarcodeDetector' in window;

export type BarcodeScanMode = 'live' | 'photo';

export interface UseBarcodeScannerOptions {
  onScan?: (code: string, format?: string) => void;
  targetFormats?: string[];
}

export const DEFAULT_TARGET_BARCODE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
  'qr_code',
];

export function useBarcodeScanner(options?: UseBarcodeScannerOptions) {
  const onScanCallback = options?.onScan;
  const targetFormats = options?.targetFormats || DEFAULT_TARGET_BARCODE_FORMATS;

  const [mode, setMode] = useState<BarcodeScanMode>('live');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Referencias para manejo seguro de cámara y bucle
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const onScanRef = useRef(onScanCallback);

  useEffect(() => {
    onScanRef.current = onScanCallback;
  }, [onScanCallback]);

  // ─── Liberar recursos de cámara y timers ────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  // ─── Instanciación segura de BarcodeDetector nativo ─────────────────────────
  const getDetector = useCallback(async (): Promise<BarcodeDetector | null> => {
    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
      return null;
    }
    if (detectorRef.current) {
      return detectorRef.current;
    }

    try {
      let formatsToUse: string[] | undefined;
      if (typeof window.BarcodeDetector?.getSupportedFormats === 'function') {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const filtered = targetFormats.filter((f) => supported.includes(f));
        if (filtered.length > 0) {
          formatsToUse = filtered;
        }
      }
      detectorRef.current = new (window.BarcodeDetector as any)(
        formatsToUse ? { formats: formatsToUse } : undefined
      );
      return detectorRef.current;
    } catch (err) {
      console.warn('[useBarcodeScanner] Fallback a BarcodeDetector sin formatos:', err);
      try {
        detectorRef.current = new (window.BarcodeDetector as any)();
        return detectorRef.current;
      } catch {
        return null;
      }
    }
  }, [targetFormats]);

  // ─── Bucle periódico de detección sobre video stream ─────────────────────────
  const startScanningLoop = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
    }

    setIsScanning(true);
    scanIntervalRef.current = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) {
        return;
      }

      try {
        const detector = await getDetector();
        if (!detector) return;

        const barcodes = await detector.detect(video);
        if (barcodes && barcodes.length > 0) {
          const first = barcodes[0];
          const raw = first.rawValue?.trim();
          if (raw) {
            // Detener la cámara inmediatamente para liberar recursos del hardware
            stopCamera();
            if (onScanRef.current) {
              onScanRef.current(raw, first.format);
            }
          }
        }
      } catch (err) {
        // Ignorar fallos de decodificación en frames intermedios de video
        console.debug('[useBarcodeScanner] Error decodificando frame:', err);
      }
    }, 300);
  }, [getDetector, stopCamera]);

  // ─── Iniciar cámara en vivo con getUserMedia ────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraLoading(true);
    setCameraError(null);

    stopCamera();

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setCameraLoading(false);
      setCameraError('El acceso a la cámara no está soportado en este navegador.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Preferir cámara trasera del dispositivo móvil
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (idealErr) {
        console.warn('[useBarcodeScanner] Fallback a cámara estándar:', idealErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraLoading(false);
      startScanningLoop();
    } catch (err: unknown) {
      console.error('[useBarcodeScanner] Error al acceder a la cámara:', err);
      setCameraLoading(false);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setCameraError(
          'Permiso de cámara denegado. Habilitá el acceso en tu navegador o usá el modo Foto única.'
        );
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setCameraError('No se encontró ninguna cámara disponible en este dispositivo.');
      } else {
        setCameraError(
          'No se pudo inicializar la cámara. Podés intentar con el modo Foto única.'
        );
      }
    }
  }, [startScanningLoop, stopCamera]);

  // ─── Procesar imagen en modo Foto Única ─────────────────────────────────────
  const processImageFile = useCallback(
    async (file: File): Promise<string | null> => {
      setPhotoProcessing(true);
      setPhotoError(null);

      try {
        const detector = await getDetector();
        if (!detector) {
          throw new Error('BarcodeDetector no está disponible en este entorno.');
        }

        let imageSource: CanvasImageSource | Blob;
        if (typeof createImageBitmap === 'function') {
          imageSource = await createImageBitmap(file);
        } else {
          imageSource = file;
        }

        const barcodes = await detector.detect(imageSource);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue?.trim()) {
          const first = barcodes[0];
          const raw = first.rawValue.trim();
          stopCamera();
          if (onScanRef.current) {
            onScanRef.current(raw, first.format);
          }
          return raw;
        } else {
          setPhotoError(
            'No se detectó ningún código en la imagen, probá de nuevo o ingresalo manualmente.'
          );
          return null;
        }
      } catch (err: unknown) {
        console.error('[useBarcodeScanner] Error al procesar foto:', err);
        setPhotoError(
          'No se pudo procesar la imagen seleccionada. Probá de nuevo o ingresalo manualmente.'
        );
        return null;
      } finally {
        setPhotoProcessing(false);
      }
    },
    [getDetector, stopCamera]
  );

  const clearErrors = useCallback(() => {
    setCameraError(null);
    setPhotoError(null);
  }, []);

  // Cleanup automático al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    isSupported: isBarcodeScannerSupported,
    mode,
    setMode,
    videoRef,
    cameraLoading,
    cameraError,
    photoProcessing,
    photoError,
    isScanning,
    startCamera,
    stopCamera,
    processImageFile,
    clearErrors,
  };
}
