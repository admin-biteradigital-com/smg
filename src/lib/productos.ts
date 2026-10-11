/**
 * Utilidades puras para productos y unidades de compra/base.
 */

export interface ValidarFactorResultado {
  valido: boolean;
  factor: number | null;
  error?: string;
}

/**
 * Valida el factor de conversión según si la unidad de compra es distinta de la unidad base.
 */
export function validarFactorConversion(
  factorRaw: string | number | null | undefined,
  esDistintaUnidad: boolean,
  nombreUnidadBase = 'unidades base',
  nombreUnidadCompra = 'unidad de compra'
): ValidarFactorResultado {
  if (!esDistintaUnidad) {
    return { valido: true, factor: null };
  }

  if (factorRaw === null || factorRaw === undefined || String(factorRaw).trim() === '') {
    return {
      valido: false,
      factor: null,
      error: `Debes indicar cuántas ${nombreUnidadBase} trae cada ${nombreUnidadCompra}.`,
    };
  }

  const clean = String(factorRaw).trim();
  const num = Number(clean);

  if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
    return {
      valido: false,
      factor: null,
      error: 'El factor de conversión debe ser un número entero mayor o igual a 1.',
    };
  }

  return {
    valido: true,
    factor: num,
  };
}

export interface DeterminarFactorYUnidadesParams {
  idUnidadBase: number | string;
  idUnidadCompra: number | string | null | undefined;
  factorConversionCompra?: number | string | null;
}

export interface DeterminarFactorYUnidadesResultado {
  idUnidadCompra: number | null;
  factorConversionCompra: number | null;
  esDistintaUnidad: boolean;
}

/**
 * Resuelve qué idUnidadCompra y factorConversionCompra enviar en el payload del producto.
 */
export function determinarFactorYUnidades(
  params: DeterminarFactorYUnidadesParams
): DeterminarFactorYUnidadesResultado {
  const { idUnidadBase, idUnidadCompra, factorConversionCompra } = params;

  const compraStr = idUnidadCompra !== null && idUnidadCompra !== undefined ? String(idUnidadCompra).trim() : '';
  const baseStr = String(idUnidadBase).trim();

  // Si no seleccionó unidad de compra ("Igual a unidad base") o es igual a la unidad base:
  if (!compraStr || compraStr === baseStr) {
    return {
      idUnidadCompra: compraStr ? Number(compraStr) : null,
      factorConversionCompra: null,
      esDistintaUnidad: false,
    };
  }

  // Unidad de compra distinta:
  const factorClean =
    factorConversionCompra !== null && factorConversionCompra !== undefined
      ? String(factorConversionCompra).trim()
      : '';
  const factorNum = factorClean ? Number(factorClean) : null;
  const factorValido =
    factorNum !== null && !isNaN(factorNum) && Number.isInteger(factorNum) && factorNum >= 1
      ? factorNum
      : null;

  return {
    idUnidadCompra: Number(compraStr),
    factorConversionCompra: factorValido,
    esDistintaUnidad: true,
  };
}

/**
 * Genera el texto de vista previa del factor de compra:
 * "1 caja = 24 display. Se compra por caja; stock y ventas por display."
 */
export function formatearVistaPreviaFactor(params: {
  nombreUnidadCompra?: string | null;
  factor: number | string;
  nombreUnidadBase?: string | null;
}): string | null {
  const { nombreUnidadCompra, factor, nombreUnidadBase } = params;
  const num = Number(factor);
  if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
    return null;
  }

  const uCompra = nombreUnidadCompra?.trim() || 'unidad de compra';
  const uBase = nombreUnidadBase?.trim() || 'unidades base';

  return `1 ${uCompra} = ${num} ${uBase}. Se compra por ${uCompra}; stock y ventas por ${uBase}.`;
}

/**
 * Genera la etiqueta con unidad base ("Costo por display", "Precio de Venta Sugerido ($) por display").
 */
export function formatearEtiquetaConUnidad(etiqueta: string, nombreUnidad?: string | null): string {
  const cleanUnidad = nombreUnidad?.trim();
  if (!cleanUnidad) return etiqueta;
  return `${etiqueta} por ${cleanUnidad}`;
}

/**
 * Genera el badge/texto secundario para listado de productos ("Compra: caja × 24 display").
 */
export function formatearResumenFactorListado(params: {
  nombreUnidadCompra?: string | null;
  factor?: number | null;
  nombreUnidadBase?: string | null;
}): string | null {
  const { nombreUnidadCompra, factor, nombreUnidadBase } = params;
  if (!factor || factor <= 1) return null;

  const uCompra = nombreUnidadCompra?.trim() || 'caja';
  const uBase = nombreUnidadBase?.trim() || 'unidad';

  return `Compra: ${uCompra} × ${factor} ${uBase}`;
}
