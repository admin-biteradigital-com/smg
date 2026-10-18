import type {
  OrdenCompraEstado,
  OrdenCompraEstadoPago,
  OrdenCompraCondicionPago,
  ProveedorProductoItem,
  ProductoAdminItem,
} from '@/types';

// ─── Días Hábiles ─────────────────────────────────────────────────────────────

/**
 * Añade N días hábiles (lunes a viernes) a una fecha base.
 * @param fechaBase Fecha base (Date o string YYYY-MM-DD). Por defecto hoy.
 * @param diasHabiles Cantidad de días hábiles a sumar (default: 4).
 * @returns Fecha en formato YYYY-MM-DD.
 */
export function sugerirFechaEntregaEstimada(
  fechaBase?: Date | string,
  diasHabiles = 4
): string {
  let date: Date;
  if (!fechaBase) {
    date = new Date();
  } else if (typeof fechaBase === 'string') {
    const parts = fechaBase.split('T')[0].split('-');
    if (parts.length === 3) {
      date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    } else {
      date = new Date(fechaBase);
    }
  } else {
    date = new Date(fechaBase.getTime());
  }

  let agregados = 0;
  while (agregados < diasHabiles) {
    date.setDate(date.getDate() + 1);
    const diaSemana = date.getDay(); // 0 = Domingo, 6 = Sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      agregados++;
    }
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Retorna la fecha de hoy en formato local YYYY-MM-DD del dispositivo.
 */
export function getHoyString(now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Saldo y Cálculos ─────────────────────────────────────────────────────────

/**
 * Calcula el saldo pendiente de una orden (total menos suma de pagos).
 */
export function calcularSaldoOrden(
  total: number,
  pagos?: Array<{ monto: number }> | null
): number {
  if (typeof total !== 'number' || isNaN(total)) return 0;
  const totalPagado = (pagos || []).reduce((acc, p) => acc + (p.monto || 0), 0);
  return Math.max(0, total - totalPagado);
}

// ─── Indicadores Calculados en Cliente ────────────────────────────────────────

/**
 * Determina si una orden de compra tiene el pago vencido.
 * Regla: crédito, fecha_vencimiento_pago anterior a hoy, estado_pago !== 'pagado', y orden no cancelada.
 */
export function esPagoVencido(
  orden: {
    condicion_pago?: string | null;
    fecha_vencimiento_pago?: string | null;
    estado_pago?: string | null;
    estado?: string | null;
  },
  fechaReferencia = getHoyString()
): boolean {
  if (orden.estado === 'cancelada') return false;
  if (orden.condicion_pago !== 'credito') return false;
  if (orden.estado_pago === 'pagado') return false;
  if (!orden.fecha_vencimiento_pago || !orden.fecha_vencimiento_pago.trim()) return false;

  const fechaVenc = orden.fecha_vencimiento_pago.split('T')[0].split(' ')[0];
  if (!fechaVenc) return false;
  return fechaVenc < fechaReferencia;
}

/**
 * Determina si la entrega de una orden confirmada está demorada.
 * Regla: estado = 'confirmada' y fecha_entrega_estimada anterior a hoy.
 */
export function esEntregaDemorada(
  orden: {
    estado?: string | null;
    fecha_entrega_estimada?: string | null;
  },
  fechaReferencia = getHoyString()
): boolean {
  if (orden.estado !== 'confirmada') return false;
  if (!orden.fecha_entrega_estimada) return false;

  const fechaEntrega = orden.fecha_entrega_estimada.split('T')[0].split(' ')[0];
  return fechaEntrega < fechaReferencia;
}

// ─── Validación Condicional de Condición de Pago ─────────────────────────────

export interface ValidacionCondicionPagoResult {
  valido: boolean;
  error?: string;
}

/**
 * Valida la coherencia de la condición de pago y su fecha de vencimiento.
 * Para 'credito', ya no se exige fecha de vencimiento al crear o editar.
 */
export function validarCondicionPago(
  condicionPago: OrdenCompraCondicionPago,
  fechaVencimiento?: string | null
): ValidacionCondicionPagoResult {
  if (condicionPago === 'credito') {
    return { valido: true };
  }

  if (condicionPago === 'contado') {
    if (fechaVencimiento !== undefined && fechaVencimiento !== null && fechaVencimiento.trim() !== '') {
      return {
        valido: false,
        error: 'Las órdenes al contado no deben tener fecha de vencimiento.',
      };
    }
    return { valido: true };
  }

  return { valido: true };
}

/**
 * Calcula el costo inicial por unidad de compra al agregar un producto a la orden de compra.
 * - Si el producto no tiene costo (null, undefined o <= 0), retorna null (campo queda vacío).
 * - Si tiene costo, multiplica precioCosto x factorConversion (factor 1 si no hay).
 */
export function calcularCostoInicialCompra(
  precioCosto?: number | null,
  factorConversion?: number | null
): number | null {
  if (precioCosto === null || precioCosto === undefined || precioCosto <= 0) {
    return null;
  }
  const factor = factorConversion && factorConversion > 1 ? factorConversion : 1;
  return Math.round(precioCosto * factor);
}

/**
 * Formatea el texto de costo derivado y equivalencia por unidad bajo la línea:
 * "= 120 display (24 por caja) · $100 c/u" (o "≈ $X c/u" si no es exacto).
 */
export function formatearDetalleEquivalenciaLinea(params: {
  cantidad: number;
  costoPorUnidadCompra: number;
  factorConversion: number;
  nombreUnidadBase: string;
  nombreUnidadCompra: string;
}): string | null {
  const { cantidad, costoPorUnidadCompra, factorConversion, nombreUnidadBase, nombreUnidadCompra } = params;
  if (!factorConversion || factorConversion <= 1) return null;
  if (cantidad <= 0 || isNaN(cantidad)) return null;

  const totalBase = cantidad * factorConversion;
  const costoBaseExacto = costoPorUnidadCompra > 0 ? costoPorUnidadCompra / factorConversion : 0;
  const esExacto = Number.isInteger(costoBaseExacto);
  const costoBaseRedondeado = Math.round(costoBaseExacto);
  const prefijoPrecio = esExacto ? '$' : '≈ $';

  return `= ${totalBase} ${nombreUnidadBase} (${factorConversion} por ${nombreUnidadCompra}) · ${prefijoPrecio}${costoBaseRedondeado.toLocaleString('es-CL')} c/u`;
}

export type DecisionProveedoresProducto =
  | { accion: 'sin_proveedores'; mensaje: string }
  | { accion: 'un_proveedor'; proveedor: ProveedorProductoItem }
  | { accion: 'multiples_proveedores'; proveedores: ProveedorProductoItem[] };

/**
 * Resuelve la acción a tomar según la cantidad de proveedores asociados al producto:
 * - 0: aviso y no agregar
 * - 1: asignar proveedor y agregar
 * - 2+: modal de selección sin opción preseleccionada
 */
export function resolverSeleccionProveedor(
  proveedores?: ProveedorProductoItem[] | null
): DecisionProveedoresProducto {
  const lista = proveedores || [];
  if (lista.length === 0) {
    return {
      accion: 'sin_proveedores',
      mensaje: 'Este producto no tiene proveedores asociados. Asocialo desde el producto.',
    };
  }
  if (lista.length === 1) {
    return {
      accion: 'un_proveedor',
      proveedor: lista[0],
    };
  }
  return {
    accion: 'multiples_proveedores',
    proveedores: lista,
  };
}

export interface ValidacionCambioProveedorResult {
  permitido: boolean;
  requiereConfirmacion: boolean;
  motivo?: 'no_permitido_con_lineas' | 'sin_cambio';
  mensaje?: string;
}

/**
 * Decide si se permite cambiar el proveedor de una orden de compra o si requiere confirmación.
 * - Si no hay líneas cargadas, se permite cambiar a cualquier proveedor o vaciarlo libremente.
 * - Con líneas cargadas, NO está permitido elegir la opción vacía (el proveedor no puede quedar vacío).
 * - Con líneas cargadas, cambiar a otro proveedor válido requiere confirmación (para descartar productos no asociados).
 * - Si no cambia el proveedor, se permite sin confirmación.
 */
export function validarCambioProveedor(
  idProveedorActual: number | '' | null | undefined,
  nuevoIdProveedor: number | '' | null | undefined,
  cantidadLineas: number
): ValidacionCambioProveedorResult {
  const actual = idProveedorActual || '';
  const nuevo = nuevoIdProveedor || '';

  if (actual === nuevo) {
    return { permitido: true, requiereConfirmacion: false, motivo: 'sin_cambio' };
  }

  if (cantidadLineas <= 0) {
    return { permitido: true, requiereConfirmacion: false };
  }

  // Con líneas cargadas, no se permite opción vacía
  if (nuevo === '') {
    return {
      permitido: false,
      requiereConfirmacion: false,
      motivo: 'no_permitido_con_lineas',
      mensaje: 'No puedes dejar la orden sin proveedor si ya tiene líneas cargadas.',
    };
  }

  // Cambiar a otro proveedor con líneas cargadas requiere confirmación
  return {
    permitido: true,
    requiereConfirmacion: true,
  };
}

export interface ConsistenciaLineasProveedorResult {
  consistente: boolean;
  lineasInconsistentes: Array<{
    id_producto: number;
    nombre?: string;
  }>;
}

/**
 * Verifica que todos los productos de las líneas pertenezcan al conjunto de productos asociados al proveedor.
 */
export function verificarConsistenciaLineasProveedor(
  lineas: Array<{ id_producto: number; nombre?: string }>,
  idsValidosDelProveedor: Set<number> | number[]
): ConsistenciaLineasProveedorResult {
  const setValidos =
    idsValidosDelProveedor instanceof Set
      ? idsValidosDelProveedor
      : new Set(idsValidosDelProveedor);

  const lineasInconsistentes = (lineas || []).filter(
    (l) => !setValidos.has(l.id_producto)
  );

  return {
    consistente: lineasInconsistentes.length === 0,
    lineasInconsistentes,
  };
}

// ─── Selector de Productos en Órdenes de Compra ──────────────────────────────

/**
 * Filtra y ordena el catálogo de productos para el selector de órdenes de compra.
 * - Siempre ordena alfabéticamente por nombre (locale 'es', insensible a mayúsculas/minúsculas).
 * - Sin término de búsqueda: retorna la lista completa sin recortar (sin tope).
 * - Con término de búsqueda: busca coincidencias parciales en nombre o código de barras sobre el total de productos.
 * - Incluye productos sin costo y sin proveedor (no filtra por esos atributos).
 */
export function filtrarYOrdenarProductosSelector(
  productos: ProductoAdminItem[],
  busqueda?: string
): ProductoAdminItem[] {
  if (!Array.isArray(productos) || productos.length === 0) {
    return [];
  }

  const term = (busqueda || '').trim().toLowerCase();

  const filtrados = term
    ? productos.filter((p) => {
        const matchNombre = p.nombre ? p.nombre.toLowerCase().includes(term) : false;
        const matchCodigo = p.codigoBarras
          ? p.codigoBarras.toLowerCase().includes(term)
          : false;
        return matchNombre || matchCodigo;
      })
    : [...productos];

  return filtrados.sort((a, b) =>
    (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
  );
}

/**
 * Genera el texto descriptivo del estado visible del selector de productos.
 * Ejemplos:
 * - Sin proveedor: "Todos los productos (42)"
 * - Con proveedor: "Productos de Distribuidora Central (15)"
 */
export function obtenerEtiquetaCatalogo(
  nombreProveedor: string | null | undefined,
  total: number
): string {
  const count = typeof total === 'number' && !isNaN(total) && total >= 0 ? total : 0;
  if (!nombreProveedor || !nombreProveedor.trim()) {
    return `Todos los productos (${count})`;
  }
  return `Productos de ${nombreProveedor.trim()} (${count})`;
}

// ─── Formateo de Fechas (compatible con SQLite UTC, ISO UTC y Solo Fecha) ─────

/**
 * Parsea un instante UTC proveniente de SIGLO:
 * - Formato ISO con zona: "2026-10-18T00:30:00.000Z"
 * - Formato SQLite datetime sin zona (en UTC): "2026-10-18 00:30:00"
 * Siempre lo interpreta explícitamente en UTC.
 */
export function parseInstanteUTC(fechaStr?: string | null): Date | null {
  if (!fechaStr) return null;
  const trimmed = fechaStr.trim();
  if (!trimmed) return null;

  // Formato SQLite datetime: 'YYYY-MM-DD HH:MM:SS' o 'YYYY-MM-DD HH:MM'
  const matchSqlite = trimmed.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (matchSqlite) {
    const year = Number(matchSqlite[1]);
    const month = Number(matchSqlite[2]) - 1;
    const day = Number(matchSqlite[3]);
    const hour = Number(matchSqlite[4]);
    const minute = Number(matchSqlite[5]);
    const second = matchSqlite[6] ? Number(matchSqlite[6]) : 0;
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  // Formato ISO: si tiene 'T' pero carece de sufijo 'Z' u offset (+/-), agregar 'Z'
  let iso = trimmed;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?$/.test(trimmed)) {
    iso = `${trimmed}Z`;
  }

  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export const parseFechaSegura = parseInstanteUTC;

/**
 * Formatea un campo que es exclusivamente una fecha de calendario ('YYYY-MM-DD').
 * Muestra el mismo día calendario que viene del servidor, sin ninguna conversión de zona.
 */
export function formatSoloFecha(fechaStr?: string | null): string {
  if (!fechaStr) return '—';
  const trimmed = fechaStr.trim();
  if (!trimmed) return '—';

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '—';

  const yyyy = match[1];
  const mm = match[2];
  const dd = match[3];
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Formatea un instante UTC a fecha en la zona horaria del dispositivo (DD/MM/YYYY).
 * Permite especificar timeZone para tests puros (ej: 'America/Montevideo').
 */
export function formatInstanteFecha(fechaStr?: string | null, timeZone?: string): string {
  const d = parseInstanteUTC(fechaStr);
  if (!d) return '—';

  const formatter = new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  });

  const parts = formatter.formatToParts(d);
  const day = parts.find((p) => p.type === 'day')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const year = parts.find((p) => p.type === 'year')?.value || '';
  return `${day}/${month}/${year}`;
}

/**
 * Formatea un instante UTC a fecha y hora en la zona horaria del dispositivo (DD/MM/YYYY HH:mm).
 * Permite especificar timeZone para tests puros (ej: 'America/Montevideo').
 */
export function formatInstanteFechaHora(fechaStr?: string | null, timeZone?: string): string {
  const d = parseInstanteUTC(fechaStr);
  if (!d) return '—';

  const formatter = new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  });

  const parts = formatter.formatToParts(d);
  const day = parts.find((p) => p.type === 'day')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const year = parts.find((p) => p.type === 'year')?.value || '';
  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

/**
 * Formatea una fecha según su tipo:
 * - Si contiene tiempo ('T' o ' ' con hora), la trata como instante UTC y convierte a zona local.
 * - Si es solo fecha ('YYYY-MM-DD'), la formatea sin conversión de zona.
 */
export function formatFecha(fechaStr?: string | null, timeZone?: string): string {
  if (!fechaStr) return '—';
  const trimmed = fechaStr.trim();
  if (/[ T]\d{1,2}:\d{2}/.test(trimmed)) {
    return formatInstanteFecha(trimmed, timeZone);
  }
  return formatSoloFecha(trimmed);
}

export function formatFechaHora(fechaStr?: string | null, timeZone?: string): string {
  return formatInstanteFechaHora(fechaStr, timeZone);
}

/**
 * Formatea montos en pesos chilenos ($1.234.567).
 */
export function formatCLP(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || isNaN(monto)) return '$0';
  return `$${Math.round(monto).toLocaleString('es-CL')}`;
}

// ─── Estilos y Badges ─────────────────────────────────────────────────────────

export function getEstadoBadge(estado: OrdenCompraEstado | string): {
  label: string;
  className: string;
} {
  switch (estado) {
    case 'borrador':
      return {
        label: 'Borrador',
        className: 'bg-zinc-800 text-zinc-300 border-zinc-700',
      };
    case 'confirmada':
      return {
        label: 'Confirmada',
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      };
    case 'recibida':
      return {
        label: 'Recibida',
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      };
    case 'cancelada':
      return {
        label: 'Cancelada',
        className: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      };
    default:
      return {
        label: estado,
        className: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      };
  }
}

export function getEstadoPagoBadge(estadoPago: OrdenCompraEstadoPago | string): {
  label: string;
  className: string;
} {
  switch (estadoPago) {
    case 'pendiente':
      return {
        label: 'Pago Pendiente',
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      };
    case 'pagado_parcial':
      return {
        label: 'Pago Parcial',
        className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      };
    case 'pagado':
      return {
        label: 'Pagado',
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      };
    default:
      return {
        label: estadoPago,
        className: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      };
  }
}

// ─── Avisos de Pago Pendiente ─────────────────────────────────────────────────

export type TipoAvisoPago =
  | 'contado'
  | 'credito_sin_vencimiento'
  | 'futuro'
  | 'hoy'
  | 'pasado';

/**
 * Decide el tipo de aviso de pago pendiente para una orden de compra:
 * - null si la orden no está recibida o si ya está pagada.
 * - 'contado' si la condición es contado con pago pendiente.
 * - 'credito_sin_vencimiento' si es crédito recibida sin fecha de vencimiento cargada.
 * - 'futuro' si el vencimiento es posterior a hoy.
 * - 'hoy' si el vencimiento es hoy.
 * - 'pasado' si el vencimiento ya pasó (vencido).
 */
export function determinarTipoAvisoPago(
  orden?: {
    estado?: string | null;
    condicion_pago?: string | null;
    estado_pago?: string | null;
    fecha_vencimiento_pago?: string | null;
  } | null,
  hoy: string = getHoyString()
): TipoAvisoPago | null {
  if (!orden || orden.estado !== 'recibida') return null;
  if (orden.estado_pago === 'pagado') return null;

  if (orden.condicion_pago === 'credito') {
    const vencimiento = orden.fecha_vencimiento_pago
      ? orden.fecha_vencimiento_pago.split('T')[0].trim()
      : '';

    if (!vencimiento) {
      return 'credito_sin_vencimiento';
    }
    if (vencimiento > hoy) {
      return 'futuro';
    }
    if (vencimiento === hoy) {
      return 'hoy';
    }
    return 'pasado';
  }

  return 'contado';
}

/**
 * Genera el texto del aviso para órdenes a crédito según su estado de vencimiento.
 */
export function construirTextoAvisoCredito(
  tipo: 'credito_sin_vencimiento' | 'futuro' | 'hoy' | 'pasado',
  fechaVencimiento?: string | null,
  saldoTexto?: string
): string {
  if (tipo === 'credito_sin_vencimiento') {
    return 'Orden recibida a crédito con pago pendiente. Todavía no cargaste el vencimiento: cargalo cuando llegue la factura del proveedor.';
  }
  const fechaStr = formatSoloFecha(fechaVencimiento);
  const saldoPart = saldoTexto !== undefined && saldoTexto !== null && saldoTexto !== '' ? ` (saldo ${saldoTexto})` : '';
  if (tipo === 'pasado') {
    return `Pago a crédito vencido el ${fechaStr}${saldoPart}.`;
  }
  return `Orden recibida a crédito con pago pendiente. Vence el ${fechaStr}${saldoPart}.`;
}

