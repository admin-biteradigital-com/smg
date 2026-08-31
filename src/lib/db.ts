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
 * Obtiene todas las operaciones pendientes, ordenadas por timestamp (FIFO).
 */
export async function getPendingOperations(): Promise<OfflineQueueItem[]> {
  return db.offline_queue
    .where('status')
    .anyOf(['pending', 'failed'])
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
 * Marca una operación como fallida e incrementa el contador de reintentos.
 */
export async function markOperationFailed(
  id: number,
  errorMessage: string,
): Promise<void> {
  await db.offline_queue
    .where('id')
    .equals(id)
    .modify((item) => {
      item.retries += 1;
      item.status = item.retries >= item.maxRetries ? 'failed' : 'pending';
      item.errorMessage = errorMessage;
    });
}

/**
 * Genera un ULID simplificado (timestamp + random).
 * Para producción se puede reemplazar por la librería `ulid`.
 */
export function generateUlid(): string {
  const ts = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const rnd = Math.random().toString(36).substring(2, 12).toUpperCase().padStart(10, '0');
  return `${ts}${rnd}`;
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
