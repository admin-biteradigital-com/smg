import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  api,
  getPanel,
  getConfiguracionPublica,
  getCatalogoPublico,
  getCatalogoMarcas,
  getCatalogoProductoById,
  fetchCatalog,
  fetchClientes,
  getClientesAdmin,
  getClienteById,
  createCliente,
  updateCliente,
  createSucursal,
  updateSucursal,
  getClientesSaldosPendientes,
  getVentasPendientesByCliente,
  getCobrosDeVenta,
} from '@/lib/api';

describe('ADR-017 Lote 1: Endpoints en Español (/salud, /panel, /configuracion/publica)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('api.isReachable() → /api/v1/salud', () => {
    it('debe realizar la petición a /api/v1/salud y retornar true en caso de respuesta exitosa', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const reachable = await api.isReachable();

      expect(reachable).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/v1/salud');
      expect(calledUrl).not.toContain('/api/v1/health');
    });

    it('debe retornar false si la petición a /api/v1/salud falla o da error de red', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const reachable = await api.isReachable();

      expect(reachable).toBe(false);
    });
  });

  describe('getPanel() → /api/v1/panel', () => {
    it('debe consultar GET /api/v1/panel y retornar la estructura esperada', async () => {
      const mockData = {
        data: {
          pedidosHoy: 12,
          montoHoy: 450000,
        },
      };

      const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockData as any);

      const res = await getPanel();

      expect(getSpy).toHaveBeenCalledWith('/api/v1/panel');
      expect(res.data.pedidosHoy).toBe(12);
      expect(res.data.montoHoy).toBe(450000);
    });
  });

  describe('getConfiguracionPublica() → /api/v1/configuracion/publica', () => {
    it('debe consultar GET /api/v1/configuracion/publica', async () => {
      const mockConfig = {
        data: {
          nombre: 'SMG Distribuciones',
          telefonoWhatsapp: '+56912345678',
        },
      };

      const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockConfig as any);

      const res = await getConfiguracionPublica();

      expect(getSpy).toHaveBeenCalledWith('/api/v1/configuracion/publica');
      expect(res.data).toEqual(mockConfig.data);
    });
  });
});

describe('ADR-017 Lote 2: Catálogo Público en Español (/catalogo, /catalogo/marcas, /catalogo/:id)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCatalogoPublico() → /api/v1/catalogo', () => {
    it('debe consultar GET /api/v1/catalogo sin parámetros adicionales', async () => {
      const mockRes = { data: [{ id: 1, nombre: 'Bebida Cola' }] };
      const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockRes as any);

      const res = await getCatalogoPublico();

      expect(getSpy).toHaveBeenCalledWith('/api/v1/catalogo');
      expect(res).toEqual(mockRes);
    });

    it('debe serializar parámetros de búsqueda y filtros en query string', async () => {
      const mockRes = { data: [] };
      const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockRes as any);

      await getCatalogoPublico({ marca: 'CCU', q: 'cola', page: 2, pageSize: 20 });

      expect(getSpy).toHaveBeenCalledWith('/api/v1/catalogo?marca=CCU&q=cola&page=2&pageSize=20');
    });

    it('fetchCatalog() debe delegar a /api/v1/catalogo manteniendo compatibilidad', async () => {
      const mockRes = { data: [{ id: 2, nombre: 'Agua Mineral' }] };
      const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockRes as any);

      const res = await fetchCatalog();

      expect(getSpy).toHaveBeenCalledWith('/api/v1/catalogo');
      expect(res).toEqual(mockRes);
    });
  });

  describe('getCatalogoMarcas() → /api/v1/catalogo/marcas', () => {
    it('debe consultar GET /api/v1/catalogo/marcas y retornar arreglo de marcas', async () => {
      const mockMarcas = ['Coca-Cola', 'Pepsi', 'Vital'];
      const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockMarcas as any);

      const res = await getCatalogoMarcas();

      expect(getSpy).toHaveBeenCalledWith('/api/v1/catalogo/marcas');
      expect(res).toEqual(mockMarcas);
    });
  });

  describe('getCatalogoProductoById() → /api/v1/catalogo/:id', () => {
    it('debe consultar GET /api/v1/catalogo/:id con el ID del producto', async () => {
      const mockProducto = { data: { id: 42, nombre: 'Jugo Naranja 1L' } };
      const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce(mockProducto as any);

      const res = await getCatalogoProductoById(42);

      expect(getSpy).toHaveBeenCalledWith('/api/v1/catalogo/42');
      expect(res).toEqual(mockProducto);
    });
  });
});

describe('ADR-017 Lote 3: Clientes y Sucursales en Español (/clientes)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchClientes() debe consultar GET /api/v1/clientes', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: [] } as any);
    await fetchClientes();
    expect(getSpy).toHaveBeenCalledWith('/api/v1/clientes');
  });

  it('getClientesAdmin() debe consultar GET /api/v1/clientes con query params', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: [] } as any);
    await getClientesAdmin({ q: 'almacen', activo: true, page: 1, pageSize: 25 });
    expect(getSpy).toHaveBeenCalledWith('/api/v1/clientes?page=1&pageSize=25&q=almacen&activo=true');
  });

  it('getClienteById() debe consultar GET /api/v1/clientes/:id', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { id: 7 } } as any);
    await getClienteById(7);
    expect(getSpy).toHaveBeenCalledWith('/api/v1/clientes/7');
  });

  it('createCliente() debe consultar POST /api/v1/clientes', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { id: 8 } } as any);
    const payload = {
      razonSocial: 'Comercial Test',
      rut: '77689935-6',
      sucursalPrincipal: {
        nombre: 'Casa Matriz',
        direccion: 'Av Central 123',
        ciudad: 'Santiago',
        region: 'Metropolitana',
      },
    };
    await createCliente(payload);
    expect(postSpy).toHaveBeenCalledWith('/api/v1/clientes', payload);
  });

  it('updateCliente() debe consultar PATCH /api/v1/clientes/:id', async () => {
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValueOnce({ data: { id: 8 } } as any);
    await updateCliente(8, { razonSocial: 'Comercial Test SPA' });
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/clientes/8', { razonSocial: 'Comercial Test SPA' });
  });

  it('createSucursal() debe consultar POST /api/v1/clientes/:id/sucursales', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { id: 1 } } as any);
    const sucursalPayload = {
      nombre: 'Sucursal Norte',
      direccion: 'Av Norte 456',
      ciudad: 'Antofagasta',
      region: 'Antofagasta',
    };
    await createSucursal(8, sucursalPayload);
    expect(postSpy).toHaveBeenCalledWith('/api/v1/clientes/8/sucursales', sucursalPayload);
  });

  it('updateSucursal() debe consultar PATCH /api/v1/clientes/:id/sucursales/:sucursalId', async () => {
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValueOnce({ data: { id: 1 } } as any);
    await updateSucursal(8, 1, { nombre: 'Sucursal Norte Editada' });
    expect(patchSpy).toHaveBeenCalledWith('/api/v1/clientes/8/sucursales/1', { nombre: 'Sucursal Norte Editada' });
  });
});

describe('ADR-017 Lote 5: Ventas, Cobros y Saldos en Español (/ventas)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getClientesSaldosPendientes() debe consultar GET /api/v1/ventas/clientes/saldos', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: [] } as any);
    await getClientesSaldosPendientes();
    expect(getSpy).toHaveBeenCalledWith('/api/v1/ventas/clientes/saldos');
  });

  it('getVentasPendientesByCliente() debe consultar GET /api/v1/ventas/cliente/:id/pendientes', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: [] } as any);
    await getVentasPendientesByCliente(15);
    expect(getSpy).toHaveBeenCalledWith('/api/v1/ventas/cliente/15/pendientes');
  });

  it('getCobrosDeVenta() debe consultar GET /api/v1/ventas/:ventaId/cobros', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: [] } as any);
    await getCobrosDeVenta(44);
    expect(getSpy).toHaveBeenCalledWith('/api/v1/ventas/44/cobros');
  });
});
