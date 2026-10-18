import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  procesarEscaneoVenta,
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
