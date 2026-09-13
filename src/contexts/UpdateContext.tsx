import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { registerSW } from 'virtual:pwa-register';

export interface UpdateContextType {
  /** Indica si hay un Service Worker nuevo instalado y esperando activación */
  updateAvailable: boolean;
  /** Dispara la activación del nuevo Service Worker (SKIP_WAITING) y recarga limpia */
  applyUpdate: () => void;
  /** Solicita manualmente comprobación de actualizaciones */
  checkForUpdate: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

// Intervalo de comprobación: 15 minutos en primer plano (ms)
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateSWFnRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const lastCheckRef = useRef<number>(Date.now());

  const applyUpdate = useCallback(() => {
    console.info('[SW] Aplicando actualización de Service Worker...');
    if (updateSWFnRef.current) {
      updateSWFnRef.current(true);
    } else if (registrationRef.current?.waiting) {
      registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (registrationRef.current) {
      try {
        lastCheckRef.current = Date.now();
        await registrationRef.current.update();
      } catch (err) {
        console.debug('[SW] Error al verificar actualizaciones:', err);
      }
    }
  }, []);

  useEffect(() => {
    // 1. Registro del Service Worker controlado
    const updateSW = registerSW({
      onNeedRefresh() {
        console.info('[SW] Nueva versión disponible en espera de activación diferida.');
        setUpdateAvailable(true);
      },
      onOfflineReady() {
        console.info('[SIGLO] PWA lista para operación offline.');
      },
      onRegisteredSW(_url, reg) {
        if (reg) {
          registrationRef.current = reg;
          // Si ya había un Service Worker en espera (ej: recarga previa de página):
          if (reg.waiting) {
            setUpdateAvailable(true);
          }
        }
      },
      onRegisterError(err) {
        console.error('[SW] Error al registrar Service Worker:', err);
      },
    });

    updateSWFnRef.current = updateSW;

    // Listener de controllerchange para recargar cuando el nuevo SW tome el control
    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    // 2. Chequeo periódico cada 15 minutos en primer plano, pausado en background
    let intervalId: number | undefined;

    const startInterval = () => {
      if (!intervalId) {
        intervalId = window.setInterval(() => {
          checkForUpdate();
        }, CHECK_INTERVAL_MS);
      }
    };

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastCheckRef.current;
        if (elapsed >= CHECK_INTERVAL_MS) {
          checkForUpdate();
        }
        startInterval();
      } else {
        stopInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (document.visibilityState === 'visible') {
      startInterval();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
      stopInterval();
    };
  }, [checkForUpdate]);

  return (
    <UpdateContext.Provider value={{ updateAvailable, applyUpdate, checkForUpdate }}>
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdate(): UpdateContextType {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate debe usarse dentro de un UpdateProvider');
  }
  return context;
}
