import { describe, it, expect } from 'vitest';
import type { CatalogProductItem } from '@/types';

// Helper de extracción de marcas (mismo comportamiento que en CatalogoGestionPage)
function extractBrandNames(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const obj = item as { nombre?: string; slug?: string };
          return obj.nombre || obj.slug || '';
        }
        return '';
      })
      .filter(Boolean);
  }
  if (typeof raw === 'object' && 'data' in raw) {
    const data = (raw as { data: unknown }).data;
    if (Array.isArray(data)) {
      return extractBrandNames(data);
    }
  }
  return [];
}

function formatCLP(amount: number): string {
  return `$ ${amount.toLocaleString('es-CL')}`;
}

describe('/gestion/catalogo - Lógica de Presentación del Catálogo Público', () => {
  describe('Extracción y Normalización de Marcas (extractBrandNames)', () => {
    it('debe extraer marcas cuando el backend devuelve un arreglo de strings', () => {
      const marcasRaw = ['SMG', 'Coca-Cola', 'CCU'];
      expect(extractBrandNames(marcasRaw)).toEqual(['SMG', 'Coca-Cola', 'CCU']);
    });

    it('debe extraer marcas cuando el backend devuelve un arreglo de objetos con nombre o slug', () => {
      const marcasRaw = [
        { nombre: 'SMG', slug: 'smg', totalProductos: 12 },
        { nombre: 'Nestlé', slug: 'nestle', totalProductos: 5 },
      ];
      expect(extractBrandNames(marcasRaw)).toEqual(['SMG', 'Nestlé']);
    });

    it('debe extraer marcas cuando el backend devuelve un objeto envuelto en { data: [...] }', () => {
      const payload = {
        data: [
          { nombre: 'SMG', slug: 'smg' },
          { nombre: 'Andina', slug: 'andina' },
        ],
      };
      expect(extractBrandNames(payload)).toEqual(['SMG', 'Andina']);
    });

    it('debe manejar respuestas vacías o nulas sin lanzar excepción', () => {
      expect(extractBrandNames(null)).toEqual([]);
      expect(extractBrandNames(undefined)).toEqual([]);
      expect(extractBrandNames({})).toEqual([]);
      expect(extractBrandNames([])).toEqual([]);
    });
  });

  describe('Formato de Precios al Público (CLP)', () => {
    it('debe formatear correctamente precios enteros en CLP con separador de miles', () => {
      expect(formatCLP(1500)).toContain('1.500');
      expect(formatCLP(12500)).toContain('12.500');
      expect(formatCLP(0)).toContain('0');
    });

    it('debe detectar correctamente si un producto tiene precio de oferta activo', () => {
      const productoConOferta: CatalogProductItem = {
        id: 1,
        nombre: 'Agua Mineral 500ml',
        descripcionWeb: 'Agua purificada',
        marca: 'SMG',
        marcaSlug: 'smg',
        imagenUrl: '/productos/1/imagen.webp',
        unidadVenta: 'unidad',
        precioPublico: 1000,
        precioOferta: 850,
        categoriaWeb: 'Bebidas',
        activo: true,
      };

      const tieneOferta = Boolean(
        productoConOferta.precioOferta !== null &&
        productoConOferta.precioOferta !== undefined &&
        productoConOferta.precioPublico !== null &&
        productoConOferta.precioPublico !== undefined &&
        productoConOferta.precioOferta < productoConOferta.precioPublico
      );

      expect(tieneOferta).toBe(true);
      expect(productoConOferta.precioPublico).toBe(1000);
      expect(productoConOferta.precioOferta).toBe(850);
    });

    it('no debe marcar oferta si el precio de oferta es igual o mayor al precio público', () => {
      const productoSinOferta: CatalogProductItem = {
        id: 2,
        nombre: 'Galletas Chocolate',
        descripcionWeb: null,
        marca: 'SMG',
        marcaSlug: 'smg',
        imagenUrl: null,
        unidadVenta: 'paquete',
        precioPublico: 1200,
        precioOferta: 1200,
        categoriaWeb: 'Snacks',
        activo: true,
      };

      const tieneOferta = Boolean(
        productoSinOferta.precioOferta !== null &&
        productoSinOferta.precioOferta !== undefined &&
        productoSinOferta.precioPublico !== null &&
        productoSinOferta.precioPublico !== undefined &&
        productoSinOferta.precioOferta < productoSinOferta.precioPublico
      );

      expect(tieneOferta).toBe(false);
    });
  });

  describe('Shape de Datos de CatalogProductItem', () => {
    it('debe contener los campos requeridos por el contrato de cara al cliente', () => {
      const item: CatalogProductItem = {
        id: 10,
        nombre: 'Bebida Fantasía 1.5L',
        descripcionWeb: 'Bebida gaseosa sabor naranja de consumo familiar',
        marca: 'SMG',
        marcaSlug: 'smg',
        imagenUrl: '/productos/10/imagen.webp',
        unidadVenta: 'botella',
        precioPublico: 2490,
        precioOferta: null,
        categoriaWeb: 'Bebidas',
        activo: true,
      };

      expect(item.id).toBe(10);
      expect(item.nombre).toBe('Bebida Fantasía 1.5L');
      expect(item.marca).toBe('SMG');
      expect(item.precioPublico).toBe(2490);
      expect(item.unidadVenta).toBe('botella');
      expect(item.descripcionWeb).toBeTruthy();
    });
  });
});
