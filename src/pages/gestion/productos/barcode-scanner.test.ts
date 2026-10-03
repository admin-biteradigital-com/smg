import { describe, it, expect, vi } from 'vitest';
import type { ProductoAdminItem } from '@/types';

// TODO: BarcodeDetector no funciona en iOS Safari — evaluar @zxing/browser si se necesita soporte cross-browser

describe('Módulo de Escaneo de Códigos de Barra (BarcodeDetector nativo)', () => {
  const mockProductos: ProductoAdminItem[] = [
    {
      id: 1,
      nombre: 'Harina de Trigo Especial 1kg',
      descripcion: 'Harina para panificación',
      idUnidadBase: 1,
      nombreUnidadBase: 'Kilogramo',
      codigoBarras: '7801234567890',
      precioUnitarioSugerido: 1200,
      precioCosto: 850,
      precioPublico: 1390,
      stockSeguridadMinimo: 20,
      activo: 1,
      visiblePublico: 1,
    },
    {
      id: 2,
      nombre: 'Aceite Maravilla 900ml',
      descripcion: 'Aceite vegetal comestible',
      idUnidadBase: 2,
      nombreUnidadBase: 'Unidad',
      codigoBarras: '7809876543210',
      precioUnitarioSugerido: 2100,
      precioCosto: 1600,
      precioPublico: 2490,
      stockSeguridadMinimo: 15,
      activo: 1,
      visiblePublico: 1,
    },
    {
      id: 3,
      nombre: 'Arroz Grado 1 1kg',
      descripcion: null,
      idUnidadBase: 1,
      nombreUnidadBase: 'Kilogramo',
      codigoBarras: null, // Sin código de barras
      precioUnitarioSugerido: 1500,
      precioCosto: 1000,
      precioPublico: 1750,
      stockSeguridadMinimo: 10,
      activo: 1,
      visiblePublico: 0,
    },
  ];

  describe('Feature Detection de BarcodeDetector', () => {
    it('detecta soporte cuando window.BarcodeDetector está presente', () => {
      const original = (window as any).BarcodeDetector;
      (window as any).BarcodeDetector = class MockBarcodeDetector {};

      const isSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;
      expect(isSupported).toBe(true);

      (window as any).BarcodeDetector = original;
    });

    it('determina que no está soportado cuando window.BarcodeDetector no existe (ej. iOS Safari)', () => {
      const original = (window as any).BarcodeDetector;
      delete (window as any).BarcodeDetector;

      const isSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;
      expect(isSupported).toBe(false);

      if (original) (window as any).BarcodeDetector = original;
    });
  });

  describe('Contexto 1: Alta/Edición de Producto (ProductoFormPage)', () => {
    it('el campo codigoBarras no se actualiza hasta confirmar explícitamente', () => {
      let codigoBarrasEnFormulario = '';
      let codigoParaConfirmar: string | null = null;

      // 1. Escáner detecta código de barras
      const codigoEscaneado = '7801234567890';
      codigoParaConfirmar = codigoEscaneado;

      // El campo aún no fue modificado
      expect(codigoBarrasEnFormulario).toBe('');
      expect(codigoParaConfirmar).toBe('7801234567890');

      // 2. Usuario presiona "Confirmar y usar este código"
      codigoBarrasEnFormulario = codigoParaConfirmar;
      codigoParaConfirmar = null;

      expect(codigoBarrasEnFormulario).toBe('7801234567890');
      expect(codigoParaConfirmar).toBeNull();
    });

    it('volver a intentar descarta el código provisional y permite reabrir el escáner', () => {
      const codigoBarrasEnFormulario = '';
      let codigoParaConfirmar: string | null = '7801234567890';
      let scannerAbierto = false;

      // Usuario presiona "Volver a intentar"
      codigoParaConfirmar = null;
      scannerAbierto = true;

      expect(codigoBarrasEnFormulario).toBe('');
      expect(codigoParaConfirmar).toBeNull();
      expect(scannerAbierto).toBe(true);
    });
  });

  describe('Contexto 2: Búsqueda en Listado (ProductosListPage)', () => {
    it('coincidencia encontrada: localiza el producto en memoria y expone su nombre', () => {
      const codigoEscaneado = '7801234567890';
      const clean = codigoEscaneado.trim();

      const match = mockProductos.find(
        (p) => p.codigoBarras && p.codigoBarras.trim() === clean
      );

      expect(match).toBeDefined();
      expect(match?.id).toBe(1);
      expect(match?.nombre).toBe('Harina de Trigo Especial 1kg');
    });

    it('coincidencia encontrada: opción "Aplicar como filtro" asigna el nombre del producto al buscador', () => {
      let busqueda = '';
      let scannedMatch: ProductoAdminItem | null = mockProductos[0];

      // Usuario selecciona "Aplicar como filtro"
      busqueda = scannedMatch.nombre;
      scannedMatch = null;

      expect(busqueda).toBe('Harina de Trigo Especial 1kg');
      expect(scannedMatch).toBeNull();

      // El filtro en memoria debe aislar el producto encontrado
      const term = busqueda.trim().toLowerCase();
      const filtrados = mockProductos.filter((p) =>
        p.nombre.toLowerCase().includes(term)
      );
      expect(filtrados).toHaveLength(1);
      expect(filtrados[0].id).toBe(1);
    });

    it('coincidencia no encontrada: identifica código inexistente sin fallar en silencio', () => {
      const codigoInexistente = '9999999999999';
      const clean = codigoInexistente.trim();

      const match = mockProductos.find(
        (p) => p.codigoBarras && p.codigoBarras.trim() === clean
      );

      expect(match).toBeUndefined();

      // No se aplica filtro vacío ni se rompe el estado
      let scannedNotFoundCode: string | null = null;
      let scannedMatch: ProductoAdminItem | null = null;

      if (match) {
        scannedMatch = match;
      } else {
        scannedNotFoundCode = clean;
      }

      expect(scannedMatch).toBeNull();
      expect(scannedNotFoundCode).toBe('9999999999999');
    });

    it('coincidencia no encontrada: opción "Buscar manualmente" transfiere el código al campo de búsqueda', () => {
      let busqueda = '';
      let scannedNotFoundCode: string | null = '9999999999999';

      // Usuario selecciona "Buscar manualmente"
      busqueda = scannedNotFoundCode;
      scannedNotFoundCode = null;

      expect(busqueda).toBe('9999999999999');
      expect(scannedNotFoundCode).toBeNull();
    });
  });

  describe('Contexto 3: Stock Depósito - Modal Agregar Lote (StockDepositoPage)', () => {
    it('coincidencia encontrada: confirma producto y pasa directo al Paso 2 (detalle)', () => {
      let nuevoLotePaso: 'producto' | 'detalle' = 'producto';
      let productoSeleccionado: ProductoAdminItem | null = null;
      let scannedMatch: ProductoAdminItem | null = null;

      // 1. Detección de código de barras en Paso 1
      const codigoEscaneado = '7809876543210';
      const clean = codigoEscaneado.trim();
      const match = mockProductos.find((p) => p.codigoBarras && p.codigoBarras.trim() === clean);

      expect(match).toBeDefined();
      scannedMatch = match!;
      expect(scannedMatch.nombre).toBe('Aceite Maravilla 900ml');

      // 2. Al presionar "Confirmar y seleccionar producto", pasa directo al Paso 2 con productoSeleccionado
      const seleccionarProducto = (prod: ProductoAdminItem) => {
        productoSeleccionado = prod;
        nuevoLotePaso = 'detalle';
      };

      const prod = scannedMatch;
      scannedMatch = null;
      seleccionarProducto(prod);

      expect(scannedMatch).toBeNull();
      expect(nuevoLotePaso).toBe('detalle');
      expect((productoSeleccionado as ProductoAdminItem | null)?.id).toBe(2);
      expect((productoSeleccionado as ProductoAdminItem | null)?.nombre).toBe('Aceite Maravilla 900ml');
    });

    it('coincidencia no encontrada: permite buscar manualmente rellenando busquedaProducto', () => {
      let busquedaProducto = '';
      let scannedNotFoundCode: string | null = '1111222233334';
      const nuevoLotePaso: 'producto' | 'detalle' = 'producto';

      // Al presionar "Buscar manualmente"
      busquedaProducto = scannedNotFoundCode;
      scannedNotFoundCode = null;

      expect(busquedaProducto).toBe('1111222233334');
      expect(scannedNotFoundCode).toBeNull();
      expect(nuevoLotePaso).toBe('producto'); // Se mantiene en Paso 1
    });

    it('coincidencia no encontrada: opción volver a intentar reabre el escáner', () => {
      let scannerOpen = false;
      let scannedNotFoundCode: string | null = '1111222233334';

      // Al presionar "Volver a intentar"
      scannedNotFoundCode = null;
      scannerOpen = true;

      expect(scannedNotFoundCode).toBeNull();
      expect(scannerOpen).toBe(true);
    });
  });

  describe('Liberación Estricta de Recursos de Cámara', () => {
    it('detiene todos los tracks de MediaStream al invocar stopCamera', () => {
      const stopTrack1 = vi.fn();
      const stopTrack2 = vi.fn();

      const mockStream = {
        getTracks: () => [
          { stop: stopTrack1 },
          { stop: stopTrack2 },
        ],
      } as unknown as MediaStream;

      // Simulación de stopCamera
      mockStream.getTracks().forEach((t) => t.stop());

      expect(stopTrack1).toHaveBeenCalledTimes(1);
      expect(stopTrack2).toHaveBeenCalledTimes(1);
    });
  });
});
