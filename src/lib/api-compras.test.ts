import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getProductosAdmin,
  getOrdenesCompra,
  getOrdenCompraById,
  createOrdenCompra,
  updateOrdenCompra,
  confirmarOrdenCompra,
  cancelarOrdenCompra,
  registrarPagoOrdenCompra,
} from '@/lib/api';

describe('ADR-020: API Endpoints para Órdenes de Compra y Proveedores', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProductosAdmin con filtro id_proveedor', () => {
    it('debe incluir id_proveedor y activo en la query string si se pasan como objeto', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await getProductosAdmin({ activo: 1, id_proveedor: 5 });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('/api/v1/admin/productos?activo=1&id_proveedor=5');
    });

    it('debe mantener compatibilidad con la firma anterior (activo como número)', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await getProductosAdmin(1);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('/api/v1/admin/productos?activo=1');
      expect(url).not.toContain('id_proveedor');
    });
  });

  describe('getOrdenesCompra', () => {
    it('debe consultar GET /api/v1/ordenes-compra sin parámetros por defecto', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await getOrdenesCompra();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('/api/v1/ordenes-compra');
    });

    it('debe agregar filtros estado y id_proveedor en la query string', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await getOrdenesCompra({ estado: 'confirmada', id_proveedor: 10 });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('/api/v1/ordenes-compra?estado=confirmada&id_proveedor=10');
    });
  });

  describe('getOrdenCompraById', () => {
    it('debe consultar GET /api/v1/ordenes-compra/:id', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { id: 12, estado: 'borrador', lineas: [], pagos: [] },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const res = await getOrdenCompraById(12);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('/api/v1/ordenes-compra/12');
      expect(res.data.id).toBe(12);
    });
  });

  describe('createOrdenCompra', () => {
    it('debe enviar POST /api/v1/ordenes-compra con body JSON en snake_case', async () => {
      const payload = {
        id_proveedor: 3,
        condicion_pago: 'credito' as const,
        fecha_vencimiento_pago: '2026-10-30',
        fecha_entrega_estimada: '2026-10-15',
        notas: 'Entrega en la mañana',
        lineas: [{ id_producto: 101, cantidad: 5, precio_unitario_acordado: 2500 }],
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { id: 1, ...payload, estado: 'borrador' },
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const res = await createOrdenCompra(payload);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/ordenes-compra');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual(payload);
      expect(res.data.id).toBe(1);
    });
  });

  describe('updateOrdenCompra', () => {
    it('debe enviar PATCH /api/v1/ordenes-compra/:id con campos a actualizar', async () => {
      const payload = {
        condicion_pago: 'contado' as const,
        fecha_vencimiento_pago: null,
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { id: 7, condicion_pago: 'contado' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const res = await updateOrdenCompra(7, payload);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/ordenes-compra/7');
      expect(init?.method).toBe('PATCH');
      expect(JSON.parse(init?.body as string)).toEqual(payload);
      expect(res.data.id).toBe(7);
    });
  });

  describe('confirmarOrdenCompra', () => {
    it('debe enviar PATCH /api/v1/ordenes-compra/:id/confirmar sin body', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { id: 9, estado: 'confirmada' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const res = await confirmarOrdenCompra(9);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/ordenes-compra/9/confirmar');
      expect(init?.method).toBe('PATCH');
      expect(res.data.estado).toBe('confirmada');
    });
  });

  describe('cancelarOrdenCompra', () => {
    it('debe enviar PATCH /api/v1/ordenes-compra/:id/cancelar', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { id: 9, estado: 'cancelada' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const res = await cancelarOrdenCompra(9);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/ordenes-compra/9/cancelar');
      expect(init?.method).toBe('PATCH');
      expect(res.data.estado).toBe('cancelada');
    });
  });

  describe('registrarPagoOrdenCompra', () => {
    it('debe enviar POST /api/v1/ordenes-compra/:id/pagos con payload { monto, fecha_pago, metodo }', async () => {
      const pagoPayload = {
        monto: 30000,
        fecha_pago: '2026-10-04',
        metodo: 'transferencia',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id_orden_compra: 15,
              monto: 30000,
              fecha_pago: '2026-10-04',
              metodo: 'transferencia',
              registrado_por: 'admin@smg.cl',
              total_pagado: 30000,
              total_orden: 50000,
              estado_pago: 'pagado_parcial',
            },
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const res = await registrarPagoOrdenCompra(15, pagoPayload);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/ordenes-compra/15/pagos');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual(pagoPayload);
      expect(res.data.estado_pago).toBe('pagado_parcial');
      expect(res.data.total_pagado).toBe(30000);
    });
  });
});
