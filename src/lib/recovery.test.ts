import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  recoverViaReset,
  collectDiagnosticInfo,
  formatDiagnosticText,
} from './recovery';

// ── ADR-018: Tests de recuperación y diagnóstico ──────────────────────────────

describe('ADR-018: Recuperación y diagnóstico', () => {
  // ── Gestión boundary captura errores ─────────────────────────────────────

  describe('ChunkErrorBoundary para Gestión', () => {
    it('captura un error de carga de chunk dinámico de Gestión y transiciona a estado de error', async () => {
      const { ChunkErrorBoundary } = await import(
        '@/components/common/ChunkErrorBoundary'
      );
      const err = new TypeError(
        'Failed to fetch dynamically imported module: /assets/GestionHomePage-abc123.js',
      );
      const state = ChunkErrorBoundary.getDerivedStateFromError(err);
      expect(state.hasError).toBe(true);
      expect(state.error).toBe(err);
    });

    it('captura errores de render genéricos (no solo chunks)', async () => {
      const { ChunkErrorBoundary } = await import(
        '@/components/common/ChunkErrorBoundary'
      );
      const err = new Error('Cannot read properties of null');
      const state = ChunkErrorBoundary.getDerivedStateFromError(err);
      expect(state.hasError).toBe(true);
      expect(state.error).toBe(err);
    });
  });

  // ── Nivel 2: recoverViaReset ─────────────────────────────────────────────

  describe('recoverViaReset (Nivel 2: Restablecer archivos)', () => {
    it('opera solo sobre Service Worker y Cache Storage, nunca sobre IndexedDB ni Storage APIs', () => {
      // Verificación estática del código fuente: la función no debe contener
      // referencias a indexedDB, localStorage ni sessionStorage.
      const sourceCode = recoverViaReset.toString();

      // DEBE operar sobre estos:
      expect(sourceCode).toContain('serviceWorker');
      expect(sourceCode).toContain('caches');

      // NUNCA debe tocar estos:
      expect(sourceCode).not.toContain('indexedDB');
      expect(sourceCode).not.toContain('localStorage');
      expect(sourceCode).not.toContain('sessionStorage');
      expect(sourceCode).not.toContain('deleteDatabase');
    });

    it('llama a unregister() y caches.delete() pero NO a indexedDB.deleteDatabase ni Storage.clear', async () => {
      // Preparar mocks de SW y Cache API
      const unregisterMock = vi.fn().mockResolvedValue(true);
      const cacheDeleteMock = vi.fn().mockResolvedValue(true);
      const reloadMock = vi.fn();

      const originalSW = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
      const originalCaches = Object.getOwnPropertyDescriptor(window, 'caches');
      const originalLocation = Object.getOwnPropertyDescriptor(window, 'location');

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistrations: vi.fn().mockResolvedValue([
            { unregister: unregisterMock },
          ]),
        },
        configurable: true,
      });

      Object.defineProperty(window, 'caches', {
        value: {
          keys: vi.fn().mockResolvedValue(['workbox-precache-v2', 'html-nav-cache']),
          delete: cacheDeleteMock,
        },
        configurable: true,
      });

      Object.defineProperty(window, 'location', {
        value: { ...window.location, reload: reloadMock },
        configurable: true,
        writable: true,
      });

      // Espiar Storage.clear (indexedDB no existe en happy-dom, verificado vía source code)
      const lsClearSpy = vi.spyOn(Storage.prototype, 'clear');

      await recoverViaReset();

      // Verificar que SÍ se llamaron las APIs correctas
      expect(unregisterMock).toHaveBeenCalledTimes(1);
      expect(cacheDeleteMock).toHaveBeenCalledWith('workbox-precache-v2');
      expect(cacheDeleteMock).toHaveBeenCalledWith('html-nav-cache');
      expect(reloadMock).toHaveBeenCalledTimes(1);

      // Verificar que NO se llamaron las APIs prohibidas
      expect(lsClearSpy).not.toHaveBeenCalled();
      // indexedDB.deleteDatabase verificado por test de source code arriba

      // Cleanup
      lsClearSpy.mockRestore();
      if (originalSW) Object.defineProperty(navigator, 'serviceWorker', originalSW);
      if (originalCaches) Object.defineProperty(window, 'caches', originalCaches);
      if (originalLocation) Object.defineProperty(window, 'location', originalLocation);
    });
  });

  // ── Nivel 2 deshabilitado sin conexión ───────────────────────────────────

  describe('Estado offline', () => {
    afterEach(() => {
      // Restaurar onLine real
      const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
      if (desc) Object.defineProperty(navigator, 'onLine', desc);
    });

    it('collectDiagnosticInfo reporta isOnline: false cuando navigator.onLine es false', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      const info = await collectDiagnosticInfo(new Error('test'));
      expect(info.isOnline).toBe(false);
    });

    it('collectDiagnosticInfo reporta isOnline: true cuando navigator.onLine es true', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });

      const info = await collectDiagnosticInfo(new Error('test'));
      expect(info.isOnline).toBe(true);
    });
  });

  // ── Detalles técnicos no incluyen datos sensibles ────────────────────────

  describe('Diagnóstico sin datos sensibles', () => {
    it('collectDiagnosticInfo y formatDiagnosticText no filtran tokens ni datos de sesión', async () => {
      // Plantar datos sensibles en los lugares comunes de almacenamiento
      localStorage.setItem('siglo_token', 'jwt_super_secret_token_123');
      sessionStorage.setItem('siglo_session', 'sensitive_session_data_456');

      const error = new Error('Chunk load failed');
      const info = await collectDiagnosticInfo(error);
      const text = formatDiagnosticText(info);

      // El texto diagnóstico no debe contener datos sensibles
      expect(text).not.toContain('jwt_super_secret_token_123');
      expect(text).not.toContain('sensitive_session_data_456');

      // La estructura de info tampoco debe contener datos sensibles
      const infoJson = JSON.stringify(info);
      expect(infoJson).not.toContain('jwt_super_secret_token_123');
      expect(infoJson).not.toContain('sensitive_session_data_456');

      // Cleanup
      localStorage.removeItem('siglo_token');
      sessionStorage.removeItem('siglo_session');
    });

    it('formatDiagnosticText incluye los campos esperados de diagnóstico', () => {
      const text = formatDiagnosticText({
        errorName: 'TypeError',
        errorMessage: 'Failed to fetch',
        errorStack: 'TypeError: Failed to fetch\n  at main.js:1',
        pathname: '/gestion/productos',
        buildId: 'abc1234 2026-10-04',
        isOnline: true,
        swController: true,
        swWaiting: false,
        swWaitingState: null,
        swActive: true,
        swActiveState: 'activated',
        userAgent: 'Mozilla/5.0',
      });

      expect(text).toContain('TypeError');
      expect(text).toContain('Failed to fetch');
      expect(text).toContain('/gestion/productos');
      expect(text).toContain('abc1234 2026-10-04');
      expect(text).toContain('Online: Sí');
      expect(text).toContain('SW Controller: Sí');
      expect(text).toContain('SW Waiting: No');
      expect(text).toContain('SW Active: Sí (activated)');
    });

    it('collectDiagnosticInfo no accede a localStorage, sessionStorage ni cookies', () => {
      // Verificación estática: el código fuente no contiene referencias
      // a almacenamiento de datos sensibles
      const sourceCode = collectDiagnosticInfo.toString();
      expect(sourceCode).not.toContain('localStorage');
      expect(sourceCode).not.toContain('sessionStorage');
      expect(sourceCode).not.toContain('cookie');
      expect(sourceCode).not.toContain('token');
    });
  });
});
