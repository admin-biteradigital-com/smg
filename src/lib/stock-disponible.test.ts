import { describe, it, expect, beforeEach } from 'vitest';
import {
  calcularStockDisponible,
  agruparStockPorProducto,
  registrarRefrescoJornada,
  getUltimoRefrescoJornada,
  registrarVentaConfirmada,
  getVentasConfirmadas,
  limpiarRegistroVentasConfirmadas,
  obtenerVentasLocalesParaStock,
  type StockServidorLote,
  type VentaLocalParaStock,
} from './stock-disponible';
import type { OfflineQueueItem } from '@/types';

describe('D1: Función pura calcularStockDisponible', () => {
  const stockBase: StockServidorLote[] = [
    {
      idLote: 1,
      idProducto: 101,
      codigoProducto: 'ALF-01',
      nombreProducto: 'Alfajor Artesanal',
      cantidadDisponible: 10,
      unidadMedida: 'unidad',
    },
    {
      idLote: 2,
      idProducto: 102,
      codigoProducto: 'BEB-01',
      nombreProducto: 'Bebida Cola 500ml',
      cantidadDisponible: 15,
      unidadMedida: 'unidad',
    },
  ];

  it('sin ventas: devuelve el stock completo del servidor', () => {
    const disponible = calcularStockDisponible(stockBase, []);

    expect(disponible.get(101)).toBe(10);
    expect(disponible.get(102)).toBe(15);
  });

  it('ventas pendientes, varias en el mismo producto: descuenta la suma de todas', () => {
    const ventas: VentaLocalParaStock[] = [
      {
        id: 'op-1',
        estado: 'pending',
        lineas: [{ id_producto: 101, cantidad: 2 }],
      },
      {
        id: 'op-2',
        estado: 'pending',
        lineas: [{ id_producto: 101, cantidad: 3 }],
      },
    ];

    const disponible = calcularStockDisponible(stockBase, ventas);

    // 10 - 2 - 3 = 5
    expect(disponible.get(101)).toBe(5);
    // 102 sin cambios
    expect(disponible.get(102)).toBe(15);
  });

  it('venta fallida, que descuenta: la mercadería se entregó físicamente al cliente', () => {
    const ventas: VentaLocalParaStock[] = [
      {
        id: 'op-failed',
        estado: 'failed',
        lineas: [{ id_producto: 101, cantidad: 4 }],
      },
    ];

    const disponible = calcularStockDisponible(stockBase, ventas);

    // 10 - 4 = 6
    expect(disponible.get(101)).toBe(6);
  });

  it('venta sincronizada antes y después del último refresco: solo descuenta la posterior al refresco', () => {
    const ultimoRefresco = 1000;

    const ventas: VentaLocalParaStock[] = [
      {
        id: 'op-antes',
        estado: 'confirmada',
        lineas: [{ id_producto: 101, cantidad: 3 }],
        timestampConfirmacion: 800, // Anterior al refresco: ya reflejada en el stock del servidor
      },
      {
        id: 'op-despues',
        estado: 'confirmada',
        lineas: [{ id_producto: 101, cantidad: 2 }],
        timestampConfirmacion: 1200, // Posterior al refresco: aún no reflejada
      },
    ];

    const disponible = calcularStockDisponible(stockBase, ventas, ultimoRefresco);

    // 10 - 2 = 8 (la venta de 800 no se descuenta de nuevo)
    expect(disponible.get(101)).toBe(8);
  });

  it('venta online confirmada sin refresco posterior: descuenta inmediatamente', () => {
    const ultimoRefresco = 5000;

    const ventas: VentaLocalParaStock[] = [
      {
        id: 'online-1',
        estado: 'confirmada',
        lineas: [{ id_producto: 102, cantidad: 5 }],
        timestampConfirmacion: 6000, // Confirmada después del último refresco
      },
    ];

    const disponible = calcularStockDisponible(stockBase, ventas, ultimoRefresco);

    // 15 - 5 = 10
    expect(disponible.get(102)).toBe(10);
  });

  it('varios lotes del mismo producto: disponible = Σ lotes del servidor − Σ cantidades locales', () => {
    const stockVariosLotes: StockServidorLote[] = [
      {
        idLote: 10,
        idProducto: 200,
        codigoProducto: 'GAL-01',
        nombreProducto: 'Galletas Vainilla',
        cantidadDisponible: 12,
        fechaVencimiento: '2026-11-01',
      },
      {
        idLote: 11,
        idProducto: 200,
        codigoProducto: 'GAL-01',
        nombreProducto: 'Galletas Vainilla',
        cantidadDisponible: 8,
        fechaVencimiento: '2026-12-01',
      },
    ];

    const ventas: VentaLocalParaStock[] = [
      {
        id: 'op-1',
        estado: 'pending',
        lineas: [{ id_producto: 200, cantidad: 7 }],
      },
    ];

    const disponible = calcularStockDisponible(stockVariosLotes, ventas);

    // Total servidor: 12 + 8 = 20. Vendido: 7. Disponible: 13.
    expect(disponible.get(200)).toBe(13);
  });

  it('el stock disponible nunca es menor a 0 si la venta local supera el stock registrado', () => {
    const ventas: VentaLocalParaStock[] = [
      {
        id: 'op-excess',
        estado: 'pending',
        lineas: [{ id_producto: 101, cantidad: 15 }],
      },
    ];

    const disponible = calcularStockDisponible(stockBase, ventas);

    // Servidor tenía 10, venta pide 15 -> clamp a 0
    expect(disponible.get(101)).toBe(0);
  });
});

describe('D2: Agrupación de stock por producto (agruparStockPorProducto)', () => {
  it('dos lotes del mismo producto dan una sola tarjeta con la suma de stock y vencimiento más próximo', () => {
    const lotesServidor: StockServidorLote[] = [
      {
        idLote: 1,
        idProducto: 101,
        codigoProducto: 'ALF-01',
        nombreProducto: 'Alfajor Artesanal',
        cantidadDisponible: 6,
        unidadMedida: 'unidad',
        numeroLote: 'LOT-A',
        fechaVencimiento: '2026-12-15',
      },
      {
        idLote: 2,
        idProducto: 101,
        codigoProducto: 'ALF-01',
        nombreProducto: 'Alfajor Artesanal',
        cantidadDisponible: 4,
        unidadMedida: 'unidad',
        numeroLote: 'LOT-B',
        fechaVencimiento: '2026-11-20', // Más próximo
      },
    ];

    const stockDisponibleMap = new Map<number, number>([[101, 10]]);
    const agrupados = agruparStockPorProducto(lotesServidor, stockDisponibleMap);

    expect(agrupados).toHaveLength(1);
    expect(agrupados[0].idProducto).toBe(101);
    expect(agrupados[0].nombreProducto).toBe('Alfajor Artesanal');
    expect(agrupados[0].totalStockServidor).toBe(10);
    expect(agrupados[0].cantidadDisponible).toBe(10);
    expect(agrupados[0].lotesCount).toBe(2);
    expect(agrupados[0].proximoVencimiento).toBe('2026-11-20');
  });

  it('aplica el límite de cantidad al stock disponible calculado', () => {
    const lotesServidor: StockServidorLote[] = [
      {
        idLote: 1,
        idProducto: 101,
        codigoProducto: 'ALF-01',
        nombreProducto: 'Alfajor Artesanal',
        cantidadDisponible: 10,
      },
    ];

    // Hay una venta offline pendiente de 3, por lo que disponible es 7
    const stockDisponibleMap = new Map<number, number>([[101, 7]]);
    const agrupados = agruparStockPorProducto(lotesServidor, stockDisponibleMap);

    expect(agrupados[0].totalStockServidor).toBe(10);
    expect(agrupados[0].cantidadDisponible).toBe(7);
    expect(agrupados[0].descuentoLocal).toBe(3);
  });
});

describe('Mecanismo de Registro Local de Ventas Confirmadas y Refresco', () => {
  beforeEach(() => {
    limpiarRegistroVentasConfirmadas();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('siglo_ultimo_refresco_jornada');
    }
  });

  it('registra timestamp de último refresco y limpia ventas anteriores a esa marca', () => {
    registrarVentaConfirmada([{ id_producto: 101, cantidad: 2 }], 1000);
    registrarVentaConfirmada([{ id_producto: 102, cantidad: 1 }], 1500);

    expect(getVentasConfirmadas()).toHaveLength(2);

    // Refresco exitoso del servidor ocurre en t=1200
    registrarRefrescoJornada(1200);

    expect(getUltimoRefrescoJornada()).toBe(1200);
    // La venta de t=1000 ya fue limpiada porque t=1000 <= 1200
    const restantes = getVentasConfirmadas();
    expect(restantes).toHaveLength(1);
    expect(restantes[0].confirmedAt).toBe(1500);
  });

  it('obtenerVentasLocalesParaStock combina cola offline y ventas confirmadas no reflejadas', () => {
    registrarRefrescoJornada(1000);
    registrarVentaConfirmada([{ id_producto: 101, cantidad: 5 }], 1500); // no reflejada aún

    const queue: OfflineQueueItem[] = [
      {
        id: 1,
        ulid: '01JM7890ABCDEF123456789012',
        type: 'CREATE_PEDIDO',
        endpoint: '/api/v1/ventas',
        method: 'POST',
        payload: {
          id_cliente: 1,
          lineas: [{ id_producto: 101, cantidad: 2, precio_unitario: 1000 }],
        },
        status: 'pending',
        retries: 0,
        maxRetries: 5,
        timestamp: 1600,
      },
      {
        id: 2,
        ulid: '01JM7890ABCDEF123456789013',
        type: 'CREATE_PEDIDO',
        endpoint: '/api/v1/ventas',
        method: 'POST',
        payload: {
          id_cliente: 2,
          lineas: [{ id_producto: 101, cantidad: 3, precio_unitario: 1000 }],
        },
        status: 'failed',
        retries: 5,
        maxRetries: 5,
        errorMessage: 'Stock insuficiente en vehículo',
        timestamp: 1700,
      },
    ];

    const ventas = obtenerVentasLocalesParaStock(queue);

    // 2 de la cola (pending + failed) + 1 confirmada pendiente de refresco = 3
    expect(ventas).toHaveLength(3);
    const totalDescuento101 = ventas
      .flatMap((v) => v.lineas)
      .filter((l) => l.id_producto === 101)
      .reduce((acc, l) => acc + l.cantidad, 0);

    // 2 (pending) + 3 (failed) + 5 (confirmada) = 10
    expect(totalDescuento101).toBe(10);
  });
});
