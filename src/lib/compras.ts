import type {
  OrdenCompraEstado,
  OrdenCompraEstadoPago,
  OrdenCompraCondicionPago,
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
 * Retorna la fecha de hoy en formato YYYY-MM-DD.
 */
export function getHoyString(): string {
  const now = new Date();
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
  if (!orden.fecha_vencimiento_pago) return false;

  const fechaVenc = orden.fecha_vencimiento_pago.split('T')[0].split(' ')[0];
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
 */
export function validarCondicionPago(
  condicionPago: OrdenCompraCondicionPago,
  fechaVencimiento?: string | null
): ValidacionCondicionPagoResult {
  if (condicionPago === 'credito') {
    if (!fechaVencimiento || fechaVencimiento.trim() === '') {
      return {
        valido: false,
        error: 'La fecha de vencimiento es obligatoria cuando la condición es a crédito.',
      };
    }
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

// ─── Formateo de Fechas (compatible con SQLite y formato ISO) ─────────────────

/**
 * Parsea con seguridad fechas SQLite ('2026-10-04 15:30:00') o ISO ('2026-10-04T15:30:00Z').
 */
export function parseFechaSegura(fechaStr?: string | null): Date | null {
  if (!fechaStr) return null;
  const trimmed = fechaStr.trim();
  if (!trimmed) return null;

  // Regex para formato YYYY-MM-DD [HH:MM[:SS]]
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const hour = match[4] ? Number(match[4]) : 0;
    const minute = match[5] ? Number(match[5]) : 0;
    const second = match[6] ? Number(match[6]) : 0;
    return new Date(year, month, day, hour, minute, second);
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formatea una fecha a DD/MM/YYYY.
 */
export function formatFecha(fechaStr?: string | null): string {
  const d = parseFechaSegura(fechaStr);
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Formatea una fecha y hora a DD/MM/YYYY HH:mm.
 */
export function formatFechaHora(fechaStr?: string | null): string {
  const d = parseFechaSegura(fechaStr);
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
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
