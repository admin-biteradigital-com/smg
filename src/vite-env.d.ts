/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// ── ADR-018: Build ID inyectado por Vite define (commit corto + fecha) ────────
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_SIGLO_API_URL: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_ENV: 'development' | 'staging' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ─── Barcode Detection API (W3C Draft / Chromium) ────────────────────────────
// TODO: BarcodeDetector no funciona en iOS Safari — evaluar @zxing/browser si se necesita soporte cross-browser

interface BarcodeDetectorOptions {
  formats?: string[];
}

interface DetectedBarcode {
  boundingBox: DOMRectReadOnly;
  cornerPoints: Array<{ x: number; y: number }>;
  format: string;
  rawValue: string;
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  static getSupportedFormats(): Promise<string[]>;
  detect(image: CanvasImageSource | Blob | ImageData): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}
