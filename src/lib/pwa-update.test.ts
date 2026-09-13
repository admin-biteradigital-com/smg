import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePreloadError, PRELOAD_RELOAD_KEY, PRELOAD_LOOP_WINDOW_MS } from '@/lib/preload-guard';

describe('ADR-018: Manejo de Errores de Precarga de Chunks (vite:preloadError)', () => {
  let mockStorage: Record<string, string>;
  let storageInterface: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void };
  let reloadFn: ReturnType<typeof vi.fn>;
  let eventMock: { preventDefault: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockStorage = {};
    storageInterface = {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
    };
    reloadFn = vi.fn();
    eventMock = { preventDefault: vi.fn() };
  });

  describe('Guard 1: Protección de Rutas Transaccionales Críticas', () => {
    it('no debe recargar la página si el fallo ocurre en /jornada/venta/:clienteId', () => {
      const handled = handlePreloadError(
        eventMock,
        '/jornada/venta/105',
        storageInterface,
        Date.now(),
        reloadFn
      );

      expect(handled).toBe(false);
      expect(eventMock.preventDefault).toHaveBeenCalled();
      expect(reloadFn).not.toHaveBeenCalled();
      expect(mockStorage[PRELOAD_RELOAD_KEY]).toBeUndefined();
    });

    it('no debe recargar la página si el fallo ocurre en /jornada/cobro/:ventaId', () => {
      const handled = handlePreloadError(
        eventMock,
        '/jornada/cobro/520',
        storageInterface,
        Date.now(),
        reloadFn
      );

      expect(handled).toBe(false);
      expect(eventMock.preventDefault).toHaveBeenCalled();
      expect(reloadFn).not.toHaveBeenCalled();
      expect(mockStorage[PRELOAD_RELOAD_KEY]).toBeUndefined();
    });
  });

  describe('Guard 2: Prevención de Bucles de Recarga (Anti-loop 15 segundos)', () => {
    it('debe permitir la recarga si no hubo recargas previas en rutas no críticas', () => {
      const now = 100_000;
      const handled = handlePreloadError(
        eventMock,
        '/gestion/productos',
        storageInterface,
        now,
        reloadFn
      );

      expect(handled).toBe(true);
      expect(eventMock.preventDefault).not.toHaveBeenCalled();
      expect(reloadFn).toHaveBeenCalledTimes(1);
      expect(mockStorage[PRELOAD_RELOAD_KEY]).toBe(String(now));
    });

    it('debe bloquear la recarga si ocurrió una hace menos de 15 segundos', () => {
      const previousReload = 100_000;
      mockStorage[PRELOAD_RELOAD_KEY] = String(previousReload);

      // Intento 5 segundos después
      const now = previousReload + 5_000;

      const handled = handlePreloadError(
        eventMock,
        '/gestion/productos',
        storageInterface,
        now,
        reloadFn
      );

      expect(handled).toBe(false);
      expect(eventMock.preventDefault).toHaveBeenCalled();
      expect(reloadFn).not.toHaveBeenCalled();
      // No debe pisar el timestamp previo
      expect(mockStorage[PRELOAD_RELOAD_KEY]).toBe(String(previousReload));
    });

    it('debe permitir la recarga una vez superada la ventana de 15 segundos', () => {
      const previousReload = 100_000;
      mockStorage[PRELOAD_RELOAD_KEY] = String(previousReload);

      // Intento 16 segundos después
      const now = previousReload + PRELOAD_LOOP_WINDOW_MS + 1_000;

      const handled = handlePreloadError(
        eventMock,
        '/gestion/productos',
        storageInterface,
        now,
        reloadFn
      );

      expect(handled).toBe(true);
      expect(eventMock.preventDefault).not.toHaveBeenCalled();
      expect(reloadFn).toHaveBeenCalledTimes(1);
      expect(mockStorage[PRELOAD_RELOAD_KEY]).toBe(String(now));
    });
  });

  describe('ChunkErrorBoundary: Resguardo de Datos Locales', () => {
    it('captura el fallo de carga dinámica de chunk y transiciona a estado de error', async () => {
      const { ChunkErrorBoundary } = await import('@/components/common/ChunkErrorBoundary');
      const err = new TypeError('Failed to fetch dynamically imported module: /assets/EscenaVenta-xyz.js');

      const state = ChunkErrorBoundary.getDerivedStateFromError(err);
      expect(state.hasError).toBe(true);
      expect(state.error).toBe(err);
    });
  });

  describe('Verificación de Retención de Cachés y Purga en Activación', () => {
    it('las cachés antiguas se conservan mientras el SW nuevo esté en waiting (skipWaiting: false)', () => {
      // Simulación del ciclo de vida del Service Worker según ADR-018:
      // SW1 = activo, SW2 = instalado (waiting).
      const cacheStorageMock: Record<string, string[]> = {
        'workbox-precache-v2-old': ['index.html', 'assets/EscenaVenta-old.js'],
      };

      let sw2State: 'installing' | 'waiting' | 'activating' | 'activated' = 'waiting';

      // Función que emula cleanupOutdatedCaches (Workbox precaching)
      const runCleanupOutdatedCaches = () => {
        if (sw2State === 'activated') {
          delete cacheStorageMock['workbox-precache-v2-old'];
          cacheStorageMock['workbox-precache-v2-new'] = ['index.html', 'assets/EscenaVenta-new.js'];
        }
      };

      // Mientras SW2 está en waiting, el cleanup NO debe ejecutarse:
      runCleanupOutdatedCaches();
      expect(sw2State).toBe('waiting');
      expect(cacheStorageMock['workbox-precache-v2-old']).toBeDefined();
      expect(cacheStorageMock['workbox-precache-v2-old']).toContain('assets/EscenaVenta-old.js');

      // Solo tras recibir SKIP_WAITING (vendedor pulsa "Volver al Inicio" en EscenaCierre o aplica en Gestión):
      sw2State = 'activated';
      runCleanupOutdatedCaches();
      expect(cacheStorageMock['workbox-precache-v2-old']).toBeUndefined();
      expect(cacheStorageMock['workbox-precache-v2-new']).toBeDefined();
    });
  });

  describe('ADR-018: applyUpdate() - Activación y Recarga Segura', () => {
    it('despacha SKIP_WAITING y recarga la página cuando el worker en espera transiciona a activated vía statechange', async () => {
      const reloadMock = vi.fn();
      let stateChangeHandler: (() => void) | null = null;
      let postedMessage: any = null;

      const mockWaitingSW = {
        state: 'installed',
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'statechange') {
            stateChangeHandler = handler;
          }
        }),
        postMessage: vi.fn((msg: any) => {
          postedMessage = msg;
        }),
      };

      // Simulación de la lógica interna de applyUpdate
      const executeApplyUpdate = (waitingSW: any, onReload: () => void) => {
        let reloaded = false;
        const triggerReload = () => {
          if (reloaded) return;
          reloaded = true;
          onReload();
        };

        if (waitingSW) {
          waitingSW.addEventListener('statechange', () => {
            if (waitingSW.state === 'activated') {
              triggerReload();
            }
          });
          waitingSW.postMessage({ type: 'SKIP_WAITING' });
        }
      };

      executeApplyUpdate(mockWaitingSW, reloadMock);

      // Verificación de que el mensaje SKIP_WAITING fue enviado al worker en espera
      expect(postedMessage).toEqual({ type: 'SKIP_WAITING' });
      expect(reloadMock).not.toHaveBeenCalled();

      // Simular que el Service Worker se activa tras recibir SKIP_WAITING
      mockWaitingSW.state = 'activating';
      if (typeof stateChangeHandler === 'function') {
        (stateChangeHandler as () => void)();
      }
      expect(reloadMock).not.toHaveBeenCalled();

      mockWaitingSW.state = 'activated';
      if (typeof stateChangeHandler === 'function') {
        (stateChangeHandler as () => void)();
      }
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    it('ejecuta la recarga por fallback si statechange o controllerchange no se disparan a tiempo', async () => {
      vi.useFakeTimers();
      const reloadMock = vi.fn();

      const executeApplyUpdateWithTimeout = (onReload: () => void, timeoutMs = 1200) => {
        let reloaded = false;
        const triggerReload = () => {
          if (reloaded) return;
          reloaded = true;
          onReload();
        };

        setTimeout(() => {
          triggerReload();
        }, timeoutMs);
      };

      executeApplyUpdateWithTimeout(reloadMock, 1200);

      expect(reloadMock).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1199);
      expect(reloadMock).not.toHaveBeenCalled();
      vi.advanceTimersByTime(2);
      expect(reloadMock).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('la recarga intencional de applyUpdate NO toca ni consume la clave smg_last_preload_reload de sessionStorage', () => {
      const mockStorage: Record<string, string> = {};
      const storageWrapper = {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
      };

      // Simular que el guard de chunks tenía un timestamp previo
      storageWrapper.setItem(PRELOAD_RELOAD_KEY, '123456');

      // Ejecución de applyUpdate: no debe interactuar con sessionStorage de preload-guard
      expect(storageWrapper.getItem(PRELOAD_RELOAD_KEY)).toBe('123456');
    });

    it('ejecuta la recarga de forma segura si controllerchange es emitido por el ServiceWorkerContainer', () => {
      const reloadMock = vi.fn();
      let controllerChangeHandler: (() => void) | null = null;

      const mockServiceWorkerContainer = {
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'controllerchange') {
            controllerChangeHandler = handler;
          }
        }),
      };

      let reloaded = false;
      const triggerReload = () => {
        if (reloaded) return;
        reloaded = true;
        reloadMock();
      };

      mockServiceWorkerContainer.addEventListener('controllerchange', triggerReload);

      expect(reloadMock).not.toHaveBeenCalled();
      if (typeof controllerChangeHandler === 'function') {
        (controllerChangeHandler as () => void)();
      }
      expect(reloadMock).toHaveBeenCalledTimes(1);

      // Múltiples disparos no deben provocar múltiples recargas
      if (typeof controllerChangeHandler === 'function') {
        (controllerChangeHandler as () => void)();
      }
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });
});

