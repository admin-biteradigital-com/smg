/**
 * Utilidades para normalización, formateo y validación de RUT chileno (Módulo 11).
 * Implementación canónica compartida y compatible 100% con SIGLO backend.
 */

/**
 * Limpia un RUT eliminando puntos, espacios y pasando el dígito verificador a mayúscula.
 */
export function cleanRut(rut: string): string {
  if (typeof rut !== 'string') return '';
  return rut.replace(/[\.\s]/g, '').toUpperCase().trim();
}

/**
 * Valida un RUT chileno utilizando el algoritmo Módulo 11.
 * Acepta formatos con y sin puntos, con y sin guion:
 * Ej: '77.689.935-6', '77689935-6', '76.507.455-K', '76507455K'.
 */
export function validateRut(rut: string): boolean {
  if (!rut || typeof rut !== 'string') return false;

  const cleaned = cleanRut(rut);

  // Formato: 7 a 8 dígitos seguidos de guion opcional y dígito verificador (0-9 o K)
  const rutRegex = /^(\d{7,8})-?([\dK])$/;
  const match = cleaned.match(rutRegex);

  if (!match) return false;

  const body = match[1];
  const dv = match[2];

  if (!body || !dv) return false;

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]!, 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  let expectedDv: string;

  if (remainder === 11) {
    expectedDv = '0';
  } else if (remainder === 10) {
    expectedDv = 'K';
  } else {
    expectedDv = String(remainder);
  }

  return dv === expectedDv;
}

/**
 * Formatea un RUT al estándar chileno (con o sin puntos, siempre con guion y DV en mayúscula).
 * Ej: '776899356' -> '77.689.935-6'
 */
export function formatRut(rut: string, withDots = true): string {
  if (!rut || typeof rut !== 'string') return '';

  const cleaned = cleanRut(rut).replace(/-/g, '');
  if (cleaned.length < 2) return cleaned;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  if (!withDots) {
    return `${body}-${dv}`;
  }

  // Formatear cuerpo con puntos de miles
  let formattedBody = '';
  for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) {
      formattedBody = '.' + formattedBody;
    }
    formattedBody = body[i] + formattedBody;
  }

  return `${formattedBody}-${dv}`;
}
