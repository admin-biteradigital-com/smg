import { useState, useEffect } from 'react';

/**
 * Verificación síncrona de soporte base de escaneo de código de barras.
 * Requiere BarcodeDetector nativo y disponibilidad de mediaDevices.getUserMedia.
 */
export function isBarcodeScannerSupportedSync(): boolean {
  return (
    typeof window !== 'undefined' &&
    'BarcodeDetector' in window &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/**
 * Hook reutilizable para detectar soporte de escaneo por cámara en Modo Jornada.
 * Comprueba:
 * 1. Soporte de BarcodeDetector en el navegador.
 * 2. Disponibilidad de getUserMedia.
 * 3. Presencia de al menos una cámara física (videoinput) mediante enumerateDevices.
 */
export function useBarcodeScannerSupport(): boolean {
  const [supported, setSupported] = useState<boolean>(false);

  useEffect(() => {
    if (!isBarcodeScannerSupportedSync()) {
      setSupported(false);
      return;
    }

    if (navigator.mediaDevices?.enumerateDevices) {
      let isMounted = true;
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          if (!isMounted) return;
          const hasCamera = devices.some((d) => d.kind === 'videoinput');
          setSupported(hasCamera);
        })
        .catch(() => {
          if (isMounted) {
            setSupported(true);
          }
        });

      return () => {
        isMounted = false;
      };
    } else {
      setSupported(true);
    }
  }, []);

  return supported;
}

export interface ScanVentaItem {
  codigoProducto: string;
}

export interface ScanVentaResult<T extends ScanVentaItem> {
  codigoLimpio: string;
  encontrado: boolean;
  coincidencias: T[];
  mensaje: string | null;
}

/**
 * Función pura que procesa el resultado de un escaneo en EscenaVenta.
 * - Limpia el código escaneado.
 * - Busca coincidencias en el stock del vehículo comparando contra `codigoProducto`.
 * - Devuelve si fue encontrado, las coincidencias y el mensaje no bloqueante.
 */
export function procesarEscaneoVenta<T extends ScanVentaItem>(
  codigo: string,
  stock: T[]
): ScanVentaResult<T> {
  const codigoLimpio = codigo.trim();
  if (!codigoLimpio) {
    return {
      codigoLimpio: '',
      encontrado: false,
      coincidencias: [],
      mensaje: null,
    };
  }

  const q = codigoLimpio.toLowerCase();
  const coincidencias = stock.filter((item) => {
    const cp = (item.codigoProducto || '').toLowerCase();
    return cp === q || cp.includes(q);
  });

  const encontrado = coincidencias.length > 0;

  return {
    codigoLimpio,
    encontrado,
    coincidencias,
    mensaje: encontrado ? null : 'Este producto no está cargado en el vehículo',
  };
}
