// ─── Tipos compartidos SIGLO PWA ─────────────────────────────────────────────
// Espejo de los tipos del backend SIGLO Worker. Mantener en sync con el schema D1.

// ── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'supervisor' | 'vendedor' | 'chofer' | 'deposito';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  empresaId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  user: User;
  token: string;
  expiresAt: string;
}

// ── Productos / Catálogo ──────────────────────────────────────────────────────

export type UnidadMedida = 'unidad' | 'caja' | 'kg' | 'litro' | 'pack';

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoriaId: string;
  unidadMedida: UnidadMedida;
  precioBase: number;       // En CLP (pesos chilenos)
  precioPublico?: number;   // Precio público e-commerce (GET /api/v1/catalog)
  precioOferta?: number;    // Precio oferta opcional (GET /api/v1/catalog)
  imageUrl?: string;
  marca?: string;
  activo: boolean;
  empresaId: string;
  updatedAt: string;
}

export interface Precio {
  id: string;
  productoId: string;
  listaPrecioId: string;
  precio: number;
  vigenciaDesde: string;
  vigenciaHasta?: string;
}

export interface Lote {
  id: string;
  productoId: string;
  codigo: string;
  fechaVencimiento?: string;
  stockActual: number;
  stockInicial: number;
  ubicacion?: string;
  empresaId: string;
  updatedAt: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  empresaId: string;
}

// ── Clientes / Sucursales ─────────────────────────────────────────────────────

export type TipoCliente = 'minorista' | 'mayorista' | 'horeca' | 'institucional';
export type EstadoCliente = 'activo' | 'inactivo' | 'suspendido';

export interface Cliente {
  id: string;
  rut: string;
  razonSocial: string;
  nombreFantasia?: string;
  tipo: TipoCliente;
  estado: EstadoCliente;
  emailContacto?: string;
  telefonoContacto?: string;
  listaPrecioId?: string;
  empresaId: string;
  // Creado offline localmente (pendiente de sync)
  localDraft?: boolean;
  localId?: string;       // ULID temporal mientras no se sincroniza
  updatedAt: string;
}

export interface Sucursal {
  id: string;
  clienteId: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  region?: string;
  lat?: number;
  lng?: number;
  contactoNombre?: string;
  contactoTelefono?: string;
  empresaId: string;
  localDraft?: boolean;
  localId?: string;
  updatedAt: string;
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export type EstadoPedido =
  | 'borrador'
  | 'confirmado'
  | 'en_preparacion'
  | 'en_ruta'
  | 'entregado'
  | 'cancelado';

export type MetodoPago = 'efectivo' | 'transferencia' | 'cheque' | 'credito';

export interface LineaPedido {
  id?: string;
  pedidoId?: string;
  productoId: string;
  loteId?: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;      // Porcentaje 0-100
  subtotal: number;
}

export interface Pedido {
  id: string;
  numero?: number;
  clienteId: string;
  sucursalId?: string;
  vendedorId: string;
  rutaId?: string;
  estado: EstadoPedido;
  metodoPago: MetodoPago;
  observaciones?: string;
  lineas: LineaPedido[];
  subtotal: number;
  descuentoTotal: number;
  total: number;
  empresaId: string;
  localDraft?: boolean;
  localId?: string;
  fechaEntrega?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Ventas / Cobros ───────────────────────────────────────────────────────────

export type EstadoCobro = 'pendiente' | 'cobrado' | 'parcial' | 'incobrable';

export interface VentaCobro {
  id: string;
  pedidoId: string;
  clienteId: string;
  vendedorId: string;
  monto: number;
  metodoPago: MetodoPago;
  estado: EstadoCobro;
  comprobante?: string;
  notas?: string;
  empresaId: string;
  localDraft?: boolean;
  localId?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Cola Offline ──────────────────────────────────────────────────────────────

export type OfflineOperationType =
  | 'CREATE_PEDIDO'
  | 'UPDATE_PEDIDO'
  | 'CREATE_COBRO'
  | 'CREATE_CLIENTE'
  | 'CREATE_SUCURSAL'
  | 'UPDATE_ENTREGA'
  | 'CREATE_NOTA'
  | 'OPEN_JORNADA';

export type OfflineQueueStatus = 'pending' | 'syncing' | 'failed' | 'conflict';

export interface OfflineQueueItem {
  id?: number;          // Autoincrement local PK
  ulid: string;         // ID único ULID generado en cliente
  type: OfflineOperationType;
  endpoint: string;     // e.g. '/api/v1/pedidos'
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: unknown;
  status: OfflineQueueStatus;
  retries: number;
  maxRetries: number;
  errorMessage?: string;
  timestamp: number;    // Date.now()
  syncedAt?: number;
}

// ── Sync ──────────────────────────────────────────────────────────────────────

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'pending' | 'conflict';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  errors: Array<{ ulid: string; error: string }>;
}

// ── API Responses ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    timestamp?: string;
    version?: string;
  };
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiError {
  error?: {
    code?: string;
    message?: string;
    status?: number;
    details?: ApiErrorDetail[] | unknown;
  } | string;
  code?: string;
  message?: string;
  details?: unknown;
}

// ── Vehículos ─────────────────────────────────────────────────────────────────

export interface Vehiculo {
  id: number;
  patente: string;
  marca?: string | null;
  modelo?: string | null;
  anio?: number | null;
  tipo?: string | null;
  capacidadKg?: number | null;
  estado: string;
}

// ── Rutas ─────────────────────────────────────────────────────────────────────

export interface Ruta {
  id: number;
  nombre: string;
  descripcion?: string | null;
  distanciaEstimadaKm?: number | null;
  duracionEstimadaHoras?: number | null;
  activa: number;
}

// ── Stock de Depósito (ADR-015) ───────────────────────────────────────────────

export interface StockDepositoItem {
  id: number;
  idProducto: number;
  nombreProducto?: string;
  numeroLote: string;
  fechaVencimiento: string;
  cantidadActual: number;
  unidadBase: string;
  diasParaVencer?: number;
  alertaVencimiento?: boolean;
  producto?: { id: number; nombre: string };
  updatedAt?: string;
}

// ── Jornadas ──────────────────────────────────────────────────────────────────

export type EstadoJornada = 'abierta' | 'cerrada' | 'cancelada';

export interface StockVehiculoItem {
  id: number;
  idVehiculo: number;
  idProducto: number;
  productoNombre?: string;
  productoCodigo?: string;
  numeroLote: string;
  fechaVencimiento: string;
  cantidad: number;
  idJornada?: string | null;
  actualizado?: string;
}

export interface Jornada {
  id: string;
  idAbonado: number;
  idVendedor: number;
  idChofer: number | null;
  idVehiculo: number;
  idRuta: number | null;
  estado: EstadoJornada;
  fechaApertura: string;
  fechaCierre: string | null;
  notasApertura: string | null;
  notasCierre: string | null;
  vehiculoPatente?: string;
  vehiculoDescripcion?: string;
  rutaNombre?: string | null;
  stockVehiculo?: StockVehiculoItem[];
}

export interface AbrirJornadaPayload {
  id?: string | null;
  idVehiculo: number;
  idChofer?: number | null;
  idRuta?: number | null;
  notasApertura?: string | null;
}

export interface CargaStockItemPayload {
  idProducto: number;
  numeroLote: string;
  cantidad: number;
}

export interface CargarStockPayload {
  items: CargaStockItemPayload[];
  observaciones?: string;
}

export interface ResumenCargaStock {
  idOrdenCarga: number;
  idJornada: string;
  idVehiculo: number;
  itemsCargados: number;
}

export interface CierreJornadaPayload {
  notasCierre?: string | null;
}

export interface ResumenCierre {
  idJornada: string;
  estado: 'cerrada';
  totalVentas: number;
  totalMontoVendido: number;
  totalCobrado: number;
  itemsRetornadosAlDeposito: number;
}

// ── Pedidos Locales (Borradores) ──────────────────────────────────────────────

/** Línea de un borrador de pedido — snapshot de precio y nombre al momento de agregar. */
export interface LineaPedidoLocal {
  id_producto: string;        // Usa string (mismo tipo que Producto.id)
  nombre_producto: string;    // Snapshot del nombre
  codigo_producto: string;    // Snapshot del código
  cantidad: number;
  precio_unitario: number;    // Snapshot del precio base
  subtotal: number;           // cantidad × precio_unitario
}

/** Borrador de pedido persistido en IndexedDB. */
export interface BorradorPedido {
  id?: number;                // Autoincrement local (Dexie)
  id_vendedor: number;        // ID del usuario autenticado
  id_cliente: string | null;  // ID del cliente seleccionado (string = id de Dexie)
  nombre_cliente: string | null; // Snapshot del nombre de cliente
  lineas: LineaPedidoLocal[];
  notas: string;
  estado: 'borrador' | 'confirmado' | 'encolado' | 'sincronizado';
  fecha_creacion: string;     // ISO timestamp
  fecha_modificacion: string;
}

// ── ADR-013: Cuentas Corrientes y Cobros ──────────────────────────────────────

export interface SaldoCliente {
  idCliente: number;
  razonSocial: string;
  totalVentasPendientes: number;
  saldoPendienteTotal: number;
}

export interface VentaPendiente {
  id: number;
  fechaVenta: string;
  montoTotal: number;
  estadoCobro: 'pendiente' | 'cobrado_parcial';
  metodoPago: string;
  fechaVencimientoCredito: string | null;
  totalPagado: number;
  saldoRestante: number;
}

// ── ADR-014: Empresa / Modo Gestión ──────────────────────────────────────────

export interface EmpresaPerfil {
  id: number;
  nombreEmpresa: string;
  rutEmpresa: string | null;
  giro: string | null;
  direccion: string | null;
  comuna: string | null;
  ciudad: string | null;
  region: string | null;
  telefono: string | null;
  emailContacto: string | null;
  dominioWeb: string | null;
  logoUrl: string | null;
  estado: string;
  estadoOperacion: 'configurando' | 'activa' | 'suspendida';
  fechaAlta: string;
  camposMinimosCompletos: boolean;
}

export interface UpdateEmpresaPayload {
  nombreEmpresa?: string;
  rutEmpresa?: string | null;
  giro?: string | null;
  direccion?: string | null;
  comuna?: string | null;
  ciudad?: string | null;
  region?: string | null;
  telefono?: string | null;
  emailContacto?: string | null;
  dominioWeb?: string | null;
  logoUrl?: string | null;
}

// ── ADR-014 Entrega B: Empleados, Vehículos y Rutas ──────────────────────────

export interface EmpleadoItem {
  id: number;
  nombres: string;
  apellidos: string;
  rut: string;
  cargo: 'admin' | 'vendedor' | 'chofer' | 'peon' | 'deposito' | 'otro';
  telefono: string | null;
  email: string | null;
  fechaContratacion: string;
  activo: number;
  idUsuario: number | null;
}

export interface VehiculoAdminItem {
  id: number;
  patente: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  tipo: 'camioneta' | 'furgon' | 'camion' | 'otro' | null;
  capacidadKg: number | null;
  estado: 'disponible' | 'en_ruta' | 'mantenimiento' | 'inactivo';
}

export interface RutaAdminItem {
  id: number;
  nombre: string;
  descripcion: string | null;
  distanciaEstimadaKm: number | null;
  duracionEstimadaHoras: number | null;
  activa: number;
}

// ── ADR-014 Entrega B Prompt B: Productos Admin ──────────────────────────────

export interface UnidadMedidaItem {
  id: number;
  nombre: string;
  abreviacion: string;
}

export interface ProductoAdminItem {
  id: number;
  nombre: string;
  descripcion: string | null;
  codigoBarras: string | null;
  precioUnitarioSugerido: number | null;
  precioCosto: number | null;
  precioPublico: number | null;
  activo: number;
  visiblePublico: number;
  stockSeguridadMinimo: number | null;
  idUnidadBase: number;
  nombreUnidadBase: string;
}

export interface ProductoAdminDetalle extends ProductoAdminItem {
  idUnidadVenta: number | null;
  idUnidadCompra: number | null;
  precioOferta: number | null;
  categoriaWeb: string | null;
  descripcionWeb: string | null;
}

// ── ADR-014: Clientes y Sucursales Admin ──────────────────────────────────────

export type SegmentoCliente = 'pequeño' | 'mediano' | 'grande' | 'mayorista';

export interface SucursalPrincipalInfo {
  id: number;
  codigo: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  region: string;
  telefono: string | null;
  email: string | null;
}

export interface ClienteAdminItem {
  id: number;
  razonSocial: string;
  rut: string;
  segmento: SegmentoCliente | null;
  limiteCredito: number;
  plazoCreditoDias: number;
  cicloReabastecimientoDias: number | null;
  activo: boolean;
  sucursalPrincipal: SucursalPrincipalInfo | null;
  saldoPendiente?: number;
}

export interface SucursalAdminItem {
  id: number;
  idCliente: number;
  codigo: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  region: string;
  telefono: string | null;
  email: string | null;
  latitud: number | null;
  longitud: number | null;
  esPrincipal: boolean;
  observaciones: string | null;
  activa: boolean;
}

export interface ClienteAdminDetalle {
  id: number;
  razonSocial: string;
  rut: string;
  segmento: SegmentoCliente | null;
  limiteCredito: number;
  plazoCreditoDias: number;
  cicloReabastecimientoDias: number | null;
  activo: boolean;
  sucursales: SucursalAdminItem[];
}

export interface CreateClientePayload {
  razonSocial: string;
  rut: string;
  segmento?: SegmentoCliente | null;
  limiteCredito?: number;
  plazoCreditoDias?: number;
  cicloReabastecimientoDias?: number | null;
  sucursalPrincipal: {
    nombre: string;
    direccion: string;
    ciudad: string;
    region: string;
    telefono?: string | null;
    email?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    observaciones?: string | null;
  };
}

export interface UpdateClientePayload {
  razonSocial?: string;
  rut?: string;
  segmento?: SegmentoCliente | null;
  limiteCredito?: number;
  plazoCreditoDias?: number;
  cicloReabastecimientoDias?: number | null;
  activo?: boolean;
}

export interface CreateSucursalPayload {
  nombre: string;
  direccion: string;
  ciudad: string;
  region: string;
  telefono?: string | null;
  email?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  esPrincipal?: boolean;
  observaciones?: string | null;
}

export interface UpdateSucursalPayload {
  nombre?: string;
  direccion?: string;
  ciudad?: string;
  region?: string;
  telefono?: string | null;
  email?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  esPrincipal?: boolean;
  activa?: boolean;
  observaciones?: string | null;
}

