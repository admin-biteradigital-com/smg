import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dbModule from '@/lib/db';
import {
  calcularStockDisponible,
  agruparStockPorProducto,
  type StockServidorLote,
  type VentaLocalParaStock,
} from '@/lib/stock-disponible';
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
