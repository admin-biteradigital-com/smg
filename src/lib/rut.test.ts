import { describe, it, expect } from 'vitest';
import { cleanRut, validateRut, formatRut } from './rut';

describe('RUT Utilities (Modulo 11)', () => {
  describe('cleanRut', () => {
    it('debe limpiar espacios y puntos y convertir a mayusculas', () => {
      expect(cleanRut(' 77.689.935-k ')).toBe('77689935-K');
      expect(cleanRut('76.507.455-K')).toBe('76507455-K');
    });

    it('retorna string vacio si recibe valor nulo o no string', () => {
      expect(cleanRut('')).toBe('');
      // @ts-expect-error test invalid input
      expect(cleanRut(null)).toBe('');
    });
  });

  describe('validateRut', () => {
    it('valida RUTs chilenos validos con y sin formato', () => {
      expect(validateRut('77.689.935-6')).toBe(true);
      expect(validateRut('77689935-6')).toBe(true);
      expect(validateRut('776899356')).toBe(true);
      expect(validateRut('11.111.111-1')).toBe(true);
      expect(validateRut('12.345.678-5')).toBe(true);
    });

    it('valida RUTs con DV K en mayuscula y minuscula', () => {
      // 76.507.455 -> suma 144, 144%11 = 1, 11-1 = 10 -> DV 'K'
      expect(validateRut('76507455-k')).toBe(true);
      expect(validateRut('76.507.455-K')).toBe(true);
      expect(validateRut('76507455K')).toBe(true);
    });

    it('rechaza RUTs invalidos', () => {
      expect(validateRut('77.689.935-7')).toBe(false);
      expect(validateRut('12.345.678-9')).toBe(false);
      expect(validateRut('76.507.455-0')).toBe(false);
      expect(validateRut('123')).toBe(false);
      expect(validateRut('abc-1')).toBe(false);
      expect(validateRut('')).toBe(false);
    });
  });

  describe('formatRut', () => {
    it('formatea RUTs con puntos y guion', () => {
      expect(formatRut('776899356')).toBe('77.689.935-6');
      expect(formatRut('76507455k')).toBe('76.507.455-K');
      expect(formatRut('123456785')).toBe('12.345.678-5');
    });

    it('formatea RUTs sin puntos pero con guion', () => {
      expect(formatRut('776899356', false)).toBe('77689935-6');
      expect(formatRut('76507455k', false)).toBe('76507455-K');
    });

    it('maneja strings vacios', () => {
      expect(formatRut('')).toBe('');
    });
  });
});
