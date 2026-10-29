import type { OfflineQueueItem } from '@/types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface StockServidorLote {
  idLote?: number;
  idProducto: number;
  codigoProducto?: string;
  nombreProducto?: string;
  cantidadCargada?: number;
  cantidadDisponible: number;
  unidadMedida?: string;
  numeroLote?: string;
  fechaVencimiento?: string;
}

export interface LineaVentaLocal {
  id_producto: number;
  cantidad: number;
  precio_unitario?: number;
}

export interface VentaLocalParaStock {
  id?: string | number;
  estado?: 'pending' | 'syncing' | 'failed' | 'conflict' | 'confirmada';
  lineas: LineaVentaLocal[];
  timestampConfirmacion?: number; // Requerido para estado 'confirmada'
}

export interface StockProductoAgrupado {
  idProducto: number;
  codigoProducto: string;
  nombreProducto: string;
  unidadMedida: string;
  cantidadDisponible: number;
  totalStockServidor: number;
  descuentoLocal: number;
  proximoVencimiento?: string;
  lotesCount: number;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

export const ULTIMO_REFRESCO_JORNADA_KEY = 'siglo_ultimo_refresco_jornada';
export const VENTAS_CONFIRMADAS_KEY = 'siglo_ventas_confirmadas';

// ─── Funciones Puras (D1 y D2) ────────────────────────────────────────────────

/**
 * Función pura de cálculo de stock disponible (D1).
 *
 * Salida: disponible por producto = Σ lotes del servidor − Σ cantidades de las ventas que el servidor todavía no refleja.
 *
 * Reglas de deduplicación y no contar dos veces:
 * 1. Ventas en cola local (pending, syncing, failed, conflict):
 *    Siempre se descuentan. Una venta fallida igual se entregó físicamente en campo,
 *    por lo que la mercadería ya no está en el vehículo.
 * 2. Ventas confirmadas (online o sincronizadas):
 *    Se descuentan mientras timestampConfirmacion > ultimoRefrescoTimestamp.
 *    Una vez que ocurre un refresco posterior (ultimoRefrescoTimestamp >= timestampConfirmacion),
 *    el servidor ya incluye ese descuento en su respuesta, por lo que deja de descontarse localmente.
 *
 * Garantía: en ningún momento el stock mostrado puede ser mayor que el real.
 */
export function calcularStockDisponible(
  stockServidor: StockServidorLote[],
  ventasLocales: VentaLocalParaStock[],
  ultimoRefrescoTimestamp?: number
): Map<number, number> {
  // 1. Sumar stock del servidor agrupado por producto
  const serverMap = new Map<number, number>();
  for (const lote of stockServidor) {
    const actual = serverMap.get(lote.idProducto) ?? 0;
    serverMap.set(lote.idProducto, actual + (lote.cantidadDisponible ?? 0));
  }

  // 2. Sumar descuentos de ventas locales que el servidor aún no refleja
  const descuentosMap = new Map<number, number>();
  for (const venta of ventasLocales) {
    let debeDescontar = false;

    if (venta.estado === 'confirmada') {
      if (
        ultimoRefrescoTimestamp === undefined ||
        (venta.timestampConfirmacion !== undefined &&
          venta.timestampConfirmacion > ultimoRefrescoTimestamp)
      ) {
        debeDescontar = true;
      }
    } else {
      // pending, syncing, failed, conflict o no especificado:
      // se descuentan porque salieron físicamente del vehículo y no están en el stock devuelto por el servidor
      debeDescontar = true;
    }

    if (debeDescontar && Array.isArray(venta.lineas)) {
      for (const linea of venta.lineas) {
        const idProd = Number(linea.id_producto);
        const cant = Number(linea.cantidad) || 0;
        if (idProd && cant > 0) {
          const actual = descuentosMap.get(idProd) ?? 0;
          descuentosMap.set(idProd, actual + cant);
        }
      }
    }
  }

  // 3. Disponible por producto = Σ lotes del servidor − Σ cantidades locales
  const disponibleMap = new Map<number, number>();
  for (const [idProducto, totalServidor] of serverMap.entries()) {
    const descuento = descuentosMap.get(idProducto) ?? 0;
    disponibleMap.set(idProducto, Math.max(0, totalServidor - descuento));
  }

  return disponibleMap;
}

/**
 * Función pura que agrupa las filas de lotes del servidor en tarjetas por producto (D2).
 * - Una tarjeta por producto.
 * - Cantidad disponible calculada desde el mapa de stock disponible.
 * - Vencimiento más próximo (FEFO) entre los lotes cargados.
 */
export function agruparStockPorProducto(
  stockServidor: StockServidorLote[],
  stockDisponibleMap: Map<number, number>
): StockProductoAgrupado[] {
  const productosMap = new Map<
    number,
    {
      idProducto: number;
      codigoProducto: string;
      nombreProducto: string;
      unidadMedida: string;
      totalStockServidor: number;
      lotes: StockServidorLote[];
    }
  >();

  for (const lote of stockServidor) {
    const existing = productosMap.get(lote.idProducto);
    if (!existing) {
      productosMap.set(lote.idProducto, {
        idProducto: lote.idProducto,
        codigoProducto: lote.codigoProducto || String(lote.idProducto),
        nombreProducto: lote.nombreProducto || `Producto #${lote.idProducto}`,
        unidadMedida: lote.unidadMedida || 'unidad',
        totalStockServidor: lote.cantidadDisponible ?? 0,
        lotes: [lote],
      });
    } else {
      existing.totalStockServidor += lote.cantidadDisponible ?? 0;
      existing.lotes.push(lote);
      if ((!existing.codigoProducto || existing.codigoProducto === String(existing.idProducto)) && lote.codigoProducto) {
        existing.codigoProducto = lote.codigoProducto;
      }
    }
  }

  const resultado: StockProductoAgrupado[] = [];
  for (const [idProducto, info] of productosMap.entries()) {
    const cantidadDisponible = stockDisponibleMap.get(idProducto) ?? Math.max(0, info.totalStockServidor);
    const descuentoLocal = Math.max(0, info.totalStockServidor - cantidadDisponible);

    // Encontrar vencimiento más próximo (FEFO): lote con fecha más temprana
    const lotesConVencimiento = info.lotes
      .filter((l) => Boolean(l.fechaVencimiento))
      .sort((a, b) => (a.fechaVencimiento || '').localeCompare(b.fechaVencimiento || ''));

    const proximoVencimiento = lotesConVencimiento[0]?.fechaVencimiento;

    resultado.push({
      idProducto,
      codigoProducto: info.codigoProducto,
      nombreProducto: info.nombreProducto,
      unidadMedida: info.unidadMedida,
      cantidadDisponible,
      totalStockServidor: info.totalStockServidor,
      descuentoLocal,
      proximoVencimiento,
      lotesCount: info.lotes.length,
    });
  }

  return resultado;
}

// ─── Registro de Ventas Confirmadas y Timestamp de Refresco ──────────────────

export interface RegistroVentaConfirmada {
  id: string;
  lineas: LineaVentaLocal[];
  confirmedAt: number;
}

export function getUltimoRefrescoJornada(): number {
  if (typeof localStorage === 'undefined') return 0;
  const raw = localStorage.getItem(ULTIMO_REFRESCO_JORNADA_KEY);
  if (!raw) return 0;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function registrarRefrescoJornada(timestamp?: number): void {
  const ts = timestamp ?? Date.now();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ULTIMO_REFRESCO_JORNADA_KEY, ts.toString());
  }
  limpiarVentasConfirmadasAntiguas(ts);
}

export function getVentasConfirmadas(): RegistroVentaConfirmada[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(VENTAS_CONFIRMADAS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RegistroVentaConfirmada[];
  } catch {
    return [];
  }
}

export function registrarVentaConfirmada(
  lineas: LineaVentaLocal[],
  confirmedAt?: number
): void {
  if (typeof localStorage === 'undefined') return;
  const ts = confirmedAt ?? Date.now();
  const existing = getVentasConfirmadas();
  const nuevo: RegistroVentaConfirmada = {
    id: `${ts}-${Math.random().toString(36).slice(2, 8)}`,
    lineas,
    confirmedAt: ts,
  };
  existing.push(nuevo);
  localStorage.setItem(VENTAS_CONFIRMADAS_KEY, JSON.stringify(existing));
}

export function limpiarVentasConfirmadasAntiguas(hastaTimestamp: number): void {
  if (typeof localStorage === 'undefined') return;
  const existing = getVentasConfirmadas();
  const restantes = existing.filter((v) => v.confirmedAt > hastaTimestamp);
  localStorage.setItem(VENTAS_CONFIRMADAS_KEY, JSON.stringify(restantes));
}

export function limpiarRegistroVentasConfirmadas(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(VENTAS_CONFIRMADAS_KEY);
}

// ─── Helpers de Extracción de Operaciones Locales ─────────────────────────────

export function extraerLineasDePayload(payload: unknown): LineaVentaLocal[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;

  // Payload estándar de venta: { lineas: [{ id_producto, cantidad, precio_unitario }] }
  if (Array.isArray(p.lineas)) {
    return p.lineas.map((l: Record<string, unknown>) => ({
      id_producto: Number(l.id_producto ?? l.idProducto),
      cantidad: Number(l.cantidad) || 0,
      precio_unitario: Number(l.precio_unitario ?? l.precioUnitario) || 0,
    }));
  }

  // Payload alternativo de pedidos offline: { items: [{ idProducto, cantidad, precioUnitario }] }
  if (Array.isArray(p.items)) {
    return p.items.map((it: Record<string, unknown>) => ({
      id_producto: Number(it.idProducto ?? it.id_producto),
      cantidad: Number(it.cantidad) || 0,
      precio_unitario: Number(it.precioUnitario ?? it.precio_unitario) || 0,
    }));
  }

  return [];
}

export function esOperacionDeVenta(item: OfflineQueueItem): boolean {
  return (
    item.endpoint === '/api/v1/ventas' ||
    item.type === 'CREATE_PEDIDO' ||
    item.type === 'CREATE_SALE'
  );
}

export function obtenerVentasLocalesParaStock(
  queueItems: OfflineQueueItem[]
): VentaLocalParaStock[] {
  const ventas: VentaLocalParaStock[] = [];

  // 1. Extraer operaciones de la cola offline
  for (const item of queueItems) {
    if (esOperacionDeVenta(item)) {
      const lineas = extraerLineasDePayload(item.payload);
      if (lineas.length > 0) {
        ventas.push({
          id: item.ulid || item.id,
          estado: item.status,
          lineas,
        });
      }
    }
  }

  // 2. Extraer ventas confirmadas locales pendientes de reflejo en el servidor
  const ultimoRefresco = getUltimoRefrescoJornada();
  const confirmadas = getVentasConfirmadas();
  for (const c of confirmadas) {
    if (c.confirmedAt > ultimoRefresco) {
      ventas.push({
        id: c.id,
        estado: 'confirmada',
        lineas: c.lineas,
        timestampConfirmacion: c.confirmedAt,
      });
    }
  }

  return ventas;
}
