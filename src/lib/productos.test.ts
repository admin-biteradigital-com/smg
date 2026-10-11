import { describe, it, expect } from 'vitest';
import {
  validarFactorConversion,
  determinarFactorYUnidades,
  formatearVistaPreviaFactor,
  formatearEtiquetaConUnidad,
  formatearResumenFactorListado,
} from './productos';

describe('src/lib/productos: Lógica pura de factor y unidades de compra', () => {
  describe('validarFactorConversion', () => {
    it('retorna valido y factor null si la unidad de compra es igual a la base', () => {
      const res = validarFactorConversion('', false);
      expect(res.valido).toBe(true);
      expect(res.factor).toBeNull();
      expect(res.error).toBeUndefined();
    });

    it('exige factor cuando la unidad de compra es distinta de la base', () => {
      const res = validarFactorConversion('', true, 'display', 'caja');
      expect(res.valido).toBe(false);
      expect(res.factor).toBeNull();
      expect(res.error).toBe('Debes indicar cuántas display trae cada caja.');
    });

    it('rechaza factores menores a 1 o no enteros', () => {
      const resCero = validarFactorConversion('0', true);
      expect(resCero.valido).toBe(false);
      expect(resCero.error).toBe('El factor de conversión debe ser un número entero mayor o igual a 1.');

      const resDecimal = validarFactorConversion('2.5', true);
      expect(resDecimal.valido).toBe(false);
      expect(resDecimal.error).toBe('El factor de conversión debe ser un número entero mayor o igual a 1.');

      const resNegativo = validarFactorConversion('-5', true);
      expect(resNegativo.valido).toBe(false);
      expect(resNegativo.error).toBe('El factor de conversión debe ser un número entero mayor o igual a 1.');

      const resTexto = validarFactorConversion('abc', true);
      expect(resTexto.valido).toBe(false);
    });

    it('acepta enteros mayores o iguales a 1', () => {
      const res1 = validarFactorConversion('1', true);
      expect(res1.valido).toBe(true);
      expect(res1.factor).toBe(1);

      const res24 = validarFactorConversion('24', true);
      expect(res24.valido).toBe(true);
      expect(res24.factor).toBe(24);
    });
  });

  describe('determinarFactorYUnidades', () => {
    it('envía factor null e idUnidadCompra null si es "Igual a unidad base" (cadena vacía)', () => {
      const res = determinarFactorYUnidades({
        idUnidadBase: 1,
        idUnidadCompra: '',
        factorConversionCompra: '24',
      });

      expect(res.esDistintaUnidad).toBe(false);
      expect(res.idUnidadCompra).toBeNull();
      expect(res.factorConversionCompra).toBeNull();
    });

    it('envía factor null si la unidad de compra seleccionada coincide con la unidad base', () => {
      const res = determinarFactorYUnidades({
        idUnidadBase: 2,
        idUnidadCompra: '2',
        factorConversionCompra: '10',
      });

      expect(res.esDistintaUnidad).toBe(false);
      expect(res.idUnidadCompra).toBe(2);
      expect(res.factorConversionCompra).toBeNull();
    });

    it('envía factor e idUnidadCompra numéricos si la unidad de compra es distinta', () => {
      const res = determinarFactorYUnidades({
        idUnidadBase: 1,
        idUnidadCompra: '3',
        factorConversionCompra: '24',
      });

      expect(res.esDistintaUnidad).toBe(true);
      expect(res.idUnidadCompra).toBe(3);
      expect(res.factorConversionCompra).toBe(24);
    });
  });

  describe('formatearVistaPreviaFactor', () => {
    it('genera la línea de equivalencia cuando el factor es válido', () => {
      const texto = formatearVistaPreviaFactor({
        nombreUnidadCompra: 'caja',
        factor: 24,
        nombreUnidadBase: 'display',
      });
      expect(texto).toBe('1 caja = 24 display. Se compra por caja; stock y ventas por display.');
    });

    it('retorna null si el factor no es un número entero válido >= 1', () => {
      expect(formatearVistaPreviaFactor({ factor: 0 })).toBeNull();
      expect(formatearVistaPreviaFactor({ factor: 'abc' })).toBeNull();
      expect(formatearVistaPreviaFactor({ factor: 1.5 })).toBeNull();
    });
  });

  describe('formatearEtiquetaConUnidad', () => {
    it('agrega la unidad si existe', () => {
      expect(formatearEtiquetaConUnidad('Precio de Costo ($)', 'display')).toBe(
        'Precio de Costo ($) por display'
      );
    });

    it('conserva la etiqueta original si no hay unidad', () => {
      expect(formatearEtiquetaConUnidad('Precio de Costo ($)', null)).toBe('Precio de Costo ($)');
      expect(formatearEtiquetaConUnidad('Precio de Costo ($)', '')).toBe('Precio de Costo ($)');
    });
  });

  describe('formatearResumenFactorListado', () => {
    it('muestra el resumen discreto si el factor es > 1', () => {
      expect(
        formatearResumenFactorListado({
          nombreUnidadCompra: 'caja',
          factor: 24,
          nombreUnidadBase: 'display',
        })
      ).toBe('Compra: caja × 24 display');
    });

    it('retorna null si factor es 1 o menor o null', () => {
      expect(
        formatearResumenFactorListado({
          nombreUnidadCompra: 'caja',
          factor: 1,
          nombreUnidadBase: 'caja',
        })
      ).toBeNull();

      expect(
        formatearResumenFactorListado({
          nombreUnidadCompra: 'caja',
          factor: null,
          nombreUnidadBase: 'caja',
        })
      ).toBeNull();
    });
  });
});
