// ── ADR-018: Funciones de recuperación y diagnóstico para ChunkErrorBoundary ───

// ─── Nivel 1: Actualizar la app ──────────────────────────────────────────────

/**
 * Intenta activar un Service Worker en espera (si existe), o buscar una
 * actualización nueva, o como último recurso recargar la página.
 * NO borra datos locales de ningún tipo.
 */
export async function recoverViaUpdate(
  updateCtx?: {
    updateAvailable: boolean;
    applyUpdate: () => Promise<void>;
    checkForUpdate: () => Promise<void>;
  },
): Promise<void> {
  try {
    // 1. Si el contexto de actualización indica que hay un SW en espera, usar applyUpdate()
    if (updateCtx?.updateAvailable) {
      await updateCtx.applyUpdate();
      // applyUpdate() maneja el reload internamente (con fallback de 1200ms)
      return;
    }

    // 2. Intentar detectar un SW en espera directamente vía navigator
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        activateWaitingAndReload(reg.waiting);
        return;
      }

      // 3. Si no hay SW en espera, chequear si hay actualización nueva
      if (reg) {
        await reg.update();
        // Esperar un momento para que se instale
        await new Promise((r) => setTimeout(r, 1000));
        if (reg.waiting) {
          activateWaitingAndReload(reg.waiting);
          return;
        }
      }
    }

    // 4. Fallback: recarga completa de navegación
    window.location.reload();
  } catch (err) {
    console.error('[Recovery] Error en recuperación nivel 1:', err);
    window.location.reload();
  }
}

function activateWaitingAndReload(waitingSW: ServiceWorker): void {
  let reloaded = false;
  const triggerReload = () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', triggerReload, {
      once: true,
    });
  }
  waitingSW.postMessage({ type: 'SKIP_WAITING' });

  // Fallback de seguridad si controllerchange no se emite (clientsClaim: false)
  setTimeout(triggerReload, 1500);
}

// ─── Nivel 2: Restablecer archivos de la app ─────────────────────────────────

/**
 * Desregistra todos los Service Workers y borra Cache Storage.
 *
 * NUNCA toca:
 * - IndexedDB (Dexie: jornadas, ventas, cobros, stock offline)
 * - localStorage
 * - sessionStorage
 */
export async function recoverViaReset(): Promise<void> {
  try {
    // 1. Desregistrar todos los Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }

    // 2. Borrar Cache Storage (solo archivos cacheados de la app)
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }

    // 3. Recarga limpia — el browser descargará todo de nuevo
    window.location.reload();
  } catch (err) {
    console.error('[Recovery] Error en recuperación nivel 2:', err);
    window.location.reload();
  }
}

// ─── Diagnóstico ─────────────────────────────────────────────────────────────

export interface DiagnosticInfo {
  errorName: string;
  errorMessage: string;
  errorStack: string;
  pathname: string;
  buildId: string;
  isOnline: boolean;
  swController: boolean;
  swWaiting: boolean;
  swWaitingState: string | null;
  swActive: boolean;
  swActiveState: string | null;
  userAgent: string;
}

/**
 * Recopila información diagnóstica del error y el estado del Service Worker.
 * NO accede a localStorage, sessionStorage, cookies ni IndexedDB.
 * NO incluye tokens, datos de sesión, ni datos de clientes/usuarios.
 */
export async function collectDiagnosticInfo(
  error: Error | null,
): Promise<DiagnosticInfo> {
  let swController = false;
  let swWaiting = false;
  let swWaitingState: string | null = null;
  let swActive = false;
  let swActiveState: string | null = null;

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    swController = Boolean(navigator.serviceWorker.controller);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        swWaiting = Boolean(reg.waiting);
        swWaitingState = reg.waiting?.state ?? null;
        swActive = Boolean(reg.active);
        swActiveState = reg.active?.state ?? null;
      }
    } catch {
      /* silenciar errores de consulta de SW */
    }
  }

  return {
    errorName: error?.name ?? 'Unknown',
    errorMessage: error?.message ?? 'Sin mensaje',
    errorStack: (error?.stack ?? '').split('\n').slice(0, 5).join('\n'),
    pathname:
      typeof window !== 'undefined' ? window.location.pathname : '',
    buildId:
      typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'N/A',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
    swController,
    swWaiting,
    swWaitingState,
    swActive,
    swActiveState,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}

/**
 * Formatea la información diagnóstica como texto plano para copiar/pegar.
 */
export function formatDiagnosticText(info: DiagnosticInfo): string {
  return [
    `Error: ${info.errorName}: ${info.errorMessage}`,
    `Stack:\n${info.errorStack}`,
    `Ruta: ${info.pathname}`,
    `Build: ${info.buildId}`,
    `Online: ${info.isOnline ? 'Sí' : 'No'}`,
    `SW Controller: ${info.swController ? 'Sí' : 'No'}`,
    `SW Waiting: ${info.swWaiting ? `Sí (${info.swWaitingState})` : 'No'}`,
    `SW Active: ${info.swActive ? `Sí (${info.swActiveState})` : 'No'}`,
    `UA: ${info.userAgent}`,
  ].join('\n');
}
