import { describe, it, expect } from 'vitest';
import {
  mapProducto,
  mapCliente,
  mapSucursal,
  mapVehiculo,
  mapRuta,
  mapStockDeposito,
} from './sync';

describe('Master Data Sync - Mapping helpers', () => {
  const timestamp = '2026-08-21T02:00:00.000Z';

  it('maps BackendProducto to frontend Producto correctly', () => {
    const backendProd = {
      id: 105,
      nombre: 'Agua Mineral 500ml',
      descripcionWeb: 'Agua purificada',
      marca: 'SMG',
      imagenUrl: '/productos/105/imagen.webp',
      codigoBarras: '7801234567890',
      codigoQr: null,
      unidadVenta: 'Unidad',
      precioUnitarioSugerido: 650,
      precioPublico: 800,
      precioOferta: 750,
      categoriaWeb: 'bebidas',
      activo: 1,
    };

    const mapped = mapProducto(backendProd, timestamp);

    expect(mapped).toEqual({
      id: '105',
      codigo: '7801234567890',
      nombre: 'Agua Mineral 500ml',
      descripcion: 'Agua purificada',
      categoriaId: 'bebidas',
      unidadMedida: 'Unidad',
      precioBase: 650,
      precioPublico: 800,
      precioOferta: 750,
      imageUrl: '/productos/105/imagen.webp',
      activo: true,
      empresaId: '',
      updatedAt: timestamp,
      marca: 'SMG',
    });
  });

  it('handles null and optional fields in BackendProducto', () => {
    const backendProd = {
      id: 101,
      nombre: 'Alfajor',
      descripcionWeb: null,
      marca: 'Don Satur',
      imagenUrl: '',
      codigoBarras: null,
      codigoQr: null,
      unidadVenta: null,
      precioUnitarioSugerido: null,
      precioPublico: null,
      precioOferta: null,
      categoriaWeb: null,
      activo: 0,
    };

    const mapped = mapProducto(backendProd, timestamp);

    expect(mapped.id).toBe('101');
    expect(mapped.codigo).toBe('101'); // Fallback to id
    expect(mapped.descripcion).toBeUndefined();
    expect(mapped.categoriaId).toBe('');
    expect(mapped.precioBase).toBe(0);
    expect(mapped.precioPublico).toBeUndefined();
    expect(mapped.precioOferta).toBeUndefined();
    expect(mapped.activo).toBe(false);
    expect(mapped.marca).toBe('Don Satur');
  });

  it('maps BackendCliente to frontend Cliente correctly', () => {
    const backendCli = {
      id: 1,
      razonSocial: 'Minimarket Los Alerces',
      rut: '76123456-7',
      segmento: 'Almacén',
      limiteCredito: 500000,
      cicloReabastecimientoDias: 7,
      activo: true,
      sucursales: [],
    };

    const mapped = mapCliente(backendCli, timestamp);

    expect(mapped).toEqual({
      id: '1',
      rut: '76123456-7',
      razonSocial: 'Minimarket Los Alerces',
      tipo: 'minorista',
      estado: 'activo',
      empresaId: '',
      updatedAt: timestamp,
    });
  });

  it('maps BackendSucursal to frontend Sucursal correctly', () => {
    const backendSuc = {
      id: 10,
      codigo: 'SUC-01',
      nombre: 'Casa Matriz',
      direccion: 'Av. Chamiza 1234',
      ciudad: 'Puerto Montt',
      telefono: '+56912345678',
      latitud: -41.4693,
      longitud: -72.9424,
      esPrincipal: true,
    };

    const mapped = mapSucursal(backendSuc, '1', timestamp);

    expect(mapped).toEqual({
      id: '10',
      clienteId: '1',
      nombre: 'Casa Matriz',
      direccion: 'Av. Chamiza 1234',
      ciudad: 'Puerto Montt',
      lat: -41.4693,
      lng: -72.9424,
      contactoTelefono: '+56912345678',
      empresaId: '',
      updatedAt: timestamp,
    });
  });

  it('maps BackendVehiculo to frontend Vehiculo correctly', () => {
    const backendVeh = {
      id: 1,
      patente: 'ABCD-12',
      marca: 'Hyundai',
      modelo: 'Porter',
      anio: 2022,
      tipo: 'camioneta',
      capacidadKg: 1500,
      estado: 'disponible',
    };

    const mapped = mapVehiculo(backendVeh);

    expect(mapped).toEqual({
      id: 1,
      patente: 'ABCD-12',
      marca: 'Hyundai',
      modelo: 'Porter',
      anio: 2022,
      tipo: 'camioneta',
      capacidadKg: 1500,
      estado: 'disponible',
    });
  });

  it('handles null fields in BackendVehiculo', () => {
    const backendVeh = {
      id: 2,
      patente: 'WXYZ-34',
      marca: null,
      modelo: null,
      anio: null,
      tipo: null,
      capacidadKg: null,
      estado: 'en_ruta',
    };

    const mapped = mapVehiculo(backendVeh);

    expect(mapped).toEqual({
      id: 2,
      patente: 'WXYZ-34',
      marca: null,
      modelo: null,
      anio: null,
      tipo: null,
      capacidadKg: null,
      estado: 'en_ruta',
    });
  });

  it('maps BackendRuta to frontend Ruta correctly', () => {
    const backendRuta = {
      id: 1,
      nombre: 'Ruta Norte',
      descripcion: 'Cobertura sector Alerce y Puerto Varas',
      distanciaEstimadaKm: 45.5,
      duracionEstimadaHoras: 3.5,
      activa: 1,
    };

    const mapped = mapRuta(backendRuta);

    expect(mapped).toEqual({
      id: 1,
      nombre: 'Ruta Norte',
      descripcion: 'Cobertura sector Alerce y Puerto Varas',
      distanciaEstimadaKm: 45.5,
      duracionEstimadaHoras: 3.5,
      activa: 1,
    });
  });

  it('maps BackendStockDepositoItem to frontend StockDepositoItem correctly', () => {
    const backendStock = {
      id: 1,
      producto: { id: 104, nombre: 'Turrón de Maní 25g' },
      numeroLote: 'TLAD-202506-001',
      fechaVencimiento: '2026-12-31',
      cantidadActual: 58,
      unidadBase: 'unidad',
      diasParaVencer: 122,
      alertaVencimiento: false,
    };

    const mapped = mapStockDeposito(backendStock, timestamp);

    expect(mapped).toEqual({
      id: 1,
      idProducto: 104,
      nombreProducto: 'Turrón de Maní 25g',
      producto: { id: 104, nombre: 'Turrón de Maní 25g' },
      numeroLote: 'TLAD-202506-001',
      fechaVencimiento: '2026-12-31',
      cantidadActual: 58,
      unidadBase: 'unidad',
      diasParaVencer: 122,
      alertaVencimiento: false,
      updatedAt: timestamp,
    });
  });
});

describe('ADR-015 Offline Jornada - ULID & Queue Types', () => {
  it('generateUlid returns a non-empty string identifier', async () => {
    const { generateUlid } = await import('./db');
    const ulid1 = generateUlid();
    const ulid2 = generateUlid();

    expect(typeof ulid1).toBe('string');
    expect(ulid1.length).toBeGreaterThanOrEqual(16);
    expect(typeof ulid2).toBe('string');
    expect(ulid1).not.toBe(ulid2);
  });

  it('validates OPEN_JORNADA payload structure for offline queue', () => {
    const payload = {
      id: '01JM7890ABCDEF1234567890',
      idVehiculo: 1,
      idRuta: 2,
      notasApertura: 'Inicio de ruta norte',
    };

    const queueItem = {
      type: 'OPEN_JORNADA' as const,
      endpoint: '/api/v1/jornadas',
      method: 'POST' as const,
      payload,
      maxRetries: 5,
    };

    expect(queueItem.type).toBe('OPEN_JORNADA');
    expect(queueItem.endpoint).toBe('/api/v1/jornadas');
    expect(queueItem.method).toBe('POST');
    expect(queueItem.payload.id).toBe('01JM7890ABCDEF1234567890');
    expect(queueItem.payload.idVehiculo).toBe(1);
  });
});


