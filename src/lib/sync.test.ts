import { describe, it, expect } from 'vitest';
import { mapProducto, mapCliente, mapSucursal } from './sync';

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
});
