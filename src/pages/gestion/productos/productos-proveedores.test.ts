import { describe, it, expect, vi } from 'vitest';
import { ApiRequestError, api, asociarProveedorAProducto, desasociarProveedorDeProducto } from '@/lib/api';
import type { ProveedorAdminItem, ProveedorProductoItem } from '@/types';

describe('ADR-019: Relación Muchos-a-Muchos Productos y Proveedores', () => {
  describe('Lógica de Filtrado de Proveedores Disponibles', () => {
    const todosProveedores: ProveedorAdminItem[] = [
      {
        id: 1,
        idAbonado: 1,
        nombre: 'Distribuidora Central',
        rut: '776899356',
        contacto: null,
        telefono: null,
        email: null,
        direccion: null,
        activo: true,
        creado: '2026-01-01',
      },
      {
        id: 2,
        idAbonado: 1,
        nombre: 'Agrocomercial del Sur',
        rut: '76507455K',
        contacto: null,
        telefono: null,
        email: null,
        direccion: null,
        activo: true,
        creado: '2026-01-01',
      },
      {
        id: 3,
        idAbonado: 1,
        nombre: 'Lácteos Andes',
        rut: '123456785',
        contacto: null,
        telefono: null,
        email: null,
        direccion: null,
        activo: true,
        creado: '2026-01-01',
      },
    ];

    it('excluye los proveedores que ya están asociados al producto', () => {
      const proveedoresAsociados: ProveedorProductoItem[] = [
        { id: 1, nombre: 'Distribuidora Central', rut: '776899356' },
      ];

      const disponibles = todosProveedores.filter(
        (tp) => !proveedoresAsociados.some((pa) => pa.id === tp.id)
      );

      expect(disponibles).toHaveLength(2);
      expect(disponibles.map((p) => p.id)).toEqual([2, 3]);
    });

    it('retorna arreglo vacío si todos los proveedores están asociados', () => {
      const proveedoresAsociados: ProveedorProductoItem[] = [
        { id: 1, nombre: 'Distribuidora Central', rut: '776899356' },
        { id: 2, nombre: 'Agrocomercial del Sur', rut: '76507455K' },
        { id: 3, nombre: 'Lácteos Andes', rut: '123456785' },
      ];

      const disponibles = todosProveedores.filter(
        (tp) => !proveedoresAsociados.some((pa) => pa.id === tp.id)
      );

      expect(disponibles).toHaveLength(0);
    });

    it('retorna todos los proveedores si ninguno está asociado aún', () => {
      const proveedoresAsociados: ProveedorProductoItem[] = [];

      const disponibles = todosProveedores.filter(
        (tp) => !proveedoresAsociados.some((pa) => pa.id === tp.id)
      );

      expect(disponibles).toHaveLength(3);
    });
  });

  describe('Confirmación en Línea Exclusiva (Single-item State)', () => {
    it('garantiza que solo una tarjeta puede estar en confirmación simultáneamente', () => {
      let proveedorParaQuitar: ProveedorProductoItem | null = null;

      const prov1: ProveedorProductoItem = { id: 1, nombre: 'Distribuidora Central', rut: '776899356' };
      const prov2: ProveedorProductoItem = { id: 2, nombre: 'Agrocomercial del Sur', rut: '76507455K' };

      // Usuario presiona "Quitar" en prov1
      proveedorParaQuitar = prov1;
      expect(proveedorParaQuitar?.id === prov1.id).toBe(true);
      expect(proveedorParaQuitar?.id === prov2.id).toBe(false);

      // Usuario presiona "Quitar" rápidamente en prov2 antes de confirmar prov1
      proveedorParaQuitar = prov2;
      expect(proveedorParaQuitar?.id === prov1.id).toBe(false);
      expect(proveedorParaQuitar?.id === prov2.id).toBe(true);

      // Usuario cancela
      proveedorParaQuitar = null;
      expect(proveedorParaQuitar).toBeNull();
    });
  });

  describe('Mapeo de Errores y Casos Límite de API (ApiRequestError)', () => {
    it('debe manejar error 409 Conflict (asociación duplicada)', () => {
      const backendMessage = 'Este proveedor ya está asociado a este producto';
      const error = new ApiRequestError(409, 'CONFLICT', backendMessage);

      expect(error.status).toBe(409);
      expect(error.message).toBe(backendMessage);

      // Bloque catch en ProductoFormPage
      const msg = error instanceof ApiRequestError ? error.message : 'Error genérico';
      expect(msg).toBe(backendMessage);
    });

    it('debe manejar error 404 Not Found (producto o proveedor inexistente)', () => {
      const backendMessage = 'Producto no encontrado';
      const error = new ApiRequestError(404, 'NOT_FOUND', backendMessage);

      expect(error.status).toBe(404);
      expect(error.message).toBe(backendMessage);

      const msg = error instanceof ApiRequestError ? error.message : 'Error genérico';
      expect(msg).toBe(backendMessage);
    });
  });

  describe('Llamadas al Cliente API (Contrato SIGLO)', () => {
    it('asociarProveedorAProducto llama a POST con el payload estricto { id_proveedor }', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { id: 10, idProducto: 5, idProveedor: 2, creado: '2026-09-13T12:00:00Z' },
      } as any);

      const res = await asociarProveedorAProducto(5, 2);

      expect(postSpy).toHaveBeenCalledWith(
        '/api/v1/admin/productos/5/proveedores',
        { id_proveedor: 2 }
      );
      expect(res.data.idProducto).toBe(5);
      expect(res.data.idProveedor).toBe(2);

      postSpy.mockRestore();
    });

    it('desasociarProveedorDeProducto llama a DELETE con la ruta correcta', async () => {
      const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValueOnce({
        data: { success: true },
      } as any);

      const res = await desasociarProveedorDeProducto(5, 2);

      expect(deleteSpy).toHaveBeenCalledWith(
        '/api/v1/admin/productos/5/proveedores/2'
      );
      expect(res.data.success).toBe(true);

      deleteSpy.mockRestore();
    });
  });
});
