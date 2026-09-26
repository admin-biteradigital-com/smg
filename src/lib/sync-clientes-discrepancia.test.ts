import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from './db';
import {
  evaluateClientesDiscrepancy,
  getClientesSyncDiscrepancia,
  setClientesSyncDiscrepancia,
  purgeClientesCacheLocal,
  CLIENTES_SYNC_DISCREPANCIA_KEY,
} from './sync';

describe('Detección y Reconciliación de Discrepancia en Clientes (N -> 0)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('evaluateClientesDiscrepancy', () => {
    it('detecta discrepancia cuando localCount > 0 y serverCount === 0 (caso purga de servidor)', () => {
      const result = evaluateClientesDiscrepancy(4, 0);

      expect(result).not.toBeNull();
      expect(result?.localCount).toBe(4);
      expect(result?.serverCount).toBe(0);
      expect(typeof result?.timestamp).toBe('number');

      // Se persiste en localStorage
      const persisted = getClientesSyncDiscrepancia();
      expect(persisted).toEqual(result);
      expect(localStorage.getItem(CLIENTES_SYNC_DISCREPANCIA_KEY)).toContain('"localCount":4');
    });

    it('no activa discrepancia y limpia estado previo cuando ambos son no-cero (N -> N\')', () => {
      // Simular discrepancia previa
      setClientesSyncDiscrepancia({ localCount: 4, serverCount: 0, timestamp: Date.now() });
      expect(getClientesSyncDiscrepancia()).not.toBeNull();

      // Sincronización normal con clientes en servidor
      const result = evaluateClientesDiscrepancy(4, 3);

      expect(result).toBeNull();
      expect(getClientesSyncDiscrepancia()).toBeNull();
      expect(localStorage.getItem(CLIENTES_SYNC_DISCREPANCIA_KEY)).toBeNull();
    });

    it('no activa discrepancia cuando ambos son cero (0 -> 0)', () => {
      const result = evaluateClientesDiscrepancy(0, 0);

      expect(result).toBeNull();
      expect(getClientesSyncDiscrepancia()).toBeNull();
    });

    it('no activa discrepancia cuando la base local estaba vacía y el servidor envía datos (0 -> N)', () => {
      const result = evaluateClientesDiscrepancy(0, 5);

      expect(result).toBeNull();
      expect(getClientesSyncDiscrepancia()).toBeNull();
    });

    it('despacha evento siglo-clientes-discrepancia-change en window al cambiar estado', () => {
      const listener = vi.fn();
      window.addEventListener('siglo-clientes-discrepancia-change', listener);

      evaluateClientesDiscrepancy(3, 0);
      expect(listener).toHaveBeenCalledTimes(1);

      evaluateClientesDiscrepancy(3, 3);
      expect(listener).toHaveBeenCalledTimes(2);

      window.removeEventListener('siglo-clientes-discrepancia-change', listener);
    });
  });

  describe('purgeClientesAndSucursalesOnly & purgeClientesCacheLocal', () => {
    it('purga exclusivamente db.clientes y db.sucursales sin tocar ninguna otra tabla', async () => {
      // Mock de transacción y tablas de Dexie
      const clientesClearSpy = vi.fn().mockResolvedValue(undefined);
      const sucursalesClearSpy = vi.fn().mockResolvedValue(undefined);
      const productosClearSpy = vi.fn().mockResolvedValue(undefined);
      const stockVehiculoClearSpy = vi.fn().mockResolvedValue(undefined);
      const jornadasClearSpy = vi.fn().mockResolvedValue(undefined);
      const rutasClearSpy = vi.fn().mockResolvedValue(undefined);

      vi.spyOn(db.clientes, 'clear').mockImplementation(clientesClearSpy);
      vi.spyOn(db.sucursales, 'clear').mockImplementation(sucursalesClearSpy);
      vi.spyOn(db.productos, 'clear').mockImplementation(productosClearSpy);
      vi.spyOn(db.stock_vehiculo, 'clear').mockImplementation(stockVehiculoClearSpy);
      vi.spyOn(db.jornadas, 'clear').mockImplementation(jornadasClearSpy);
      vi.spyOn(db.rutas, 'clear').mockImplementation(rutasClearSpy);

      // Spy en la transacción para verificar que sólo pide permiso sobre clientes y sucursales
      const transactionSpy = (vi.spyOn(db, 'transaction') as any).mockImplementation(
        async (_mode: any, tables: any, callback: any) => {
          expect(tables).toEqual([db.clientes, db.sucursales]);
          return callback();
        }
      );

      // Establecer discrepancia previa
      setClientesSyncDiscrepancia({ localCount: 4, serverCount: 0, timestamp: Date.now() });
      expect(getClientesSyncDiscrepancia()).not.toBeNull();

      // Ejecutar la purga completa
      await purgeClientesCacheLocal();

      // Verificar llamadas a tablas de Clientes
      expect(clientesClearSpy).toHaveBeenCalledTimes(1);
      expect(sucursalesClearSpy).toHaveBeenCalledTimes(1);

      // Verificar aislamiento absoluto: NINGUNA otra tabla fue tocada
      expect(productosClearSpy).not.toHaveBeenCalled();
      expect(stockVehiculoClearSpy).not.toHaveBeenCalled();
      expect(jornadasClearSpy).not.toHaveBeenCalled();
      expect(rutasClearSpy).not.toHaveBeenCalled();

      // Verificar que la discrepancia fue eliminada
      expect(getClientesSyncDiscrepancia()).toBeNull();

      transactionSpy.mockRestore();
    });
  });
});
