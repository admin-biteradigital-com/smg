import { describe, it, expect } from 'vitest';

describe('ABM de Clientes - Validación de Giro y Dato Provisorio', () => {
  const VALOR_GIRO_PENDIENTE = 'Pendiente de confirmar';

  it('debe rechazar giros vacíos o conformados exclusivamente por espacios', () => {
    const validarGiroCliente = (val: string) => {
      const cleanGiro = val.trim();
      if (!cleanGiro) {
        return 'El giro del cliente es requerido.';
      }
      return null;
    };

    expect(validarGiroCliente('')).toBe('El giro del cliente es requerido.');
    expect(validarGiroCliente('   ')).toBe('El giro del cliente es requerido.');
    expect(validarGiroCliente('Minimarket y almacén')).toBeNull();
    expect(validarGiroCliente(VALOR_GIRO_PENDIENTE)).toBeNull();
  });

  it('debe marcar como provisorio únicamente cuando el valor coincide exactamente con "Pendiente de confirmar"', () => {
    const esGiroProvisorio = (val: string) => val.trim() === VALOR_GIRO_PENDIENTE;

    expect(esGiroProvisorio('Pendiente de confirmar')).toBe(true);
    expect(esGiroProvisorio('  Pendiente de confirmar  ')).toBe(true);
    expect(esGiroProvisorio('Supermercado y distribución')).toBe(false);
    expect(esGiroProvisorio('Pendiente')).toBe(false);
    expect(esGiroProvisorio('')).toBe(false);
  });
});
