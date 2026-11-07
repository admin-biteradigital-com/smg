import { describe, it, expect } from 'vitest';
import {
  normalizarTexto,
  filtrarComunas,
  buscarComunaOficial,
} from './SelectorComuna';
import type { ComunaItem } from '@/types';

const MOCK_COMUNAS: ComunaItem[] = [
  { codigo: '10101', nombre: 'Puerto Montt', region: 'Los Lagos' },
  { codigo: '10104', nombre: 'Puerto Varas', region: 'Los Lagos' },
  { codigo: '10203', nombre: 'Castro', region: 'Los Lagos' },
  { codigo: '10403', nombre: 'Hualaihué', region: 'Los Lagos' },
  { codigo: '13101', nombre: 'Santiago', region: 'Metropolitana de Santiago' },
  { codigo: '13124', nombre: 'Pudahuel', region: 'Metropolitana de Santiago' },
  { codigo: '08101', nombre: 'Concepción', region: 'Biobío' },
  { codigo: '16101', nombre: 'Chillán', region: 'Ñuble' },
];

describe('SelectorComuna: Funciones de Búsqueda y Normalización', () => {
  describe('normalizarTexto', () => {
    it('elimina tildes y diacríticos y convierte a minúsculas', () => {
      expect(normalizarTexto('Hualaihué')).toBe('hualaihue');
      expect(normalizarTexto('Concepción')).toBe('concepcion');
      expect(normalizarTexto('CHILLÁN')).toBe('chillan');
      expect(normalizarTexto(' Ñuble ')).toBe('nuble');
      expect(normalizarTexto('Santiago')).toBe('santiago');
    });
  });

  describe('filtrarComunas', () => {
    it('encuentra comunas sin distinguir mayúsculas ni tildes', () => {
      // Buscar "hualaihue" debe encontrar "Hualaihué"
      const res1 = filtrarComunas('hualaihue', MOCK_COMUNAS);
      expect(res1.length).toBe(1);
      expect(res1[0].nombre).toBe('Hualaihué');

      // Buscar "HUALAIHUE"
      const res2 = filtrarComunas('HUALAIHUE', MOCK_COMUNAS);
      expect(res2.length).toBe(1);
      expect(res2[0].nombre).toBe('Hualaihué');

      // Buscar "chillan" debe encontrar "Chillán"
      const res3 = filtrarComunas('chillan', MOCK_COMUNAS);
      expect(res3.length).toBe(1);
      expect(res3[0].nombre).toBe('Chillán');
    });

    it('encuentra múltiples resultados por coincidencia parcial de nombre o región', () => {
      const res = filtrarComunas('puerto', MOCK_COMUNAS);
      expect(res.map((c) => c.nombre)).toEqual(['Puerto Montt', 'Puerto Varas']);

      const resRegion = filtrarComunas('lagos', MOCK_COMUNAS);
      expect(resRegion.length).toBe(4);
      expect(resRegion.map((c) => c.nombre)).toEqual([
        'Puerto Montt',
        'Puerto Varas',
        'Castro',
        'Hualaihué',
      ]);
    });

    it('retorna arreglo vacío si no hay coincidencias', () => {
      const res = filtrarComunas('xyzinexistente', MOCK_COMUNAS);
      expect(res).toEqual([]);
    });

    it('retorna hasta 30 comunas si la búsqueda está vacía', () => {
      const res = filtrarComunas('', MOCK_COMUNAS);
      expect(res.length).toBe(MOCK_COMUNAS.length);
    });
  });

  describe('buscarComunaOficial y detección de datos viejos', () => {
    it('reconoce valores exactos ignorando mayúsculas y tildes', () => {
      const match1 = buscarComunaOficial('Hualaihué', MOCK_COMUNAS);
      expect(match1).toBeDefined();
      expect(match1?.nombre).toBe('Hualaihué');

      const match2 = buscarComunaOficial('hualaihue', MOCK_COMUNAS);
      expect(match2).toBeDefined();
      expect(match2?.nombre).toBe('Hualaihué');

      const match3 = buscarComunaOficial('concepcion', MOCK_COMUNAS);
      expect(match3).toBeDefined();
      expect(match3?.nombre).toBe('Concepción');
    });

    it('retorna undefined para datos viejos en texto libre que no existen en el catálogo oficial', () => {
      // Datos viejos o abreviaturas
      expect(buscarComunaOficial('P. Montt', MOCK_COMUNAS)).toBeUndefined();
      expect(buscarComunaOficial('Hornopirén', MOCK_COMUNAS)).toBeUndefined(); // Hornopirén es localidad, comuna es Hualaihué
      expect(buscarComunaOficial('Texto Libre Antiguo', MOCK_COMUNAS)).toBeUndefined();
      expect(buscarComunaOficial('', MOCK_COMUNAS)).toBeUndefined();
    });
  });
});
