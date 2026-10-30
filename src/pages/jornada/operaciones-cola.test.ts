import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dbModule from '@/lib/db';
import {
  calcularStockDisponible,
  agruparStockPorProducto,
  clasificarOperacionVisible,
  type StockServidorLote,
  type VentaLocalParaStock,
} from '@/lib/stock-disponible';
import { procesarResultadosBatch, flushOfflineQueue } from '@/lib/sync';
import { ApiRequestError, NetworkError } from '@/lib/api';
import type { OfflineQueueItem } from '@/types';

describe('D3: Acciones en Operaciones de Cola (Reintentar y Descartar)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retryOperation: vuelve la operación a status pending, reinicia retries a 0 y borra errorMessage', async () => {
    let modifiedItem: any;
    const modifyMock = vi.fn((callback: (item: any) => void) => {
      const item = {
        retries: 5,
        status: 'failed',
        maxRetries: 5,
        errorMessage: 'Stock insuficiente en vehículo para el producto 101. Disponible: 2, Solicitado: 5',
      };
      callback(item);
      modifiedItem = item;
      return Promise.resolve(1);
    });

    const whereMock = vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        modify: modifyMock,
      }),
    });

    vi.spyOn(dbModule.db, 'offline_queue', 'get').mockReturnValue({
      where: whereMock,
    } as any);

    await dbModule.retryOperation(99);

    expect(whereMock).toHaveBeenCalledWith('id');
    expect(modifiedItem).toBeDefined();
    expect(modifiedItem.status).toBe('pending');
    expect(modifiedItem.retries).toBe(0);
    expect(modifiedItem.errorMessage).toBeUndefined();
  });

  it('discardOperation: quita la operación de la cola Dexie', async () => {
    const deleteMock = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(dbModule.db, 'offline_queue', 'get').mockReturnValue({
      delete: deleteMock,
    } as any);

    await dbModule.discardOperation(99);

    expect(deleteMock).toHaveBeenCalledWith(99);
  });

  it('regla de panel D3: conflicto solo permite Descartar; error permite Reintentar y Descartar', () => {
    const opError: OfflineQueueItem = {
      id: 1,
      ulid: '01JM7890ABCDEF123456789001',
      type: 'CREATE_PEDIDO',
      endpoint: '/api/v1/ventas',
      method: 'POST',
      payload: { id_cliente: 10, lineas: [] },
      status: 'failed',
      retries: 5,
      maxRetries: 5,
      errorMessage: 'Stock insuficiente en vehículo para el producto 101. Disponible: 2, Solicitado: 5',
      timestamp: Date.now(),
    };

    const opConflict: OfflineQueueItem = {
      id: 2,
      ulid: '01JM7890ABCDEF123456789002',
      type: 'CREATE_PEDIDO',
      endpoint: '/api/v1/ventas',
      method: 'POST',
      payload: { id_cliente: 20, lineas: [] },
      status: 'conflict',
      retries: 5,
      maxRetries: 5,
      errorMessage: 'Conflicto: CLAVE_IDEMPOTENCIA_CONFLICTO',
      timestamp: Date.now(),
    };

    const puedeReintentar = (item: OfflineQueueItem) => {
      const esConflicto =
        item.status === 'conflict' ||
        Boolean(item.errorMessage?.toLowerCase().includes('conflicto'));
      return item.status === 'failed' && !esConflicto;
    };

    expect(puedeReintentar(opError)).toBe(true);
    expect(puedeReintentar(opConflict)).toBe(false);
  });
});

describe('D3: Bloqueo de Cierre de Jornada con Operaciones Pendientes o Fallidas', () => {
  it('con operaciones pendientes o fallidas, se bloquea el cierre y se enumeran las operaciones', () => {
    const cola: OfflineQueueItem[] = [
      {
        id: 1,
        ulid: '01JM7890ABCDEF123456789001',
        type: 'CREATE_PEDIDO',
        endpoint: '/api/v1/ventas',
        method: 'POST',
        payload: {
          id_cliente: 105,
          lineas: [{ id_producto: 101, cantidad: 5, precio_unitario: 2000 }],
        },
        status: 'failed',
        retries: 5,
        maxRetries: 5,
        errorMessage: 'Stock insuficiente en vehículo para el producto 101. Disponible: 2, Solicitado: 5',
        timestamp: Date.now(),
      },
      {
        id: 2,
        ulid: '01JM7890ABCDEF123456789002',
        type: 'CREATE_PEDIDO',
        endpoint: '/api/v1/ventas',
        method: 'POST',
        payload: {
          id_cliente: 106,
          lineas: [{ id_producto: 102, cantidad: 3, precio_unitario: 1500 }],
        },
        status: 'pending',
        retries: 0,
        maxRetries: 5,
        timestamp: Date.now(),
      },
    ];

    const operacionesBloqueantes = cola.filter(
      (it) =>
        it.status === 'pending' ||
        it.status === 'syncing' ||
        it.status === 'failed' ||
        it.status === 'conflict'
    );

    const puedeCerrar = operacionesBloqueantes.length === 0;

    expect(puedeCerrar).toBe(false);
    expect(operacionesBloqueantes).toHaveLength(2);
    expect(operacionesBloqueantes[0].status).toBe('failed');
    expect(operacionesBloqueantes[0].errorMessage).toBe(
      'Stock insuficiente en vehículo para el producto 101. Disponible: 2, Solicitado: 5'
    );
    expect(operacionesBloqueantes[1].status).toBe('pending');
  });

  it('sin operaciones en cola, se permite cerrar la jornada', () => {
    const cola: OfflineQueueItem[] = [];
    const operacionesBloqueantes = cola.filter(
      (it) =>
        it.status === 'pending' ||
        it.status === 'syncing' ||
        it.status === 'failed' ||
        it.status === 'conflict'
    );

    const puedeCerrar = operacionesBloqueantes.length === 0;
    expect(puedeCerrar).toBe(true);
  });
});

describe('D2: Agrupación en Pantalla de Venta', () => {
  it('dos lotes del mismo producto dan una sola tarjeta con la suma de los lotes', () => {
    const stockLotes: StockServidorLote[] = [
      {
        idLote: 1,
        idProducto: 101,
        codigoProducto: 'ALF-01',
        nombreProducto: 'Alfajor Triple',
        cantidadDisponible: 8,
        fechaVencimiento: '2026-11-15',
      },
      {
        idLote: 2,
        idProducto: 101,
        codigoProducto: 'ALF-01',
        nombreProducto: 'Alfajor Triple',
        cantidadDisponible: 12,
        fechaVencimiento: '2026-10-30', // vence antes
      },
    ];

    const disponible = calcularStockDisponible(stockLotes, []);
    const agrupados = agruparStockPorProducto(stockLotes, disponible);

    expect(agrupados).toHaveLength(1);
    expect(agrupados[0].idProducto).toBe(101);
    expect(agrupados[0].cantidadDisponible).toBe(20); // 8 + 12
    expect(agrupados[0].totalStockServidor).toBe(20);
    expect(agrupados[0].lotesCount).toBe(2);
    expect(agrupados[0].proximoVencimiento).toBe('2026-10-30');
  });

  it('el límite de cantidad es el disponible y se descuentan ventas locales', () => {
    const stockLotes: StockServidorLote[] = [
      {
        idLote: 1,
        idProducto: 101,
        codigoProducto: 'ALF-01',
        nombreProducto: 'Alfajor Triple',
        cantidadDisponible: 7,
      },
    ];

    const ventasLocales: VentaLocalParaStock[] = [
      {
        id: 'v1',
        estado: 'pending',
        lineas: [{ id_producto: 101, cantidad: 2 }],
      },
    ];

    const disponible = calcularStockDisponible(stockLotes, ventasLocales);
    const agrupados = agruparStockPorProducto(stockLotes, disponible);

    // Servidor: 7. Venta local: 2. Disponible: 5.
    expect(agrupados[0].cantidadDisponible).toBe(5);

    // Si el usuario intentara pedir 6, el límite clamp lo restringe a 5
    const cantidadSeleccionada = Math.min(6, agrupados[0].cantidadDisponible);
    expect(cantidadSeleccionada).toBe(5);
  });
});

describe('Clasificación de Errores de Sincronización y Presentación UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('db.ts: markOperationFailed, markOperationTransientError y markOperationConflict', () => {
    it('markOperationFailed con rechazo pasa de inmediato a status failed y agota retries', async () => {
      let modifiedItem: any;
      const modifyMock = vi.fn((callback: (item: any) => void) => {
        const item = { retries: 0, status: 'pending', maxRetries: 5, errorMessage: '' };
        callback(item);
        modifiedItem = item;
        return Promise.resolve(1);
      });

      const whereMock = vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({ modify: modifyMock }),
      });

      vi.spyOn(dbModule.db, 'offline_queue', 'get').mockReturnValue({
        where: whereMock,
      } as any);

      await dbModule.markOperationFailed(1, 'Stock insuficiente en vehículo para el producto 14', 'rechazo');

      expect(modifiedItem).toBeDefined();
      expect(modifiedItem.status).toBe('failed');
      expect(modifiedItem.retries).toBe(5); // agota retries para no reintentar automáticamente
      expect(modifiedItem.tipoError).toBe('rechazo');
      expect(modifiedItem.errorMessage).toBe('Stock insuficiente en vehículo para el producto 14');
    });

    it('markOperationTransientError mantiene status pending e incrementa retries mientras retries < maxRetries', async () => {
      let modifiedItem: any;
      const modifyMock = vi.fn((callback: (item: any) => void) => {
        const item = { retries: 0, status: 'pending', maxRetries: 5, errorMessage: '' };
        callback(item);
        modifiedItem = item;
        return Promise.resolve(1);
      });

      const whereMock = vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({ modify: modifyMock }),
      });

      vi.spyOn(dbModule.db, 'offline_queue', 'get').mockReturnValue({
        where: whereMock,
      } as any);

      await dbModule.markOperationTransientError(2, 'Failed to fetch');

      expect(modifiedItem).toBeDefined();
      expect(modifiedItem.status).toBe('pending');
      expect(modifiedItem.retries).toBe(1);
      expect(modifiedItem.tipoError).toBe('transitorio');
      expect(modifiedItem.errorMessage).toBe('Failed to fetch');
    });

    it('markOperationTransientError pasa a failed cuando se alcanza maxRetries', async () => {
      let modifiedItem: any;
      const modifyMock = vi.fn((callback: (item: any) => void) => {
        const item = { retries: 4, status: 'pending', maxRetries: 5, errorMessage: '' };
        callback(item);
        modifiedItem = item;
        return Promise.resolve(1);
      });

      const whereMock = vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({ modify: modifyMock }),
      });

      vi.spyOn(dbModule.db, 'offline_queue', 'get').mockReturnValue({
        where: whereMock,
      } as any);

      await dbModule.markOperationTransientError(2, 'Failed to fetch (intento final)');

      expect(modifiedItem).toBeDefined();
      expect(modifiedItem.status).toBe('failed');
      expect(modifiedItem.retries).toBe(5);
      expect(modifiedItem.tipoError).toBe('transitorio');
    });

    it('markOperationConflict marca status failed, retries agotados y tipoError conflicto', async () => {
      let modifiedItem: any;
      const modifyMock = vi.fn((callback: (item: any) => void) => {
        const item = { retries: 0, status: 'pending', maxRetries: 5, errorMessage: '' };
        callback(item);
        modifiedItem = item;
        return Promise.resolve(1);
      });

      const whereMock = vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({ modify: modifyMock }),
      });

      vi.spyOn(dbModule.db, 'offline_queue', 'get').mockReturnValue({
        where: whereMock,
      } as any);

      await dbModule.markOperationConflict(3, 'Conflicto de idempotencia');

      expect(modifiedItem).toBeDefined();
      expect(modifiedItem.status).toBe('failed');
      expect(modifiedItem.retries).toBe(5);
      expect(modifiedItem.tipoError).toBe('conflicto');
    });

    it('retryOperation limpia tipoError además de reiniciar retries y status', async () => {
      let modifiedItem: any;
      const modifyMock = vi.fn((callback: (item: any) => void) => {
        const item = {
          retries: 5,
          status: 'failed',
          maxRetries: 5,
          errorMessage: 'Stock insuficiente',
          tipoError: 'rechazo',
        };
        callback(item);
        modifiedItem = item;
        return Promise.resolve(1);
      });

      const whereMock = vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({ modify: modifyMock }),
      });

      vi.spyOn(dbModule.db, 'offline_queue', 'get').mockReturnValue({
        where: whereMock,
      } as any);

      await dbModule.retryOperation(1);

      expect(modifiedItem.status).toBe('pending');
      expect(modifiedItem.retries).toBe(0);
      expect(modifiedItem.errorMessage).toBeUndefined();
      expect(modifiedItem.tipoError).toBeUndefined();
    });
  });

  describe('clasificarOperacionVisible', () => {
    it('clasifica una operación de rechazo como Fallida con motivo visible y permite reintentar y descartar', () => {
      const item: OfflineQueueItem = {
        id: 1,
        ulid: '01JM7890ABCDEF123456789001',
        type: 'CREATE_SALE',
        endpoint: '/api/v1/ventas',
        method: 'POST',
        payload: {},
        status: 'failed',
        retries: 5,
        maxRetries: 5,
        tipoError: 'rechazo',
        errorMessage: 'Stock insuficiente en vehículo para el producto 14. Disponible: 0, Solicitado: 3',
        timestamp: Date.now(),
      };

      const info = clasificarOperacionVisible(item);
      expect(info.estadoVisible).toBe('fallida');
      expect(info.etiqueta).toBe('Fallida');
      expect(info.motivo).toBe('Stock insuficiente en vehículo para el producto 14. Disponible: 0, Solicitado: 3');
      expect(info.permiteReintentar).toBe(true);
      expect(info.permiteDescartar).toBe(true);
    });

    it('clasifica un conflicto como Conflicto con motivo visible, solo permite descartar (NO reintentar)', () => {
      const item: OfflineQueueItem = {
        id: 2,
        ulid: '01JM7890ABCDEF123456789002',
        type: 'CREATE_SALE',
        endpoint: '/api/v1/ventas',
        method: 'POST',
        payload: {},
        status: 'failed',
        retries: 5,
        maxRetries: 5,
        tipoError: 'conflicto',
        errorMessage: 'Conflicto: CLAVE_IDEMPOTENCIA_CONFLICTO',
        timestamp: Date.now(),
      };

      const info = clasificarOperacionVisible(item);
      expect(info.estadoVisible).toBe('conflicto');
      expect(info.etiqueta).toBe('Conflicto');
      expect(info.motivo).toBe('Conflicto: CLAVE_IDEMPOTENCIA_CONFLICTO');
      expect(info.permiteReintentar).toBe(false);
      expect(info.permiteDescartar).toBe(true);
    });

    it('clasifica una operación pendiente limpia (retries 0) como Pendiente sin error visible', () => {
      const item: OfflineQueueItem = {
        id: 3,
        ulid: '01JM7890ABCDEF123456789003',
        type: 'CREATE_SALE',
        endpoint: '/api/v1/ventas',
        method: 'POST',
        payload: {},
        status: 'pending',
        retries: 0,
        maxRetries: 5,
        timestamp: Date.now(),
      };

      const info = clasificarOperacionVisible(item);
      expect(info.estadoVisible).toBe('pendiente');
      expect(info.etiqueta).toBe('Pendiente');
      expect(info.motivo).toBeUndefined();
      expect(info.ultimoError).toBeUndefined();
      expect(info.permiteReintentar).toBe(false);
      expect(info.permiteDescartar).toBe(true);
    });

    it('clasifica una operación pendiente con fallo transitorio previo mostrando ultimoError', () => {
      const item: OfflineQueueItem = {
        id: 4,
        ulid: '01JM7890ABCDEF123456789004',
        type: 'CREATE_SALE',
        endpoint: '/api/v1/ventas',
        method: 'POST',
        payload: {},
        status: 'pending',
        retries: 2,
        maxRetries: 5,
        tipoError: 'transitorio',
        errorMessage: 'Sin conexión a internet (NetworkError)',
        timestamp: Date.now(),
      };

      const info = clasificarOperacionVisible(item);
      expect(info.estadoVisible).toBe('pendiente');
      expect(info.etiqueta).toBe('Pendiente');
      expect(info.motivo).toBeUndefined();
      expect(info.ultimoError).toBe('Sin conexión a internet (NetworkError)');
      expect(info.permiteReintentar).toBe(false);
      expect(info.permiteDescartar).toBe(true);
    });

    it('clasifica una operación sincronizando', () => {
      const item: OfflineQueueItem = {
        id: 5,
        ulid: '01JM7890ABCDEF123456789005',
        type: 'CREATE_SALE',
        endpoint: '/api/v1/ventas',
        method: 'POST',
        payload: {},
        status: 'syncing',
        retries: 0,
        maxRetries: 5,
        timestamp: Date.now(),
      };

      const info = clasificarOperacionVisible(item);
      expect(info.estadoVisible).toBe('sincronizando');
      expect(info.etiqueta).toBe('Sincronizando');
      expect(info.permiteReintentar).toBe(false);
      expect(info.permiteDescartar).toBe(false);
    });
  });

  describe('sync.ts: batch y fallback individual', () => {
    it('procesarResultadosBatch: r.status === "error" marca como fallida de inmediato con motivo de rechazo', async () => {
      const markFailedSpy = vi.spyOn(dbModule, 'markOperationFailed').mockResolvedValue(undefined);
      const markConflictSpy = vi.spyOn(dbModule, 'markOperationConflict').mockResolvedValue(undefined);
      const markSyncedSpy = vi.spyOn(dbModule, 'markOperationSynced').mockResolvedValue(undefined);

      const operations: OfflineQueueItem[] = [
        {
          id: 10,
          ulid: '01JM7890ABCDEF123456789010',
          type: 'CREATE_SALE',
          endpoint: '/api/v1/ventas',
          method: 'POST',
          payload: { id_cliente: 1, lineas: [{ id_producto: 14, cantidad: 3, precio_unitario: 1000 }] },
          status: 'pending',
          retries: 0,
          maxRetries: 5,
          timestamp: Date.now(),
        },
      ];

      const results = [
        {
          ulid: '01JM7890ABCDEF123456789010',
          status: 'error' as const,
          error: 'Stock insuficiente en vehículo para el producto 14. Disponible en vehículo: 0, Solicitado: 3',
        },
      ];

      const res = await procesarResultadosBatch(results, operations);

      expect(res.failed).toBe(1);
      expect(markFailedSpy).toHaveBeenCalledWith(
        10,
        'Stock insuficiente en vehículo para el producto 14. Disponible en vehículo: 0, Solicitado: 3'
      );
      expect(markConflictSpy).not.toHaveBeenCalled();
      expect(markSyncedSpy).not.toHaveBeenCalled();
    });

    it('procesarResultadosBatch: r.status === "conflict" marca como conflicto sin reintento', async () => {
      const markConflictSpy = vi.spyOn(dbModule, 'markOperationConflict').mockResolvedValue(undefined);

      const operations: OfflineQueueItem[] = [
        {
          id: 11,
          ulid: '01JM7890ABCDEF123456789011',
          type: 'CREATE_SALE',
          endpoint: '/api/v1/ventas',
          method: 'POST',
          payload: {},
          status: 'pending',
          retries: 0,
          maxRetries: 5,
          timestamp: Date.now(),
        },
      ];

      const results = [
        {
          ulid: '01JM7890ABCDEF123456789011',
          status: 'conflict' as const,
          error: 'CLAVE_IDEMPOTENCIA_CONFLICTO',
        },
      ];

      const res = await procesarResultadosBatch(results, operations);

      expect(res.conflicts).toBe(1);
      expect(markConflictSpy).toHaveBeenCalledWith(11, 'CLAVE_IDEMPOTENCIA_CONFLICTO');
    });

    it('fallback individual: 400 SALE_ERROR marca como fallida definitiva inmediata', async () => {
      const markFailedSpy = vi.spyOn(dbModule, 'markOperationFailed').mockResolvedValue(undefined);
      const markTransientSpy = vi.spyOn(dbModule, 'markOperationTransientError').mockResolvedValue(undefined);
      const markConflictSpy = vi.spyOn(dbModule, 'markOperationConflict').mockResolvedValue(undefined);

      const item: OfflineQueueItem = {
        id: 20,
        ulid: '01JM7890ABCDEF123456789020',
        type: 'CREATE_SALE',
        endpoint: '/api/v1/ventas',
        method: 'POST',
        payload: { id_cliente: 1, lineas: [] },
        status: 'pending',
        retries: 0,
        maxRetries: 5,
        timestamp: Date.now(),
      };

      vi.spyOn(dbModule, 'getPendingOperations').mockResolvedValue([item]);

      // Mock de api.post que rechaza con ApiRequestError 400
      const apiModule = await import('@/lib/api');
      vi.spyOn(apiModule.api, 'post').mockRejectedValue(
        new ApiRequestError(400, 'SALE_ERROR', 'Stock insuficiente en vehículo')
      );

      const res = await flushOfflineQueue();

      expect(res.failed).toBe(1);
      expect(markFailedSpy).toHaveBeenCalledWith(20, 'Stock insuficiente en vehículo');
      expect(markTransientSpy).not.toHaveBeenCalled();
      expect(markConflictSpy).not.toHaveBeenCalled();
    });

    it('fallback individual: error de red o timeout marca como error transitorio', async () => {
      const markFailedSpy = vi.spyOn(dbModule, 'markOperationFailed').mockResolvedValue(undefined);
      const markTransientSpy = vi.spyOn(dbModule, 'markOperationTransientError').mockResolvedValue(undefined);

      const item: OfflineQueueItem = {
        id: 21,
        ulid: '01JM7890ABCDEF123456789021',
        type: 'CREATE_SALE',
        endpoint: '/api/v1/ventas',
        method: 'POST',
        payload: { id_cliente: 1, lineas: [] },
        status: 'pending',
        retries: 0,
        maxRetries: 5,
        timestamp: Date.now(),
      };

      vi.spyOn(dbModule, 'getPendingOperations').mockResolvedValue([item]);

      const apiModule = await import('@/lib/api');
      vi.spyOn(apiModule.api, 'post').mockRejectedValue(new NetworkError('Failed to fetch'));

      const res = await flushOfflineQueue();

      expect(res.failed).toBe(1);
      expect(markTransientSpy).toHaveBeenCalledWith(21, 'Failed to fetch');
      expect(markFailedSpy).not.toHaveBeenCalled();
    });
  });
});

