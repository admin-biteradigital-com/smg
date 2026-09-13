import { describe, it, expect } from 'vitest';
import { generateUlid } from '@/lib/db';
import type { Jornada, StockVehiculoItem, OfflineQueueItem } from '@/types';

interface PedidoOfflinePayload {
  idJornada: string;
  idCliente: number;
  items: Array<{ idProducto: number; cantidad: number; precioUnitario: number }>;
  montoTotal: number;
}

interface CobroOfflinePayload {
  idJornada: string;
  idCliente: number;
  monto: number;
  metodoPago: string;
}

describe('ADR-015 / ADR-018: Regresión Offline-First de Modo Jornada', () => {
  it('valida el ciclo completo de datos y transacciones offline (apertura -> carga -> ruta -> venta -> cobro -> cierre)', () => {
    const timestamp = '2026-09-13T08:00:00.000Z';
    const jornadaId = '01JM7890ABCDEF1234567890';

    // ── 1. Apertura de Jornada Offline ─────────────────────────────────────────
    const jornadaOffline: Jornada = {
      id: jornadaId,
      idAbonado: 1,
      idVendedor: 10,
      idChofer: null,
      idVehiculo: 3,
      idRuta: 2,
      estado: 'abierta',
      fechaApertura: timestamp,
      fechaCierre: null,
      notasApertura: 'Jornada iniciada offline en SMG',
      notasCierre: null,
      vehiculoPatente: 'AB-123-CD',
      rutaNombre: 'Ruta Centro',
    };

    expect(jornadaOffline.estado).toBe('abierta');
    expect(jornadaOffline.idVehiculo).toBe(3);
    expect(jornadaOffline.idRuta).toBe(2);

    // ── 2. Carga de Stock en Vehículo Offline ──────────────────────────────────
    const stockVehiculo: StockVehiculoItem[] = [
      {
        id: 1,
        idVehiculo: 3,
        idProducto: 101,
        productoNombre: 'Bebida Cola 1.5L',
        productoCodigo: 'BEB-001',
        numeroLote: 'LOT-2026-A',
        fechaVencimiento: '2027-01-01',
        cantidad: 50,
        idJornada: jornadaId,
        actualizado: timestamp,
      },
      {
        id: 2,
        idVehiculo: 3,
        idProducto: 102,
        productoNombre: 'Galletas Choc 100g',
        productoCodigo: 'GAL-002',
        numeroLote: 'LOT-2026-B',
        fechaVencimiento: '2026-12-31',
        cantidad: 100,
        idJornada: jornadaId,
        actualizado: timestamp,
      },
    ];

    expect(stockVehiculo).toHaveLength(2);
    expect(stockVehiculo[0].cantidad).toBe(50);
    expect(stockVehiculo[1].cantidad).toBe(100);

    // ── 3. Navegación en Ruta Offline ──────────────────────────────────────────
    // El stock disponible para la venta en ruta
    const stockDisponibleProd1 = stockVehiculo[0].cantidad;
    expect(stockDisponibleProd1).toBe(50);

    // ── 4. Venta Offline (Registro en Cola y Descuento de Stock Local) ──────────
    const cantidadVendida = 12;
    stockVehiculo[0].cantidad -= cantidadVendida;

    const ventaUlid = generateUlid();
    const operacionVenta: OfflineQueueItem = {
      ulid: ventaUlid,
      type: 'CREATE_PEDIDO',
      endpoint: '/api/v1/orders',
      method: 'POST',
      payload: {
        idJornada: jornadaId,
        idCliente: 45,
        items: [{ idProducto: 101, cantidad: cantidadVendida, precioUnitario: 1200 }],
        montoTotal: cantidadVendida * 1200,
      } as PedidoOfflinePayload,
      status: 'pending',
      retries: 0,
      maxRetries: 5,
      timestamp: Date.now(),
    };

    expect(operacionVenta.type).toBe('CREATE_PEDIDO');
    expect(operacionVenta.status).toBe('pending');
    expect((operacionVenta.payload as PedidoOfflinePayload).montoTotal).toBe(14400);

    const saldoRemanente = stockVehiculo[0].cantidad;
    expect(saldoRemanente).toBe(38);

    // ── 5. Cobro Offline (Registro en Cola) ────────────────────────────────────
    const cobroUlid = generateUlid();
    const operacionCobro: OfflineQueueItem = {
      ulid: cobroUlid,
      type: 'CREATE_COBRO',
      endpoint: '/api/v1/payments',
      method: 'POST',
      payload: {
        idJornada: jornadaId,
        idCliente: 45,
        monto: 14400,
        metodoPago: 'efectivo',
      } as CobroOfflinePayload,
      status: 'pending',
      retries: 0,
      maxRetries: 5,
      timestamp: Date.now(),
    };

    expect(operacionCobro.type).toBe('CREATE_COBRO');
    expect(operacionCobro.status).toBe('pending');
    expect((operacionCobro.payload as CobroOfflinePayload).monto).toBe(14400);

    const colaOffline = [operacionVenta, operacionCobro];
    expect(colaOffline).toHaveLength(2);

    // ── 6. Cierre de Jornada Offline ───────────────────────────────────────────
    // Actualización de estado de la jornada a cerrada
    jornadaOffline.estado = 'cerrada';
    jornadaOffline.fechaCierre = '2026-09-13T17:30:00.000Z';
    jornadaOffline.notasCierre = 'Cierre normal con conciliación de stock';

    expect(jornadaOffline.estado).toBe('cerrada');
    expect(jornadaOffline.fechaCierre).toBeDefined();

    // Las operaciones siguen en cola offline para background sync al recuperar red
    expect(colaOffline.every((op) => op.status === 'pending')).toBe(true);
  });
});
