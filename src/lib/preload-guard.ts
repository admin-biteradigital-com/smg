// ── ADR-018: Red de seguridad ante errores de carga de chunks (vite:preloadError) ───

export const PRELOAD_RELOAD_KEY = 'smg_last_preload_reload';
export const PRELOAD_LOOP_WINDOW_MS = 15_000; // 15 segundos

/**
 * Maneja eventos de error al precargar chunks dinámicos en Vite.
 * Aplica dos guards estrictos:
 * 1. Guard de ruta: No recarga si estamos en /jornada/venta/* o /jornada/cobro/*
 *    para no interrumpir operaciones de campo activas.
 * 2. Guard anti-bucle: No recarga más de 1 vez cada 15 segundos vía sessionStorage.
 */
export function handlePreloadError(
  event: { preventDefault: () => void },
  pathname = typeof window !== 'undefined' ? window.location.pathname : '',
  storage: Pick<Storage, 'getItem' | 'setItem'> = typeof window !== 'undefined' ? window.sessionStorage : { getItem: () => null, setItem: () => {} },
  now = Date.now(),
  reloadFn: () => void = () => {
    if (typeof window !== 'undefined') window.location.reload();
  }
): boolean {
  // Guard 1: Rutas transaccionales de venta y cobro en Modo Jornada
  if (pathname.includes('/jornada/venta/') || pathname.includes('/jornada/cobro/')) {
    console.warn(
      `[Vite] Error de precarga en ruta transaccional (${pathname}). Se evita la recarga automática para resguardar los datos.`
    );
    event.preventDefault();
    return false;
  }

  // Guard 2: Prevención de bucles de recarga (15 segundos)
  const lastReload = parseInt(storage.getItem(PRELOAD_RELOAD_KEY) || '0', 10);
  if (now - lastReload < PRELOAD_LOOP_WINDOW_MS) {
    console.warn(
      `[Vite] Error de precarga reiterado dentro de la ventana de ${PRELOAD_LOOP_WINDOW_MS / 1000}s. Se evita la recarga automática.`
    );
    event.preventDefault();
    return false;
  }

  storage.setItem(PRELOAD_RELOAD_KEY, String(now));
  console.info(`[Vite] Error de precarga detectado en ${pathname}. Recargando aplicación...`);
  reloadFn();
  return true;
}
