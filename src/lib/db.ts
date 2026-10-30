import Dexie, { type EntityTable } from 'dexie';
import type {
  Producto,
  Lote,
  Categoria,
  Precio,
  Cliente,
  Sucursal,
  Pedido,
  VentaCobro,
  OfflineQueueItem,
  TipoErrorOperacion,
  BorradorPedido,
  Vehiculo,
  Ruta,
  StockDepositoItem,
  Jornada,
  StockVehiculoItem,
} from '@/types';

// ─── Database Definition ──────────────────────────────────────────────────────
//
// La base de datos local de SIGLO es una caché de los datos del servidor (D1).
// El principio rector: el cliente es caché, no fuente de verdad.
//
// Schema Dexie v1:
//   - Índices con & son índices compuestos
//   - El signo ++ indica autoincrement
//   - El símbolo * indica índice multi-entry (arrays)
//
// Para migraciones futuras: nunca modificar versiones existentes —
// agregar nueva versión con .version(N+1).stores({...}) y migrate() si aplica.

class SigloDatabase extends Dexie {
  // ── Catálogo ──────────────────────────────────────────────────
  productos!: EntityTable<Producto, 'id'>;
  lotes!: EntityTable<Lote, 'id'>;
  categorias!: EntityTable<Categoria, 'id'>;
  precios!: EntityTable<Precio, 'id'>;

  // ── Clientes ──────────────────────────────────────────────────
  clientes!: EntityTable<Cliente, 'id'>;
  sucursales!: EntityTable<Sucursal, 'id'>;

  // ── Operaciones ───────────────────────────────────────────────
  pedidos!: EntityTable<Pedido, 'id'>;
  ventas_cobros!: EntityTable<VentaCobro, 'id'>;

  // ── Cola Offline ──────────────────────────────────────────────
  offline_queue!: EntityTable<OfflineQueueItem, 'id'>;

  // ── Borradores de Pedido ──────────────────────────────────────
  borradores_pedido!: EntityTable<BorradorPedido, 'id'>;

  // ── Jornadas y Stock Vehículo (ADR-015) ────────────────────────
  jornadas!: EntityTable<Jornada, 'id'>;
  stock_vehiculo!: EntityTable<StockVehiculoItem, 'id'>;

  // ── Catálogos de Operación (ADR-015) ──────────────────────────
  vehiculos!: EntityTable<Vehiculo, 'id'>;
  rutas!: EntityTable<Ruta, 'id'>;
  stock_deposito!: EntityTable<StockDepositoItem, 'id'>;

  constructor() {
    super('siglo_smg_db');

    // ── Version 1 — Schema inicial ─────────────────────────────
    this.version(1).stores({
      // Catálogo de productos
      // índices: id (PK), codigo, empresaId, categoriaId, activo, updatedAt
      productos:     'id, codigo, empresaId, categoriaId, activo, updatedAt',

      // Lotes de stock
      // índices: id (PK), productoId, empresaId, updatedAt
      lotes:         'id, productoId, empresaId, updatedAt',

      // Categorías de productos
      categorias:    'id, empresaId',

      // Lista de precios por producto
      // índices: id (PK), productoId, listaPrecioId
      precios:       'id, productoId, listaPrecioId',

      // Clientes
      // índices: id (PK), rut, empresaId, estado, tipo, updatedAt, localDraft
      clientes:      'id, rut, empresaId, estado, tipo, updatedAt, localDraft',

      // Sucursales de clientes
      // índices: id (PK), clienteId, empresaId, localDraft
      sucursales:    'id, clienteId, empresaId, localDraft',

      // Pedidos
      // índices: id (PK), clienteId, vendedorId, estado, rutaId, createdAt, localDraft
      pedidos:       'id, clienteId, vendedorId, estado, rutaId, createdAt, localDraft',

      // Ventas y cobros
      // índices: id (PK), pedidoId, clienteId, vendedorId, estado, localDraft
      ventas_cobros: 'id, pedidoId, clienteId, vendedorId, estado, localDraft',

      // Cola de operaciones offline
      // ++id: autoincrement  |  ulid: ID único ULID  |  type, status, timestamp para queries
      offline_queue: '++id, ulid, type, status, timestamp, retries',
    });

    // ── Version 2 — Borradores de pedido ───────────────────────
    this.version(2).stores({
      // Borradores de pedido (estado en progreso)
      // ++id: autoincrement  |  id_vendedor: filtro por vendedor  |  estado, fecha_modificacion
      borradores_pedido: '++id, id_vendedor, id_cliente, estado, fecha_modificacion',
    });

    // ── Version 3 — Jornadas, Stock de Vehículo y Catálogos Operativos (ADR-015) ──
    this.version(3).stores({
      // Jornadas (estado de jornada activa/histórica)
      // índices: id (PK, ULID string), idVendedor, idVehiculo, idRuta, estado, fechaApertura
      jornadas:       'id, idVendedor, idVehiculo, idRuta, estado, fechaApertura',

      // Stock asignado al vehículo en ruta
      // índices: id (PK), idVehiculo, idProducto, idJornada, numeroLote
      stock_vehiculo: 'id, idVehiculo, idProducto, idJornada, numeroLote',

      // Flota de vehículos disponibles
      // índices: id (PK), patente, estado
      vehiculos:      'id, patente, estado',

      // Rutas de distribución
      // índices: id (PK), nombre, activa
      rutas:          'id, nombre, activa',

      // Stock disponible en depósito central
      // índices: id (PK), idProducto, numeroLote, fechaVencimiento
      stock_deposito: 'id, idProducto, numeroLote, fechaVencimiento',
    });
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
export const db = new SigloDatabase();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Cuenta las operaciones pendientes en la cola offline.
 * Útil para mostrar el indicador de estado en la UI.
 */
export async function getPendingCount(): Promise<number> {
  return db.offline_queue
    .where('status')
    .anyOf(['pending', 'failed'])
    .count();
}

/**
 * Agrega una operación a la cola offline.
 * Genera un ULID simple basado en timestamp + random.
 */
export async function enqueueOperation(
  item: Omit<OfflineQueueItem, 'id' | 'ulid' | 'timestamp' | 'retries' | 'status'>,
): Promise<string> {
  const ulid = generateUlid();
  await db.offline_queue.add({
    ...item,
    ulid,
    status: 'pending',
    retries: 0,
    maxRetries: item.maxRetries ?? 5,
    timestamp: Date.now(),
  });
  return ulid;
}

/**
 * Obtiene todas las operaciones pendientes de sincronizar, ordenadas por timestamp (FIFO).
 * Solo incluye operaciones en estado 'pending' que no hayan agotado reintentos.
 */
export async function getPendingOperations(): Promise<OfflineQueueItem[]> {
  return db.offline_queue
    .where('status')
    .equals('pending')
    .and((item) => item.retries < item.maxRetries)
    .sortBy('timestamp');
}

/**
 * Marca una operación como sincronizada y la elimina de la cola.
 */
export async function markOperationSynced(id: number): Promise<void> {
  await db.offline_queue.delete(id);
}

/**
 * Marca una operación como fallida.
 * - 'rechazo' (por defecto): rechazo procesado por SIGLO (ej. stock insuficiente, validación 4xx).
 *   Pasa de inmediato a status 'failed' y agota retries (= maxRetries) para evitar reintentos automáticos.
 * - 'transitorio': error de red, timeout, 5xx, 408 o 429.
 *   Incrementa retries en 1; si retries >= maxRetries pasa a 'failed', si no permanece como 'pending'.
 * - 'conflicto': conflicto de idempotencia o estado concurrente.
 */
export async function markOperationFailed(
  id: number,
  errorMessage: string,
  tipoError: TipoErrorOperacion = 'rechazo',
): Promise<void> {
  await db.offline_queue
    .where('id')
    .equals(id)
    .modify((item) => {
      item.errorMessage = errorMessage;
      if (tipoError === 'transitorio') {
        item.retries += 1;
        item.status = item.retries >= item.maxRetries ? 'failed' : 'pending';
        item.tipoError = 'transitorio';
      } else {
        item.status = 'failed';
        item.retries = item.maxRetries;
        item.tipoError = tipoError;
      }
    });
}

/**
 * Marca una operación con error transitorio (red, timeout, 5xx, 408, 429), incrementando
 * reintentos. Permanece en 'pending' mientras retries < maxRetries, pasando a 'failed'
 * solo al agotarse los reintentos.
 */
export async function markOperationTransientError(
  id: number,
  errorMessage: string,
): Promise<void> {
  await markOperationFailed(id, errorMessage, 'transitorio');
}

/**
 * Marca una operación como fallida definitivamente por conflicto (ej. clave de idempotencia 409),
 * sin permitir nuevos reintentos automáticos.
 */
export async function markOperationConflict(
  id: number,
  errorMessage: string,
): Promise<void> {
  await db.offline_queue
    .where('id')
    .equals(id)
    .modify((item) => {
      item.retries = item.maxRetries;
      item.status = 'failed';
      item.errorMessage = errorMessage;
      item.tipoError = 'conflicto';
    });
}

/**
 * Reintenta una operación fallida: la vuelve a estado 'pending',
 * reinicia su contador de reintentos a 0 y borra el mensaje de error y tipo.
 */
export async function retryOperation(id: number): Promise<void> {
  await db.offline_queue
    .where('id')
    .equals(id)
    .modify((item) => {
      item.status = 'pending';
      item.retries = 0;
      item.errorMessage = undefined;
      item.tipoError = undefined;
    });
}

/**
 * Descarta una operación de la cola offline de forma definitiva.
 */
export async function discardOperation(id: number): Promise<void> {
  await db.offline_queue.delete(id);
}

const ULID_ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ULID_ENCODING_LEN = ULID_ENCODING.length;

/**
 * Genera un ULID estándar canónico: 48-bit timestamp + 80-bit randomness (26 caracteres Base32 Crockford).
 */
export function generateUlid(now: number = Date.now()): string {
  let timeStr = '';
  let time = now;
  for (let i = 9; i >= 0; i--) {
    const mod = time % ULID_ENCODING_LEN;
    timeStr = ULID_ENCODING.charAt(mod) + timeStr;
    time = Math.floor(time / ULID_ENCODING_LEN);
  }

  const randomBytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 10; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let randStr = '';
  for (let i = 0; i < 16; i++) {
    const bitPos = i * 5;
    const bytePos = Math.floor(bitPos / 8);
    const bitOffset = bitPos % 8;

    const b0 = randomBytes[bytePos] ?? 0;
    const b1 = bytePos + 1 < randomBytes.length ? (randomBytes[bytePos + 1] ?? 0) : 0;
    const val16 = (b0 << 8) | b1;
    const val = (val16 >> (16 - 5 - bitOffset)) & 31;
    randStr += ULID_ENCODING.charAt(val);
  }

  return timeStr + randStr;
}

/**
 * Valida si un string cumple el formato canónico de ULID (26 caracteres Base32 Crockford).
 */
export function isValidUlid(id: string): boolean {
  if (typeof id !== 'string' || id.length !== 26) {
    return false;
  }
  return /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i.test(id);
}

// ─── Bulk Sync Helpers ────────────────────────────────────────────────────────

/**
 * Reemplaza en bloque el catálogo de productos. Usado en sync inicial o full refresh.
 */
export async function bulkUpsertProductos(productos: Producto[]): Promise<void> {
  await db.productos.bulkPut(productos);
}

export async function bulkUpsertLotes(lotes: Lote[]): Promise<void> {
  await db.lotes.bulkPut(lotes);
}

export async function bulkUpsertCategorias(categorias: Categoria[]): Promise<void> {
  await db.categorias.bulkPut(categorias);
}

export async function bulkUpsertPrecios(precios: Precio[]): Promise<void> {
  await db.precios.bulkPut(precios);
}

export async function bulkUpsertClientes(clientes: Cliente[]): Promise<void> {
  await db.clientes.bulkPut(clientes);
}

export async function bulkUpsertSucursales(sucursales: Sucursal[]): Promise<void> {
  await db.sucursales.bulkPut(sucursales);
}

/**
 * Purga exclusivamente las tablas de clientes y sucursales en Dexie.
 * Garantiza aislamiento absoluto: ninguna otra tabla (productos, lotes,
 * stock, vehículos, rutas, jornadas, offline_queue) es alterada.
 */
export async function purgeClientesAndSucursalesOnly(): Promise<void> {
  await db.transaction('rw', [db.clientes, db.sucursales], async () => {
    await db.clientes.clear();
    await db.sucursales.clear();
  });
}

export async function bulkUpsertPedidos(pedidos: Pedido[]): Promise<void> {
  await db.pedidos.bulkPut(pedidos);
}

export async function bulkUpsertVentasCobros(cobros: VentaCobro[]): Promise<void> {
  await db.ventas_cobros.bulkPut(cobros);
}

export async function bulkUpsertVehiculos(vehiculos: Vehiculo[]): Promise<void> {
  await db.vehiculos.bulkPut(vehiculos);
}

export async function bulkUpsertRutas(rutas: Ruta[]): Promise<void> {
  await db.rutas.bulkPut(rutas);
}

export async function bulkUpsertStockDeposito(stock: StockDepositoItem[]): Promise<void> {
  await db.stock_deposito.bulkPut(stock);
}

export async function bulkUpsertJornadas(jornadas: Jornada[]): Promise<void> {
  await db.jornadas.bulkPut(jornadas);
}

export async function bulkUpsertStockVehiculo(stock: StockVehiculoItem[]): Promise<void> {
  await db.stock_vehiculo.bulkPut(stock);
}
