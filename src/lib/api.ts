import type {
  ApiResponse,
  Vehiculo,
  Ruta,
  Jornada,
  AbrirJornadaPayload,
  CargarStockPayload,
  ResumenCargaStock,
  CierreJornadaPayload,
  ResumenCierre,
  SaldoCliente,
  VentaPendiente,
  EmpresaPerfil,
  UpdateEmpresaPayload,
  EmpleadoItem,
  VehiculoAdminItem,
  RutaAdminItem,
  UnidadMedidaItem,
  ProductoAdminItem,
  ProductoAdminDetalle,
} from '@/types';

// ─── Configuration ────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_SIGLO_API_URL ?? 'http://localhost:8787';

// Timeout por defecto para peticiones al servidor (ms)
const DEFAULT_TIMEOUT_MS = 10_000;

// ─── Custom Errors ────────────────────────────────────────────────────────────

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Sin conexión a internet') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message = 'La petición tardó demasiado') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ─── Core Fetch Wrapper ───────────────────────────────────────────────────────

/**
 * Opciones extendidas para peticiones al API de SIGLO.
 */
interface SigloRequestInit extends Omit<RequestInit, 'body'> {
  /** Timeout en ms. Default: 10 000ms */
  timeoutMs?: number;
  /** Body como objeto — será serializado automáticamente a JSON */
  json?: unknown;
  /** Body raw (string / FormData). Alternativa a json. */
  body?: BodyInit | null;
}

/**
 * Ejecuta una petición al API de SIGLO.
 * - Agrega Content-Type y Accept automáticamente.
 * - Incluye credentials: 'include' para que las cookies HttpOnly viajen.
 * - Maneja timeout via AbortController.
 * - Lanza errores tipados para fácil captura en la UI.
 */
async function request<T>(
  path: string,
  options: SigloRequestInit = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, json, ...fetchOptions } = options;

  // AbortController para timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const headers = new Headers(fetchOptions.headers);
  headers.set('Accept', 'application/json');
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include',       // Cookies HttpOnly automáticas
      signal: controller.signal,
      headers,
      body: json !== undefined ? JSON.stringify(json) : fetchOptions.body,
    });

    clearTimeout(timer);

    // Respuestas 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // Parsear JSON
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let code: string | undefined;
      let message = `HTTP ${response.status}`;
      let details: unknown;

      if (data && typeof data === 'object') {
        if ('error' in data && data.error) {
          if (typeof data.error === 'object') {
            const errObj = data.error as { code?: string; message?: string; details?: unknown };
            code = errObj.code;
            message = errObj.message || message;
            details = errObj.details;
          } else if (typeof data.error === 'string') {
            message = data.error;
            code = (data as { code?: string }).code;
            details = (data as { details?: unknown }).details;
          }
        } else if ('message' in data && typeof data.message === 'string') {
          message = data.message;
          code = (data as { code?: string }).code;
          details = (data as { details?: unknown }).details;
        }
      }

      throw new ApiRequestError(
        response.status,
        code,
        message,
        details,
      );
    }

    return data as T;
  } catch (error) {
    clearTimeout(timer);

    if (error instanceof ApiRequestError) {
      if (error.status === 401 && unauthorizedCallback) {
        unauthorizedCallback(path);
      }
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TimeoutError();
    }

    // TypeError de fetch = sin red
    if (error instanceof TypeError || !navigator.onLine) {
      throw new NetworkError();
    }

    throw error;
  }
}

let unauthorizedCallback: ((path: string) => void) | null = null;

export function registerUnauthorizedCallback(callback: (path: string) => void) {
  unauthorizedCallback = callback;
}

// ─── Public API Client ────────────────────────────────────────────────────────

/**
 * Cliente tipado para el API de SIGLO.
 * Todos los métodos lanzan NetworkError cuando no hay conexión —
 * el llamador puede capturarlo y encolar la operación offline.
 */
export const api = {
  /**
   * GET /path
   */
  get<T>(path: string, options?: SigloRequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'GET' });
  },

  /**
   * POST /path con body JSON
   */
  post<T>(path: string, body: unknown, options?: SigloRequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'POST', json: body });
  },

  /**
   * PUT /path con body JSON
   */
  put<T>(path: string, body: unknown, options?: SigloRequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'PUT', json: body });
  },

  /**
   * PATCH /path con body JSON parcial
   */
  patch<T>(path: string, body: unknown, options?: SigloRequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'PATCH', json: body });
  },

  /**
   * DELETE /path
   */
  delete<T>(path: string, options?: SigloRequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'DELETE' });
  },

  /**
   * Comprueba si el servidor es alcanzable haciendo GET /api/v1/health.
   * Útil antes de intentar sincronización.
   */
  async isReachable(): Promise<boolean> {
    try {
      await request('/api/v1/health', { method: 'GET', timeoutMs: 4_000 });
      return true;
    } catch {
      return false;
    }
  },
} as const;

// ─── Catalog helpers ──────────────────────────────────────────────────────────

/**
 * Obtiene el catálogo completo del servidor.
 * Retorna la respuesta paginada de productos.
 */
export async function fetchCatalog<T>(): Promise<ApiResponse<T>> {
  return api.get<ApiResponse<T>>('/api/v1/catalog/products');
}

/**
 * Obtiene los lotes de stock del servidor.
 */
export async function fetchLotes<T>(): Promise<ApiResponse<T>> {
  return api.get<ApiResponse<T>>('/api/v1/catalog/lots');
}

/**
 * Obtiene los clientes asignados al vendedor autenticado.
 */
export async function fetchClientes<T>(): Promise<ApiResponse<T>> {
  return api.get<ApiResponse<T>>('/api/v1/clients');
}

// ─── Jornada helpers ──────────────────────────────────────────────────────────

/**
 * Obtiene los vehículos disponibles del abonado.
 */
export async function fetchVehiculos(): Promise<ApiResponse<Vehiculo[]>> {
  return api.get<ApiResponse<Vehiculo[]>>('/api/v1/vehiculos');
}

/**
 * Obtiene las rutas activas del abonado.
 */
export async function fetchRutas(): Promise<ApiResponse<Ruta[]>> {
  return api.get<ApiResponse<Ruta[]>>('/api/v1/rutas');
}

/**
 * Obtiene la jornada abierta activa del vendedor autenticado (o null si no hay).
 */
export async function fetchJornadaActiva(): Promise<ApiResponse<Jornada | null>> {
  return api.get<ApiResponse<Jornada | null>>('/api/v1/jornadas/activa');
}

/**
 * Obtiene el detalle completo de una jornada por ID.
 */
export async function fetchJornadaDetalle(id: number): Promise<ApiResponse<Jornada>> {
  return api.get<ApiResponse<Jornada>>(`/api/v1/jornadas/${id}`);
}

/**
 * Abre una nueva jornada para el vendedor autenticado.
 * Requiere conexión activa (no debe encolarse offline).
 */
export async function abrirJornada(payload: AbrirJornadaPayload): Promise<ApiResponse<Jornada>> {
  return api.post<ApiResponse<Jornada>>('/api/v1/jornadas', payload);
}

/**
 * Carga stock desde depósito hacia el vehículo asignado a la jornada.
 * Requiere conexión activa (no debe encolarse offline).
 */
export async function cargarStockVehiculo(
  idJornada: string,
  payload: CargarStockPayload,
): Promise<ApiResponse<ResumenCargaStock>> {
  return api.post<ApiResponse<ResumenCargaStock>>(`/api/v1/jornadas/${idJornada}/carga`, payload);
}

/**
 * Cierra la jornada activa, concilia stock y devuelve resumen de ventas/cobros.
 * Requiere conexión activa (no debe encolarse offline).
 */
export async function cerrarJornada(
  idJornada: string,
  payload?: CierreJornadaPayload,
): Promise<ApiResponse<ResumenCierre>> {
  return api.post<ApiResponse<ResumenCierre>>(`/api/v1/jornadas/${idJornada}/cierre`, payload ?? {});
}

// ─── ADR-013: Cuentas Corrientes y Cobros ─────────────────────────────────────

/**
 * Obtiene el resumen de saldos pendientes de todos los clientes.
 */
export async function getClientesSaldosPendientes(): Promise<ApiResponse<SaldoCliente[]>> {
  return api.get<ApiResponse<SaldoCliente[]>>('/api/v1/sales/clientes/saldos');
}

/**
 * Obtiene el listado de ventas con cobro pendiente para un cliente específico.
 */
export async function getVentasPendientesByCliente(
  clienteId: number
): Promise<ApiResponse<VentaPendiente[]>> {
  return api.get<ApiResponse<VentaPendiente[]>>(
    `/api/v1/sales/cliente/${clienteId}/pendientes`
  );
}

// ─── ADR-014: Empresa / Administración ────────────────────────────────────────

/**
 * Obtiene el perfil de la empresa del abonado.
 */
export async function getEmpresaPerfil(): Promise<ApiResponse<EmpresaPerfil>> {
  return api.get<ApiResponse<EmpresaPerfil>>('/api/v1/admin/empresa');
}

/**
 * Actualiza los datos de la empresa del abonado.
 */
export async function updateEmpresaPerfil(
  payload: UpdateEmpresaPayload
): Promise<ApiResponse<EmpresaPerfil>> {
  return api.patch<ApiResponse<EmpresaPerfil>>('/api/v1/admin/empresa', payload);
}

// ─── ADR-014 Entrega B: Empleados ─────────────────────────────────────────────

/**
 * Obtiene el listado de empleados del abonado con filtro opcional por activo.
 */
export async function getEmpleados(activo?: 0 | 1): Promise<ApiResponse<EmpleadoItem[]>> {
  const query = activo !== undefined ? `?activo=${activo}` : '';
  return api.get<ApiResponse<EmpleadoItem[]>>(`/api/v1/admin/empleados${query}`);
}

/**
 * Obtiene el detalle de un empleado por ID.
 */
export async function getEmpleadoById(id: number): Promise<ApiResponse<EmpleadoItem>> {
  return api.get<ApiResponse<EmpleadoItem>>(`/api/v1/admin/empleados/${id}`);
}

/**
 * Crea un nuevo empleado.
 */
export async function createEmpleado(payload: unknown): Promise<ApiResponse<EmpleadoItem>> {
  return api.post<ApiResponse<EmpleadoItem>>('/api/v1/admin/empleados', payload);
}

/**
 * Actualiza un empleado existente.
 */
export async function updateEmpleado(
  id: number,
  payload: unknown
): Promise<ApiResponse<EmpleadoItem>> {
  return api.patch<ApiResponse<EmpleadoItem>>(`/api/v1/admin/empleados/${id}`, payload);
}

// ─── ADR-014 Entrega B: Vehículos ─────────────────────────────────────────────

/**
 * Obtiene el listado de todos los vehículos en modo gestión.
 */
export async function getVehiculosAdmin(): Promise<ApiResponse<VehiculoAdminItem[]>> {
  return api.get<ApiResponse<VehiculoAdminItem[]>>('/api/v1/admin/vehiculos');
}

/**
 * Crea un nuevo vehículo.
 */
export async function createVehiculo(payload: unknown): Promise<ApiResponse<VehiculoAdminItem>> {
  return api.post<ApiResponse<VehiculoAdminItem>>('/api/v1/admin/vehiculos', payload);
}

/**
 * Actualiza un vehículo existente.
 */
export async function updateVehiculo(
  id: number,
  payload: unknown
): Promise<ApiResponse<VehiculoAdminItem>> {
  return api.patch<ApiResponse<VehiculoAdminItem>>(`/api/v1/admin/vehiculos/${id}`, payload);
}

// ─── ADR-014 Entrega B: Rutas ─────────────────────────────────────────────────

/**
 * Obtiene el listado de todas las rutas en modo gestión.
 */
export async function getRutasAdmin(): Promise<ApiResponse<RutaAdminItem[]>> {
  return api.get<ApiResponse<RutaAdminItem[]>>('/api/v1/admin/rutas');
}

/**
 * Crea una nueva ruta.
 */
export async function createRuta(payload: unknown): Promise<ApiResponse<RutaAdminItem>> {
  return api.post<ApiResponse<RutaAdminItem>>('/api/v1/admin/rutas', payload);
}

/**
 * Actualiza una ruta existente.
 */
export async function updateRuta(
  id: number,
  payload: unknown
): Promise<ApiResponse<RutaAdminItem>> {
  return api.patch<ApiResponse<RutaAdminItem>>(`/api/v1/admin/rutas/${id}`, payload);
}

// ─── ADR-014 Entrega B Prompt B: Productos ───────────────────────────────────

/**
 * Obtiene las unidades de medida disponibles para productos.
 */
export async function getUnidadesMedida(): Promise<ApiResponse<UnidadMedidaItem[]>> {
  return api.get<ApiResponse<UnidadMedidaItem[]>>('/api/v1/admin/productos/unidades');
}

/**
 * Obtiene el listado de productos en modo gestión con filtro opcional por activo.
 */
export async function getProductosAdmin(
  activo?: 0 | 1
): Promise<ApiResponse<ProductoAdminItem[]>> {
  const query = activo !== undefined ? `?activo=${activo}` : '';
  return api.get<ApiResponse<ProductoAdminItem[]>>(`/api/v1/admin/productos${query}`);
}

/**
 * Obtiene el detalle de un producto para edición.
 */
export async function getProductoAdminById(
  id: number
): Promise<ApiResponse<ProductoAdminDetalle>> {
  return api.get<ApiResponse<ProductoAdminDetalle>>(`/api/v1/admin/productos/${id}`);
}

/**
 * Crea un nuevo producto en modo gestión.
 */
export async function createProducto(
  payload: unknown
): Promise<ApiResponse<ProductoAdminDetalle>> {
  return api.post<ApiResponse<ProductoAdminDetalle>>('/api/v1/admin/productos', payload);
}

/**
 * Actualiza un producto existente en modo gestión.
 */
export async function updateProducto(
  id: number,
  payload: unknown
): Promise<ApiResponse<ProductoAdminDetalle>> {
  return api.patch<ApiResponse<ProductoAdminDetalle>>(`/api/v1/admin/productos/${id}`, payload);
}


