import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  procesarEscaneoVenta,
  procesarEscaneoCarga,
  isBarcodeScannerSupportedSync,
} from './jornada-scanner';

describe('jornada-scanner: procesarEscaneoVenta', () => {
  const mockStock = [
    {
      idProducto: 101,
      idLote: 1,
      nombreProducto: 'Alfajor de Chocolate',
      codigoProducto: '7801234567890',
      numeroLote: 'LOT-A1',
      cantidad: 0,
      cantidadDisponible: 10,
    },
    {
      idProducto: 102,
      idLote: 2,
      nombreProducto: 'Bebida Cola 500ml',
      codigoProducto: '7809999999999',
      numeroLote: 'LOT-B1',
      cantidad: 0,
      cantidadDisponible: 24,
    },
    {
      idProducto: 102,
      idLote: 3,
      nombreProducto: 'Bebida Cola 500ml',
      codigoProducto: '7809999999999',
      numeroLote: 'LOT-B2',
      cantidad: 0,
      cantidadDisponible: 12,
    },
  ];

  it('código con un lote: encuentra el producto y no retorna mensaje de error', () => {
    const res = procesarEscaneoVenta('7801234567890', mockStock);

    expect(res.codigoLimpio).toBe('7801234567890');
    expect(res.encontrado).toBe(true);
    expect(res.coincidencias).toHaveLength(1);
    expect(res.coincidencias[0].nombreProducto).toBe('Alfajor de Chocolate');
    expect(res.mensaje).toBeNull();
  });

  it('código con varios lotes: retorna todas las coincidencias del producto sin preselección', () => {
    const res = procesarEscaneoVenta('7809999999999', mockStock);

    expect(res.codigoLimpio).toBe('7809999999999');
    expect(res.encontrado).toBe(true);
    expect(res.coincidencias).toHaveLength(2);
    expect(res.coincidencias.map((c) => c.numeroLote)).toEqual(['LOT-B1', 'LOT-B2']);
    expect(res.mensaje).toBeNull();
  });

  it('código inexistente: retorna no encontrado y mensaje no bloqueante descriptivo', () => {
    const res = procesarEscaneoVenta('7800000000000', mockStock);

    expect(res.codigoLimpio).toBe('7800000000000');
    expect(res.encontrado).toBe(false);
    expect(res.coincidencias).toHaveLength(0);
    expect(res.mensaje).toBe('Este producto no está cargado en el vehículo');
  });

  it('código vacío o con solo espacios: no activa búsqueda ni mensaje de error', () => {
    const res1 = procesarEscaneoVenta('', mockStock);
    expect(res1.codigoLimpio).toBe('');
    expect(res1.encontrado).toBe(false);
    expect(res1.coincidencias).toHaveLength(0);
    expect(res1.mensaje).toBeNull();

    const res2 = procesarEscaneoVenta('   ', mockStock);
    expect(res2.codigoLimpio).toBe('');
    expect(res2.encontrado).toBe(false);
    expect(res2.coincidencias).toHaveLength(0);
    expect(res2.mensaje).toBeNull();
  });

  it('soporta espacios circundantes y mayúsculas/minúsculas en el código', () => {
    const stockAlpha = [
      {
        idProducto: 201,
        codigoProducto: 'BEB-COLA-01',
        nombreProducto: 'Cola 1L',
      },
    ];

    const res = procesarEscaneoVenta('  beb-cola-01  ', stockAlpha);
    expect(res.codigoLimpio).toBe('beb-cola-01');
    expect(res.encontrado).toBe(true);
    expect(res.coincidencias).toHaveLength(1);
    expect(res.mensaje).toBeNull();
  });
});

describe('jornada-scanner: procesarEscaneoCarga', () => {
  const mockStockDeposito = [
    {
      id: 1,
      producto: { id: 101, nombre: 'Alfajor de Chocolate', codigoBarras: '7801234567890' },
      numeroLote: 'LOT-ALF-01',
      fechaVencimiento: '2026-10-15',
      cantidadActual: 50,
      unidadBase: 'unidad',
    },
    {
      id: 2,
      producto: { id: 102, nombre: 'Bebida Cola 500ml', codigoBarras: '7809999999999' },
      numeroLote: 'LOT-BEB-LATE',
      fechaVencimiento: '2027-01-31',
      cantidadActual: 100,
      unidadBase: 'unidad',
    },
    {
      id: 3,
      producto: { id: 102, nombre: 'Bebida Cola 500ml', codigoBarras: '7809999999999' },
      numeroLote: 'LOT-BEB-EARLY',
      fechaVencimiento: '2026-05-10',
      cantidadActual: 40,
      unidadBase: 'unidad',
    },
    {
      id: 4,
      producto: { id: 102, nombre: 'Bebida Cola 500ml', codigoBarras: '7809999999999' },
      numeroLote: 'LOT-BEB-MID',
      fechaVencimiento: '2026-09-01',
      cantidadActual: 60,
      unidadBase: 'unidad',
    },
    {
      id: 5,
      producto: { id: 103, nombre: 'Jugo Naranja 1L', codigoBarras: '7805555555555' },
      numeroLote: 'LOT-JUG-01',
      fechaVencimiento: '2026-06-20',
      cantidadActual: 0, // Sin stock disponible
      unidadBase: 'unidad',
    },
    {
      id: 6,
      producto: { id: 104, nombre: 'Galletas de Avena', codigoBarras: null }, // Sin código de barras
      numeroLote: 'LOT-GAL-01',
      fechaVencimiento: '2026-12-01',
      cantidadActual: 20,
      unidadBase: 'unidad',
    },
    {
      id: 7,
      producto: { id: 105, nombre: 'Snack Mix' }, // Sin propiedad codigoBarras
      numeroLote: 'LOT-SNK-01',
      fechaVencimiento: '2026-11-15',
      cantidadActual: 15,
      unidadBase: 'unidad',
    },
    {
      id: 8,
      producto: { id: 106, nombre: 'Barra Cereal Larga', codigoBarras: '780123' }, // Código exacto más corto
      numeroLote: 'LOT-BAR-01',
      fechaVencimiento: '2026-08-10',
      cantidadActual: 30,
      unidadBase: 'unidad',
    },
  ];

  it('un lote: queda seleccionado en el selector, sin mensaje de error', () => {
    const res = procesarEscaneoCarga('7801234567890', mockStockDeposito);

    expect(res.codigoLimpio).toBe('7801234567890');
    expect(res.encontrado).toBe(true);
    expect(res.coincidencias).toHaveLength(1);
    expect(res.coincidencias[0].id).toBe(1);
    expect(res.loteSeleccionado).toBeDefined();
    expect(res.loteSeleccionado?.id).toBe(1);
    expect(res.loteSeleccionado?.numeroLote).toBe('LOT-ALF-01');
    expect(res.mensaje).toBeNull();
  });

  it('varios lotes: filtrado a los lotes de ese producto, ordenados por vencimiento ascendente y sin preselección', () => {
    const res = procesarEscaneoCarga('7809999999999', mockStockDeposito);

    expect(res.codigoLimpio).toBe('7809999999999');
    expect(res.encontrado).toBe(true);
    expect(res.coincidencias).toHaveLength(3);
    // Orden ascendente por fecha de vencimiento: 2026-05-10 < 2026-09-01 < 2027-01-31
    expect(res.coincidencias.map((c) => c.numeroLote)).toEqual([
      'LOT-BEB-EARLY',
      'LOT-BEB-MID',
      'LOT-BEB-LATE',
    ]);
    expect(res.coincidencias.map((c) => c.fechaVencimiento)).toEqual([
      '2026-05-10',
      '2026-09-01',
      '2027-01-31',
    ]);
    // Sin preselección
    expect(res.loteSeleccionado).toBeNull();
    // Aviso solicitado
    expect(res.mensaje).toBe('Elegí el lote (ordenados por vencimiento)');
  });

  it('ninguno: código no existente retorna mensaje descriptivo y selección nula', () => {
    const res = procesarEscaneoCarga('7800000000000', mockStockDeposito);

    expect(res.codigoLimpio).toBe('7800000000000');
    expect(res.encontrado).toBe(false);
    expect(res.coincidencias).toHaveLength(0);
    expect(res.loteSeleccionado).toBeNull();
    expect(res.mensaje).toBe('No hay stock en depósito para este producto');
  });

  it('ninguno: producto con código existente pero con stock disponible 0', () => {
    const res = procesarEscaneoCarga('7805555555555', mockStockDeposito);

    expect(res.codigoLimpio).toBe('7805555555555');
    expect(res.encontrado).toBe(false);
    expect(res.coincidencias).toHaveLength(0);
    expect(res.loteSeleccionado).toBeNull();
    expect(res.mensaje).toBe('No hay stock en depósito para este producto');
  });

  it('código vacío o con solo espacios: no activa búsqueda ni mensaje', () => {
    const res1 = procesarEscaneoCarga('', mockStockDeposito);
    expect(res1.codigoLimpio).toBe('');
    expect(res1.encontrado).toBe(false);
    expect(res1.coincidencias).toHaveLength(0);
    expect(res1.loteSeleccionado).toBeNull();
    expect(res1.mensaje).toBeNull();

    const res2 = procesarEscaneoCarga('    ', mockStockDeposito);
    expect(res2.codigoLimpio).toBe('');
    expect(res2.encontrado).toBe(false);
    expect(res2.coincidencias).toHaveLength(0);
    expect(res2.loteSeleccionado).toBeNull();
    expect(res2.mensaje).toBeNull();
  });

  it('ítems sin codigoBarras (null, undefined o ausente): se toleran sin error y no coinciden', () => {
    const stockSinCodigos = [
      {
        id: 10,
        producto: { id: 201, nombre: 'Sin Barcode Null', codigoBarras: null },
        numeroLote: 'LOT-NOCB-1',
        fechaVencimiento: '2026-12-31',
        cantidadActual: 10,
      },
      {
        id: 11,
        producto: { id: 202, nombre: 'Sin Barcode Undefined', codigoBarras: undefined },
        numeroLote: 'LOT-NOCB-2',
        fechaVencimiento: '2026-12-31',
        cantidadActual: 10,
      },
      {
        id: 12,
        producto: { id: 203, nombre: 'Sin Propiedad Barcode' },
        numeroLote: 'LOT-NOCB-3',
        fechaVencimiento: '2026-12-31',
        cantidadActual: 10,
      },
    ];

    const res = procesarEscaneoCarga('7801234567890', stockSinCodigos);
    expect(res.encontrado).toBe(false);
    expect(res.coincidencias).toHaveLength(0);
    expect(res.loteSeleccionado).toBeNull();
    expect(res.mensaje).toBe('No hay stock en depósito para este producto');
  });

  it('coincidencia exacta: un código que es prefijo de otro no debe coincidir', () => {
    // mockStockDeposito contiene:
    // id 8: codigoBarras '780123'
    // id 1: codigoBarras '7801234567890' (donde '780123' es prefijo)
    const resPrefix = procesarEscaneoCarga('780123', mockStockDeposito);

    // Debe coincidir ÚNICAMENTE con id 8, NO con id 1
    expect(resPrefix.encontrado).toBe(true);
    expect(resPrefix.coincidencias).toHaveLength(1);
    expect(resPrefix.coincidencias[0].id).toBe(8);
    expect(resPrefix.coincidencias[0].producto?.codigoBarras).toBe('780123');
    expect(resPrefix.loteSeleccionado?.id).toBe(8);

    // Y si se busca un prefijo que ningún producto tiene como código exacto:
    const resPrefixNoMatch = procesarEscaneoCarga('78012', mockStockDeposito);
    expect(resPrefixNoMatch.encontrado).toBe(false);
    expect(resPrefixNoMatch.coincidencias).toHaveLength(0);
    expect(resPrefixNoMatch.mensaje).toBe('No hay stock en depósito para este producto');
  });
});


describe('jornada-scanner: soporte de escaneo', () => {
  const originalBarcodeDetector = (window as any).BarcodeDetector;
  const originalMediaDevices = navigator.mediaDevices;

  afterEach(() => {
    if (originalBarcodeDetector !== undefined) {
      (window as any).BarcodeDetector = originalBarcodeDetector;
    } else {
      delete (window as any).BarcodeDetector;
    }

    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true,
    });
  });

  it('isBarcodeScannerSupportedSync retorna false si BarcodeDetector no existe en window', () => {
    delete (window as any).BarcodeDetector;
    expect(isBarcodeScannerSupportedSync()).toBe(false);
  });

  it('isBarcodeScannerSupportedSync retorna false si navigator.mediaDevices no existe', () => {
    (window as any).BarcodeDetector = class {};
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(isBarcodeScannerSupportedSync()).toBe(false);
  });

  it('isBarcodeScannerSupportedSync retorna true cuando BarcodeDetector y getUserMedia existen', () => {
    (window as any).BarcodeDetector = class {};
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(),
      },
      configurable: true,
      writable: true,
    });
    expect(isBarcodeScannerSupportedSync()).toBe(true);
  });
});
