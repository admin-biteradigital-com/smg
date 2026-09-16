import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, getPanel, getConfiguracionPublica } from '@/lib/api';

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
