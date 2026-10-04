import type { RegistrarRecepcionPayload, ItemRecepcionInput } from '@/types';
import { ApiRequestError } from '@/lib/api';
import { getHoyString } from '@/lib/compras';

// ─── Interfaces del Formulario de Recepción ───────────────────────────────────

export interface FilaLoteRecepcion {
  idFila: string;
  idProducto: number;
  nombreProducto: string;
  codigoProducto?: string | null;
  unidadCompra?: string | null;
  cantidadPedida: number;
  cantidadRecibida: number | string;
  numeroLote: string;
  fechaVencimiento: string;
}

export interface ResumenDiferenciaProducto {
  idProducto: number;
  nombreProducto: string;
  unidadCompra?: string | null;
  cantidadPedida: number;
  cantidadRecibida: number;
  diferencia: number; // cantidadRecibida - cantidadPedida
  tieneDiferencia: boolean;
  noRecibido: boolean;
}

export interface CalculoDiferenciasRecepcion {
  hayDiferencias: boolean;
  productosConDiferencia: ResumenDiferenciaProducto[];
  productosNoRecibidos: ResumenDiferenciaProducto[];
  resumenPorProducto: Record<number, ResumenDiferenciaProducto>;
  totalItemsValidos: number;
  totalCantidadRecibida: number;
}

export interface ErrorFilaRecepcion {
  cantidad?: string;
  numeroLote?: string;
  fechaVencimiento?: string;
}

export interface ValidacionRecepcionResultado {
  valido: boolean;
  erroresGenerales: string[];
  erroresPorFila: Record<string, ErrorFilaRecepcion>;
}

// ─── Armado de Payload (Contrato Zod .strict() camelCase) ─────────────────────

/**
 * Arma el payload estricto para POST /api/v1/recepciones.
 * - Excluye filas con cantidad 0, vacía o inválida.
 * - Elimina campos adicionales que no pertenezcan al schema del backend.
 * - Asegura que nroGuiaRemision sea null o string no vacío.
 */
export function armarPayloadRecepcion(params: {
  idOrdenCompra: number;
  nroGuiaRemision?: string | null;
  filas: FilaLoteRecepcion[];
}): RegistrarRecepcionPayload {
  const { idOrdenCompra, nroGuiaRemision, filas } = params;

  const filasValidas = filas.filter((f) => {
    const num = Number(f.cantidadRecibida);
    return !isNaN(num) && num > 0;
  });

  const guia =
    nroGuiaRemision && nroGuiaRemision.trim().length > 0 ? nroGuiaRemision.trim() : null;

  const items: ItemRecepcionInput[] = filasValidas.map((f) => ({
    idProducto: f.idProducto,
    cantidadRecibida: Math.round(Number(f.cantidadRecibida)),
    numeroLote: f.numeroLote.trim(),
    fechaVencimiento: f.fechaVencimiento.trim(),
  }));

  return {
    idOrdenCompra,
    nroGuiaRemision: guia,
    items,
  };
}

// ─── Cálculo y Detección de Diferencias ───────────────────────────────────────

/**
 * Calcula la suma de cantidades recibidas por producto y detecta discrepancias con la orden.
 */
export function calcularDiferenciasRecepcion(
  lineasOrden: Array<{
    id_producto: number;
    cantidad: number;
    producto_nombre?: string | null;
    unidad_compra?: string | null;
  }>,
  filas: FilaLoteRecepcion[]
): CalculoDiferenciasRecepcion {
  // Sumar cantidad recibida por producto considerando sólo filas con cantidad > 0
  const sumaPorProducto: Record<number, number> = {};
  let totalItemsValidos = 0;
  let totalCantidadRecibida = 0;

  for (const f of filas) {
    const cant = Number(f.cantidadRecibida);
    if (!isNaN(cant) && cant > 0) {
      sumaPorProducto[f.idProducto] = (sumaPorProducto[f.idProducto] || 0) + cant;
      totalItemsValidos++;
      totalCantidadRecibida += cant;
    }
  }

  const resumenPorProducto: Record<number, ResumenDiferenciaProducto> = {};
  const productosConDiferencia: ResumenDiferenciaProducto[] = [];
  const productosNoRecibidos: ResumenDiferenciaProducto[] = [];

  for (const linea of lineasOrden) {
    const id = linea.id_producto;
    const recibida = sumaPorProducto[id] || 0;
    const pedida = linea.cantidad || 0;
    const diferencia = recibida - pedida;
    const tieneDiferencia = recibida !== pedida;
    const noRecibido = recibida === 0;

    const resumen: ResumenDiferenciaProducto = {
      idProducto: id,
      nombreProducto: linea.producto_nombre || `Producto #${id}`,
      unidadCompra: linea.unidad_compra,
      cantidadPedida: pedida,
      cantidadRecibida: recibida,
      diferencia,
      tieneDiferencia,
      noRecibido,
    };

    resumenPorProducto[id] = resumen;

    if (tieneDiferencia) {
      productosConDiferencia.push(resumen);
    }
    if (noRecibido) {
      productosNoRecibidos.push(resumen);
    }
  }

  return {
    hayDiferencias: productosConDiferencia.length > 0,
    productosConDiferencia,
    productosNoRecibidos,
    resumenPorProducto,
    totalItemsValidos,
    totalCantidadRecibida,
  };
}

// ─── Validación en Cliente ────────────────────────────────────────────────────

/**
 * Valida todos los campos antes de abrir la confirmación o enviar la recepción.
 */
export function validarFormularioRecepcion(params: {
  filas: FilaLoteRecepcion[];
  hayDiferencias: boolean;
  checkboxDiferenciaConfirmado: boolean;
}): ValidacionRecepcionResultado {
  const { filas, hayDiferencias, checkboxDiferenciaConfirmado } = params;
  const erroresGenerales: string[] = [];
  const erroresPorFila: Record<string, ErrorFilaRecepcion> = {};

  let filasConCantidadPositiva = 0;

  for (const fila of filas) {
    const errFila: ErrorFilaRecepcion = {};
    const cantRaw = fila.cantidadRecibida;
    const cantNum = Number(cantRaw);

    // Si está vacío o es 0, no se envía esta fila. Solo validar si se ingresó algo negativo.
    if (cantRaw === '' || cantNum === 0) {
      continue;
    }

    if (isNaN(cantNum) || cantNum < 0) {
      errFila.cantidad = 'La cantidad debe ser un número entero mayor a 0.';
    } else if (!Number.isInteger(cantNum)) {
      errFila.cantidad = 'La cantidad no puede contener decimales.';
    } else {
      filasConCantidadPositiva++;
    }

    // Si tiene cantidad positiva, lote y vencimiento son obligatorios
    if (cantNum > 0) {
      if (!fila.numeroLote || fila.numeroLote.trim().length === 0) {
        errFila.numeroLote = 'El número de lote es obligatorio.';
      }

      if (!fila.fechaVencimiento || fila.fechaVencimiento.trim().length === 0) {
        errFila.fechaVencimiento = 'La fecha de vencimiento es obligatoria.';
      } else {
        const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
        if (!regexFecha.test(fila.fechaVencimiento.trim())) {
          errFila.fechaVencimiento = 'Formato inválido (debe ser YYYY-MM-DD).';
        } else {
          const parts = fila.fechaVencimiento.trim().split('-');
          const y = Number(parts[0]);
          const m = Number(parts[1]);
          const d = Number(parts[2]);
          const dateObj = new Date(y, m - 1, d);
          if (
            isNaN(dateObj.getTime()) ||
            dateObj.getFullYear() !== y ||
            dateObj.getMonth() !== m - 1 ||
            dateObj.getDate() !== d
          ) {
            errFila.fechaVencimiento = 'Fecha de vencimiento no válida.';
          }
        }
      }
    }

    if (Object.keys(errFila).length > 0) {
      erroresPorFila[fila.idFila] = errFila;
    }
  }

  if (filasConCantidadPositiva === 0) {
    erroresGenerales.push('Debe registrar al menos un producto con cantidad mayor a 0.');
  }

  if (hayDiferencias && !checkboxDiferenciaConfirmado) {
    erroresGenerales.push(
      'La cantidad difiere de lo pedido. Debe confirmar que entiende que la orden se cierra igual y no se podrá recibir el resto.'
    );
  }

  const valido = erroresGenerales.length === 0 && Object.keys(erroresPorFila).length === 0;

  return {
    valido,
    erroresGenerales,
    erroresPorFila,
  };
}

// ─── Utilidades de Fechas y Vencimiento ───────────────────────────────────────

/**
 * Retorna true si la fecha de vencimiento es menor o igual a la fecha de referencia (hoy).
 */
export function esVencimientoPasado(
  fechaVencimientoStr?: string | null,
  fechaReferencia = getHoyString()
): boolean {
  if (!fechaVencimientoStr) return false;
  const clean = fechaVencimientoStr.trim().split('T')[0].split(' ')[0];
  if (!clean || clean.length < 10) return false;
  return clean <= fechaReferencia;
}

// ─── Traducción de Errores de API ─────────────────────────────────────────────

export interface ErrorRecepcionTraducido {
  titulo: string;
  descripcion: string;
  esErrorConversion?: boolean;
  esErrorEstado?: boolean;
  detallesCampos?: string[];
}

/**
 * Traduce errores de la API de SIGLO a mensajes claros para el usuario final.
 */
export function traducirErrorRecepcion(err: unknown): ErrorRecepcionTraducido {
  if (err instanceof ApiRequestError) {
    if (err.code === 'CONVERSION_REQUIRED') {
      return {
        titulo: 'Conversión de unidades no configurada',
        descripcion:
          'Uno de los productos se compra en una unidad distinta de la base y no tiene una conversión definida en el sistema. Debe configurarse la unidad antes de poder recibirse.',
        esErrorConversion: true,
      };
    }

    if (err.code === 'INVALID_ORDER_STATE') {
      return {
        titulo: 'Estado de orden inválido',
        descripcion:
          'Solo se pueden recibir órdenes en estado confirmada. El estado actual de la orden no permite recepciones.',
        esErrorEstado: true,
      };
    }

    if (err.code === 'NOT_FOUND') {
      return {
        titulo: 'Recurso no encontrado',
        descripcion:
          'La orden de compra o uno de los productos no fue encontrado en el servidor.',
      };
    }

    if (err.code === 'INVALID_INPUT') {
      const detalles: string[] = [];
      if (err.details) {
        if (typeof err.details === 'object') {
          if (Array.isArray(err.details)) {
            for (const item of err.details) {
              detalles.push(typeof item === 'string' ? item : JSON.stringify(item));
            }
          } else {
            for (const [key, val] of Object.entries(err.details)) {
              detalles.push(`${key}: ${Array.isArray(val) ? val.join(', ') : val}`);
            }
          }
        } else {
          detalles.push(String(err.details));
        }
      }

      return {
        titulo: 'Datos de recepción inválidos',
        descripcion:
          detalles.length > 0
            ? 'Los siguientes campos no cumplen con el formato requerido:'
            : 'Los datos enviados no son válidos.',
        detallesCampos: detalles,
      };
    }

    return {
      titulo: `Error del servidor (${err.status})`,
      descripcion:
        err.message || 'Ocurrió un error inesperado al registrar la recepción de mercadería.',
    };
  }

  if (err instanceof Error) {
    return {
      titulo: 'Error inesperado',
      descripcion: err.message,
    };
  }

  return {
    titulo: 'Error de comunicación',
    descripcion: 'No se pudo registrar la recepción. Verifique su conexión a internet.',
  };
}
