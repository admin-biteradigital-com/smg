import { api, NetworkError } from '@/lib/api';
import {
  db,
  getPendingOperations,
  markOperationSynced,
  markOperationFailed,
  bulkUpsertProductos,
  bulkUpsertClientes,
  bulkUpsertSucursales,
  bulkUpsertVehiculos,
  bulkUpsertRutas,
  bulkUpsertStockDeposito,
} from '@/lib/db';
import type {
  Cliente,
  OfflineQueueItem,
  Producto,
  SyncResult,
  SyncStatus,
  Sucursal,
  UnidadMedida,
  Vehiculo,
  Ruta,
  StockDepositoItem,
} from '@/types';

// ─── State ────────────────────────────────────────────────────────────────────

export type SyncListener = (status: SyncStatus, pendingCount: number) => void;

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? Boolean(navigator.onLine) : true;
}

let _currentStatus: SyncStatus = isOnline() ? 'online' : 'offline';
let _listeners: SyncListener[] = [];
let _syncInProgress = false;

// ─── Status Broadcasting ──────────────────────────────────────────────────────

/**
 * Suscribe un listener al estado de sincronización.
 * Retorna una función de limpieza (unsubscribe).
 */
export function onSyncStatusChange(listener: SyncListener): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

async function broadcastStatus(status: SyncStatus): Promise<void> {
  _currentStatus = status;
  const pendingCount = await db.offline_queue
    .where('status')
    .anyOf(['pending', 'failed'])
    .count();
  _listeners.forEach((l) => l(status, pendingCount));
}

export function getCurrentSyncStatus(): SyncStatus {
  return _currentStatus;
}

// ─── Online / Offline Detection ───────────────────────────────────────────────

/**
 * Inicializa los listeners de conectividad y registra el Background Sync
 * cuando está disponible (Android Chrome).
 */
export function initConnectivityListeners(): () => void {
  const handleOnline = async () => {
    console.info('[Sync] Conexión recuperada — iniciando sync...');
    await broadcastStatus('syncing');
    await runSync();
  };

  const handleOffline = async () => {
    console.info('[Sync] Sin conexión.');
    const pendingCount = await db.offline_queue
      .where('status')
      .anyOf(['pending', 'failed'])
      .count();
    await broadcastStatus(pendingCount > 0 ? 'pending' : 'offline');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Intentar sincronizar en foreground si ya hay conexión al cargar la app
  // (cubre el caso iOS — no hay Background Sync)
  if (isOnline()) {
    runSync().catch(console.error);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };
}

// ─── Main Sync Engine ─────────────────────────────────────────────────────────

/**
 * Ejecuta el ciclo completo de sincronización:
 * 1. Flush de la cola offline (escrituras pendientes → servidor)
 * 2. Pull de datos frescos del servidor → IndexedDB
 *
 * Es idempotente y seguro para llamar múltiples veces.
 * Si ya hay un sync en curso, la segunda llamada es ignorada.
 */
export async function runSync(): Promise<SyncResult> {
  if (_syncInProgress) {
    console.info('[Sync] Ya hay un sync en curso, ignorando.');
    return { success: false, synced: 0, failed: 0, conflicts: 0, errors: [] };
  }

  if (!isOnline()) {
    const pendingCount = await db.offline_queue.count();
    await broadcastStatus(pendingCount > 0 ? 'pending' : 'offline');
    return { success: false, synced: 0, failed: 0, conflicts: 0, errors: [] };
  }

  _syncInProgress = true;
  await broadcastStatus('syncing');

  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    conflicts: 0,
    errors: [],
  };

  try {
    // ── Paso 1: Flush cola offline ──────────────────────────────
    const flushResult = await flushOfflineQueue();
    result.synced    += flushResult.synced;
    result.failed    += flushResult.failed;
    result.conflicts += flushResult.conflicts;
    result.errors.push(...flushResult.errors);

    // ── Paso 2: Pull de datos frescos ───────────────────────────
    await pullFreshData();

    // ── Estado final ────────────────────────────────────────────
    const remainingPending = await db.offline_queue
      .where('status')
      .anyOf(['pending', 'failed'])
      .count();

    if (result.conflicts > 0) {
      await broadcastStatus('conflict');
    } else if (remainingPending > 0) {
      await broadcastStatus('pending');
    } else {
      await broadcastStatus('online');
    }

    console.info('[Sync] Completado:', result);
    return result;
  } catch (error) {
    result.success = false;
    if (error instanceof NetworkError) {
      await broadcastStatus('offline');
    } else {
      console.error('[Sync] Error inesperado:', error);
      await broadcastStatus('pending');
    }
    return result;
  } finally {
    _syncInProgress = false;
  }
}

// ─── Flush Offline Queue ──────────────────────────────────────────────────────

/**
 * Envía las operaciones pendientes al servidor en orden FIFO.
 * Usa el endpoint de batch si hay múltiples items, o individual si hay uno solo.
 */
async function flushOfflineQueue(): Promise<SyncResult> {
  const pending = await getPendingOperations();
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    conflicts: 0,
    errors: [],
  };

  if (pending.length === 0) return result;

  console.info(`[Sync] Flushing ${pending.length} operaciones offline...`);

  // Intentar batch sync primero
  try {
    const batchResult = await sendBatchSync(pending);
    result.synced    = batchResult.synced;
    result.failed    = batchResult.failed;
    result.conflicts = batchResult.conflicts;
    result.errors    = batchResult.errors;
    return result;
  } catch (batchError) {
    // Si el batch falla (e.g. endpoint no implementado), caer a sync individual
    console.warn('[Sync] Batch sync falló, intentando sync individual...', batchError);
  }

  // Sync individual (fallback)
  for (const item of pending) {
    try {
      await sendOperation(item);
      if (item.id !== undefined) {
        await markOperationSynced(item.id);
      }
      result.synced++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Conflicto (409) — registrar pero no reintentar
      if (error instanceof Error && 'status' in error && (error as { status: number }).status === 409) {
        result.conflicts++;
        if (item.id !== undefined) {
          await markOperationFailed(item.id, `Conflicto: ${message}`);
        }
        result.errors.push({ ulid: item.ulid, error: `CONFLICT: ${message}` });
      } else {
        result.failed++;
        if (item.id !== undefined) {
          await markOperationFailed(item.id, message);
        }
        result.errors.push({ ulid: item.ulid, error: message });
      }
    }
  }

  return result;
}

/**
 * Envía todas las operaciones pendientes en un solo request batch.
 * POST /api/v1/sync { operations: [...] }
 */
async function sendBatchSync(operations: OfflineQueueItem[]): Promise<SyncResult> {
  type BatchResponse = {
    results: Array<{
      ulid: string;
      status: 'ok' | 'conflict' | 'error';
      error?: string;
    }>;
  };

  const response = await api.post<BatchResponse>('/api/v1/sync', {
    operations: operations.map(({ ulid, type, endpoint, method, payload, timestamp }) => ({
      ulid,
      type,
      endpoint,
      method,
      payload,
      timestamp,
    })),
  });

  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    conflicts: 0,
    errors: [],
  };

  // Crear mapa ulid → id local para marcar en DB
  const itemMap = new Map(operations.map((op) => [op.ulid, op]));

  for (const r of response.results) {
    const item = itemMap.get(r.ulid);
    if (!item || item.id === undefined) continue;

    if (r.status === 'ok') {
      await markOperationSynced(item.id);
      result.synced++;
    } else if (r.status === 'conflict') {
      await markOperationFailed(item.id, r.error ?? 'Conflicto');
      result.conflicts++;
      result.errors.push({ ulid: r.ulid, error: `CONFLICT: ${r.error}` });
    } else {
      await markOperationFailed(item.id, r.error ?? 'Error desconocido');
      result.failed++;
      result.errors.push({ ulid: r.ulid, error: r.error ?? 'Error' });
    }
  }

  return result;
}

/**
 * Envía una operación individual al endpoint correspondiente.
 */
async function sendOperation(item: OfflineQueueItem): Promise<unknown> {
  const { endpoint, method, payload } = item;
  switch (method) {
    case 'POST':   return api.post(endpoint, payload);
    case 'PUT':    return api.put(endpoint, payload);
    case 'PATCH':  return api.patch(endpoint, payload);
    case 'DELETE': return api.delete(endpoint);
    default:
      throw new Error(`Método HTTP no soportado en sync: ${method}`);
  }
}

// ─── Pull Fresh Data ──────────────────────────────────────────────────────────

/**
 * Descarga del servidor los datos maestros y los persiste en IndexedDB.
 * Usa el endpoint consolidado GET /api/v1/sync/master-data.
 */
async function pullFreshData(): Promise<void> {
  await syncCatalog(true);
}

// ── Backend response types (GET /api/v1/sync/master-data, vehiculos, rutas, stock) ─

interface BackendProducto {
  id: number;
  nombre: string;
  descripcionWeb: string | null;
  marca: string;
  imagenUrl: string;
  codigoBarras: string | null;
  codigoQr: string | null;
  unidadVenta: string | null;
  precioUnitarioSugerido: number | null;
  precioPublico: number | null;
  precioOferta: number | null;
  categoriaWeb: string | null;
  activo: number;
}

interface BackendSucursal {
  id: number;
  codigo: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  latitud: number | null;
  longitud: number | null;
  esPrincipal: boolean;
}

interface BackendCliente {
  id: number;
  razonSocial: string;
  rut: string;
  segmento: string | null;
  limiteCredito: number;
  cicloReabastecimientoDias: number | null;
  activo: boolean;
  sucursales: BackendSucursal[];
}

export interface BackendVehiculo {
  id: number;
  patente: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  tipo: string | null;
  capacidadKg: number | null;
  estado: string;
}

export interface BackendRuta {
  id: number;
  nombre: string;
  descripcion: string | null;
  distanciaEstimadaKm: number | null;
  duracionEstimadaHoras: number | null;
  activa: number;
}

export interface BackendStockDepositoItem {
  id: number;
  producto?: { id: number; nombre: string };
  idProducto?: number;
  nombreProducto?: string;
  numeroLote: string;
  fechaVencimiento: string;
  cantidadActual: number;
  unidadBase: string;
  diasParaVencer?: number;
  alertaVencimiento?: boolean;
}

interface MasterDataResponse {
  data: {
    productos: BackendProducto[];
    clientes: BackendCliente[];
    generatedAt: string;
  };
  meta: {
    timestamp: string;
    version: string;
  };
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

export function mapProducto(p: BackendProducto, generatedAt: string): Producto {
  return {
    id: String(p.id),
    codigo: p.codigoBarras ?? String(p.id),
    nombre: p.nombre,
    descripcion: p.descripcionWeb ?? undefined,
    categoriaId: p.categoriaWeb ?? '',
    unidadMedida: (p.unidadVenta ?? 'unidad') as UnidadMedida,
    precioBase: p.precioUnitarioSugerido ?? 0,
    precioPublico: p.precioPublico ?? undefined,
    precioOferta: p.precioOferta ?? undefined,
    imageUrl: p.imagenUrl ?? undefined,
    activo: p.activo === 1,
    empresaId: '',
    updatedAt: generatedAt,
    marca: p.marca ?? undefined,
  };
}

export function mapCliente(c: BackendCliente, generatedAt: string): Cliente {
  return {
    id: String(c.id),
    rut: c.rut,
    razonSocial: c.razonSocial,
    tipo: 'minorista',
    estado: c.activo ? 'activo' : 'inactivo',
    empresaId: '',
    updatedAt: generatedAt,
  };
}

export function mapSucursal(s: BackendSucursal, clienteId: string, generatedAt: string): Sucursal {
  return {
    id: String(s.id),
    clienteId,
    nombre: s.nombre,
    direccion: s.direccion ?? '',
    ciudad: s.ciudad ?? '',
    lat: s.latitud ?? undefined,
    lng: s.longitud ?? undefined,
    contactoTelefono: s.telefono ?? undefined,
    empresaId: '',
    updatedAt: generatedAt,
  };
}

export function mapVehiculo(v: BackendVehiculo): Vehiculo {
  return {
    id: v.id,
    patente: v.patente,
    marca: v.marca ?? null,
    modelo: v.modelo ?? null,
    anio: v.anio ?? null,
    tipo: v.tipo ?? null,
    capacidadKg: v.capacidadKg ?? null,
    estado: v.estado,
  };
}

export function mapRuta(r: BackendRuta): Ruta {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion ?? null,
    distanciaEstimadaKm: r.distanciaEstimadaKm ?? null,
    duracionEstimadaHoras: r.duracionEstimadaHoras ?? null,
    activa: r.activa,
  };
}

export function mapStockDeposito(s: BackendStockDepositoItem, generatedAt: string): StockDepositoItem {
  const prodId = s.producto?.id ?? s.idProducto ?? 0;
  const prodNombre = s.producto?.nombre ?? s.nombreProducto ?? '';
  return {
    id: s.id,
    idProducto: prodId,
    nombreProducto: prodNombre,
    producto: s.producto ?? (prodId ? { id: prodId, nombre: prodNombre } : undefined),
    numeroLote: s.numeroLote,
    fechaVencimiento: s.fechaVencimiento,
    cantidadActual: s.cantidadActual,
    unidadBase: s.unidadBase,
    diasParaVencer: s.diasParaVencer,
    alertaVencimiento: s.alertaVencimiento,
    updatedAt: generatedAt,
  };
}

// ── Pull master data ──────────────────────────────────────────────────────────

/**
 * Descarga los datos maestros del servidor y los persiste en IndexedDB.
 * Consume el endpoint consolidado GET /api/v1/sync/master-data (autenticado),
 * junto con los catálogos operativos de vehículos, rutas y stock de depósito (ADR-015).
 *
 * No borra datos locales antes de escribir — si la llamada falla,
 * IndexedDB conserva los datos previos intactos.
 */
export async function pullMasterData(): Promise<void> {
  const [masterData, vehiculosRes, rutasRes, stockRes] = await Promise.all([
    api.get<MasterDataResponse>('/api/v1/sync/master-data'),
    api.get<{ data: BackendVehiculo[] }>('/api/v1/vehiculos').catch((e) => {
      console.warn('[Sync] No se pudieron obtener vehículos:', e);
      return { data: [] as BackendVehiculo[] };
    }),
    api.get<{ data: BackendRuta[] }>('/api/v1/rutas').catch((e) => {
      console.warn('[Sync] No se pudieron obtener rutas:', e);
      return { data: [] as BackendRuta[] };
    }),
    api.get<{ data: BackendStockDepositoItem[] }>('/api/v1/stock').catch((e) => {
      console.warn('[Sync] No se pudo obtener stock de depósito:', e);
      return { data: [] as BackendStockDepositoItem[] };
    }),
  ]);

  const generatedAt = masterData.data.generatedAt ?? new Date().toISOString();

  // ── Mapear productos ──────────────────────────────────────────
  const productos = (masterData.data.productos ?? []).map((p) =>
    mapProducto(p, generatedAt),
  );

  // ── Mapear clientes y sucursales ──────────────────────────────
  const clientes: Cliente[] = [];
  const sucursales: Sucursal[] = [];

  for (const c of masterData.data.clientes ?? []) {
    clientes.push(mapCliente(c, generatedAt));
    for (const s of c.sucursales ?? []) {
      sucursales.push(mapSucursal(s, String(c.id), generatedAt));
    }
  }

  // ── Mapear vehículos, rutas y stock de depósito (ADR-015) ─────
  const vehiculos = (vehiculosRes.data ?? []).map(mapVehiculo);
  const rutas = (rutasRes.data ?? []).map(mapRuta);
  const stockDeposito = (stockRes.data ?? []).map((s) => mapStockDeposito(s, generatedAt));

  // ── Persistir en IndexedDB ────────────────────────────────────
  await Promise.all([
    bulkUpsertProductos(productos),
    bulkUpsertClientes(clientes),
    bulkUpsertSucursales(sucursales),
    bulkUpsertVehiculos(vehiculos),
    bulkUpsertRutas(rutas),
    bulkUpsertStockDeposito(stockDeposito),
  ]);

  // ── Actualizar timestamp de sync ──────────────────────────────
  localStorage.setItem('siglo_last_catalog_sync', Date.now().toString());

  console.info('[Sync] Datos maestros actualizados:', {
    productos: productos.length,
    clientes: clientes.length,
    sucursales: sucursales.length,
    vehiculos: vehiculos.length,
    rutas: rutas.length,
    stockDeposito: stockDeposito.length,
  });
}

/**
 * Sincroniza datos maestros. Exportada para uso manual
 * desde useCatalog (botón de sync en la pantalla de catálogo).
 *
 * Internamente llama a pullMasterData() — el endpoint devuelve
 * todos los datos maestros en una sola respuesta.
 */
export async function syncCatalog(force = false): Promise<void> {
  if (!isOnline()) return;

  const lastSync = typeof localStorage !== 'undefined' ? localStorage.getItem('siglo_last_catalog_sync') : null;
  const now = Date.now();
  // Evitar descargas si fue hace menos de 5 minutos (300k ms), salvo force
  if (!force && lastSync && now - parseInt(lastSync, 10) < 300000) {
    console.info('[Sync] Datos maestros sincronizados recientemente. Saltando.');
    return;
  }

  try {
    await pullMasterData();

    // Obtener marcas (endpoint separado, no bloquea el sync si falla)
    try {
      const brandsData = await api.get<string[]>('/api/v1/catalog/brands');
      localStorage.setItem('siglo_brands', JSON.stringify(brandsData));
    } catch (e) {
      console.warn('[Sync] No se pudieron obtener las marcas:', e);
    }
  } catch (error) {
    console.error('[Sync] Error al sincronizar datos maestros:', error);
    throw error;
  }
}
