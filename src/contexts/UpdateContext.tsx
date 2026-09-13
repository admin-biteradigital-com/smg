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
  /** Indica si el proceso de activación y recarga está actualmente en ejecución */
  isUpdating: boolean;
  /** Dispara la activación del nuevo Service Worker (SKIP_WAITING) y recarga limpia */
  applyUpdate: () => Promise<void>;
  /** Solicita manualmente comprobación de actualizaciones */
  checkForUpdate: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

// Intervalo de comprobación: 15 minutos en primer plano (ms)
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const isUpdatingRef = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateSWFnRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const lastCheckRef = useRef<number>(Date.now());

  const applyUpdate = useCallback(async () => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    setIsUpdating(true);

    console.info('[SW] Iniciando aplicación de actualización de Service Worker...');

    // Obtener registration fresca de navigator si la ref está vacía
    let reg = registrationRef.current;
    if (!reg && 'serviceWorker' in navigator) {
      try {
        reg = (await navigator.serviceWorker.getRegistration()) || null;
      } catch (err) {
        console.debug('[SW] Error al consultar registration:', err);
      }
    }

    const waitingSW = reg?.waiting;
    console.info('[SW] Estado de workers detectado:', {
      hasRegistration: Boolean(reg),
      hasWaitingSW: Boolean(waitingSW),
      waitingSWState: waitingSW?.state,
      hasController: Boolean(navigator.serviceWorker?.controller),
    });

    let reloaded = false;
    const triggerReload = () => {
      if (reloaded) return;
      reloaded = true;
      console.info('[SW] Recargando aplicación con la nueva versión...');
      window.location.reload();
    };

    // 1. Escuchar controllerchange si el browser lo emite
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          console.info('[SW] controllerchange recibido en applyUpdate.');
          triggerReload();
        },
        { once: true }
      );
    }

    // 2. Escuchar statechange en el Service Worker en espera hasta que pase a 'activated'
    if (waitingSW) {
      if (waitingSW.state === 'activated') {
        console.info('[SW] El waitingSW ya se encontraba en estado activated.');
        triggerReload();
        return;
      }
      waitingSW.addEventListener('statechange', () => {
        console.info('[SW] waitingSW statechange:', waitingSW.state);
        if (waitingSW.state === 'activated') {
          triggerReload();
        }
      });
    }

    // 3. Enviar SKIP_WAITING
    if (updateSWFnRef.current) {
      console.info('[SW] Invocando updateSWFnRef...');
      try {
        await updateSWFnRef.current(true);
      } catch (err) {
        console.warn('[SW] Error al invocar updateSW:', err);
      }
    }

    // También postMessage directo al worker en espera para máxima confiabilidad
    if (waitingSW) {
      console.info('[SW] Enviando mensaje SKIP_WAITING directo a waitingSW...');
      waitingSW.postMessage({ type: 'SKIP_WAITING' });
    }

    // 4. Fallback de seguridad (1200ms):
    // Como clientsClaim: false no emite controllerchange en documentos existentes,
    // si statechange tampoco dispara o se pierde, este timer fuerza la recarga de página.
    setTimeout(() => {
      if (!reloaded) {
        console.info('[SW] Timeout de seguridad alcanzado (1200ms). Forzando recarga...');
        triggerReload();
      }
    }, 1200);
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (registrationRef.current) {
      try {
        lastCheckRef.current = Date.now();
        console.info('[SW-DIAG] checkForUpdate() ejecutando reg.update()...');
        await registrationRef.current.update();
      } catch (err) {
        console.debug('[SW-DIAG] Error al verificar actualizaciones:', err);
      }
    }
  }, []);

  useEffect(() => {
    // 1. Registro del Service Worker controlado
    const updateSW = registerSW({
      onNeedRefresh() {
        console.info('[SW] onNeedRefresh disparado. Nueva versión lista en waiting.');
        setUpdateAvailable(true);
      },
      onOfflineReady() {
        console.info('[SIGLO] PWA lista para operación offline.');
      },
      onRegisteredSW(_url, reg) {
        if (reg) {
          console.info('[SW] onRegisteredSW:', { waiting: Boolean(reg.waiting), active: Boolean(reg.active) });
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
      console.info('[SW] controllerchange capturado. Nuevo controller:', navigator.serviceWorker?.controller?.scriptURL);
      if (refreshing) return;
      refreshing = true;
      console.info('[SW] Ejecutando window.location.reload()...');
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
    <UpdateContext.Provider value={{ updateAvailable, isUpdating, applyUpdate, checkForUpdate }}>
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
