import { describe, it, expect } from 'vitest';
import {
  armarPayloadRecepcion,
  calcularDiferenciasRecepcion,
  validarFormularioRecepcion,
  esVencimientoPasado,
  traducirErrorRecepcion,
  type FilaLoteRecepcion,
} from './recepciones';
import { ApiRequestError } from './api';

describe('ADR-020: Módulo Recepciones — Lógica Pura', () => {
  // ─── 1. Armado del Payload ──────────────────────────────────────────────────
  describe('armarPayloadRecepcion', () => {
    it('debe armar el payload estricto en camelCase excluyendo campos innecesarios', () => {
      const filas: FilaLoteRecepcion[] = [
        {
          idFila: 'fila-1',
          idProducto: 101,
          nombreProducto: 'Bebida Cola 1.5L',
          codigoProducto: 'BEB-01',
          unidadCompra: 'caja 12u',
          cantidadPedida: 20,
          cantidadRecibida: 20,
          numeroLote: 'LOT-2026-X1',
          fechaVencimiento: '2027-06-30',
        },
      ];

      const payload = armarPayloadRecepcion({
        idOrdenCompra: 12,
        nroGuiaRemision: 'GR-9901',
        filas,
      });

      expect(payload).toEqual({
        idOrdenCompra: 12,
        nroGuiaRemision: 'GR-9901',
        items: [
          {
            idProducto: 101,
            cantidadRecibida: 20,
            numeroLote: 'LOT-2026-X1',
            fechaVencimiento: '2027-06-30',
          },
        ],
      });

      // Asegurar que no contenga campos adicionales que Zod .strict() rechazaría
      const itemKeys = Object.keys(payload.items[0]);
      expect(itemKeys.sort()).toEqual(
        ['cantidadRecibida', 'fechaVencimiento', 'idProducto', 'numeroLote'].sort()
      );
    });

    it('debe excluir del envío las líneas con cantidad 0 o vacías', () => {
      const filas: FilaLoteRecepcion[] = [
        {
          idFila: 'fila-1',
          idProducto: 101,
          nombreProducto: 'Producto Recibido',
          cantidadPedida: 10,
          cantidadRecibida: 10,
          numeroLote: 'LOT-1',
          fechaVencimiento: '2027-01-01',
        },
        {
          idFila: 'fila-2',
          idProducto: 102,
          nombreProducto: 'Producto No Recibido (0)',
          cantidadPedida: 5,
          cantidadRecibida: 0,
          numeroLote: '',
          fechaVencimiento: '',
        },
        {
          idFila: 'fila-3',
          idProducto: 103,
          nombreProducto: 'Producto No Recibido (vacío)',
          cantidadPedida: 8,
          cantidadRecibida: '',
          numeroLote: '',
          fechaVencimiento: '',
        },
      ];

      const payload = armarPayloadRecepcion({
        idOrdenCompra: 5,
        filas,
      });

      expect(payload.items).toHaveLength(1);
      expect(payload.items[0].idProducto).toBe(101);
      expect(payload.items[0].cantidadRecibida).toBe(10);
    });

    it('debe admitir múltiples lotes para un mismo idProducto', () => {
      const filas: FilaLoteRecepcion[] = [
        {
          idFila: 'fila-1a',
          idProducto: 200,
          nombreProducto: 'Leche Entera',
          cantidadPedida: 50,
          cantidadRecibida: 30,
          numeroLote: 'LOTE-A',
          fechaVencimiento: '2027-05-15',
        },
        {
          idFila: 'fila-1b',
          idProducto: 200,
          nombreProducto: 'Leche Entera',
          cantidadPedida: 50,
          cantidadRecibida: 20,
          numeroLote: 'LOTE-B',
          fechaVencimiento: '2027-06-20',
        },
      ];

      const payload = armarPayloadRecepcion({
        idOrdenCompra: 7,
        nroGuiaRemision: '  ',
        filas,
      });

      expect(payload.nroGuiaRemision).toBeNull();
      expect(payload.items).toHaveLength(2);
      expect(payload.items[0]).toEqual({
        idProducto: 200,
        cantidadRecibida: 30,
        numeroLote: 'LOTE-A',
        fechaVencimiento: '2027-05-15',
      });
      expect(payload.items[1]).toEqual({
        idProducto: 200,
        cantidadRecibida: 20,
        numeroLote: 'LOTE-B',
        fechaVencimiento: '2027-06-20',
      });
    });
  });

  // ─── 2. Detección de Diferencias y Totales ──────────────────────────────────
  describe('calcularDiferenciasRecepcion', () => {
    it('debe indicar sin diferencias cuando todo lo pedido se recibe exactamente', () => {
      const lineasOrden = [
        { id_producto: 1, cantidad: 50, producto_nombre: 'Arroz' },
        { id_producto: 2, cantidad: 20, producto_nombre: 'Fideos' },
      ];

      const filas: FilaLoteRecepcion[] = [
        {
          idFila: 'f1',
          idProducto: 1,
          nombreProducto: 'Arroz',
          cantidadPedida: 50,
          cantidadRecibida: 50,
          numeroLote: 'L1',
          fechaVencimiento: '2028-01-01',
        },
        {
          idFila: 'f2',
          idProducto: 2,
          nombreProducto: 'Fideos',
          cantidadPedida: 20,
          cantidadRecibida: 20,
          numeroLote: 'L2',
          fechaVencimiento: '2028-01-01',
        },
      ];

      const res = calcularDiferenciasRecepcion(lineasOrden, filas);
      expect(res.hayDiferencias).toBe(false);
      expect(res.productosConDiferencia).toHaveLength(0);
      expect(res.productosNoRecibidos).toHaveLength(0);
      expect(res.totalCantidadRecibida).toBe(70);
    });

    it('debe detectar diferencias si la suma de un producto difiere (ej. pedido 50, recibido 48)', () => {
      const lineasOrden = [
        { id_producto: 1, cantidad: 50, producto_nombre: 'Arroz' },
      ];

      const filas: FilaLoteRecepcion[] = [
        {
          idFila: 'f1a',
          idProducto: 1,
          nombreProducto: 'Arroz',
          cantidadPedida: 50,
          cantidadRecibida: 30,
          numeroLote: 'L1',
          fechaVencimiento: '2028-01-01',
        },
        {
          idFila: 'f1b',
          idProducto: 1,
          nombreProducto: 'Arroz',
          cantidadPedida: 50,
          cantidadRecibida: 18,
          numeroLote: 'L2',
          fechaVencimiento: '2028-01-01',
        },
      ];

      const res = calcularDiferenciasRecepcion(lineasOrden, filas);
      expect(res.hayDiferencias).toBe(true);
      expect(res.productosConDiferencia).toHaveLength(1);
      expect(res.productosConDiferencia[0]).toEqual({
        idProducto: 1,
        nombreProducto: 'Arroz',
        unidadCompra: undefined,
        cantidadPedida: 50,
        cantidadRecibida: 48,
        diferencia: -2,
        tieneDiferencia: true,
        noRecibido: false,
      });
    });

    it('debe clasificar como noRecibido un producto cuya cantidad recibida sea 0', () => {
      const lineasOrden = [
        { id_producto: 1, cantidad: 10, producto_nombre: 'Prod A' },
        { id_producto: 2, cantidad: 5, producto_nombre: 'Prod B' },
      ];

      const filas: FilaLoteRecepcion[] = [
        {
          idFila: 'f1',
          idProducto: 1,
          nombreProducto: 'Prod A',
          cantidadPedida: 10,
          cantidadRecibida: 10,
          numeroLote: 'L1',
          fechaVencimiento: '2028-01-01',
        },
        {
          idFila: 'f2',
          idProducto: 2,
          nombreProducto: 'Prod B',
          cantidadPedida: 5,
          cantidadRecibida: 0,
          numeroLote: '',
          fechaVencimiento: '',
        },
      ];

      const res = calcularDiferenciasRecepcion(lineasOrden, filas);
      expect(res.hayDiferencias).toBe(true);
      expect(res.productosNoRecibidos).toHaveLength(1);
      expect(res.productosNoRecibidos[0].idProducto).toBe(2);
      expect(res.productosNoRecibidos[0].noRecibido).toBe(true);
    });
  });

  // ─── 3. Validación de Formulario en Cliente ─────────────────────────────────
  describe('validarFormularioRecepcion', () => {
    it('debe rechazar si no hay ningún producto con cantidad > 0', () => {
      const filas: FilaLoteRecepcion[] = [
        {
          idFila: 'f1',
          idProducto: 1,
          nombreProducto: 'Prod 1',
          cantidadPedida: 10,
          cantidadRecibida: 0,
          numeroLote: '',
          fechaVencimiento: '',
        },
      ];

      const res = validarFormularioRecepcion({
        filas,
        hayDiferencias: true,
        checkboxDiferenciaConfirmado: true,
      });

      expect(res.valido).toBe(false);
      expect(res.erroresGenerales).toContain(
        'Debe registrar al menos un producto con cantidad mayor a 0.'
      );
    });

    it('debe rechazar filas con lote o vencimiento vacíos cuando tienen cantidad > 0', () => {
      const filas: FilaLoteRecepcion[] = [
        {
          idFila: 'f1',
          idProducto: 1,
          nombreProducto: 'Prod 1',
          cantidadPedida: 10,
          cantidadRecibida: 5,
          numeroLote: '',
          fechaVencimiento: '',
        },
      ];

      const res = validarFormularioRecepcion({
        filas,
        hayDiferencias: false,
        checkboxDiferenciaConfirmado: false,
      });

      expect(res.valido).toBe(false);
      expect(res.erroresPorFila['f1'].numeroLote).toBe('El número de lote es obligatorio.');
      expect(res.erroresPorFila['f1'].fechaVencimiento).toBe(
        'La fecha de vencimiento es obligatoria.'
      );
    });

    it('debe exigir el check explícito si hay diferencias con lo pedido', () => {
      const filas: FilaLoteRecepcion[] = [
        {
          idFila: 'f1',
          idProducto: 1,
          nombreProducto: 'Prod 1',
          cantidadPedida: 10,
          cantidadRecibida: 8,
          numeroLote: 'LOT-A',
          fechaVencimiento: '2027-12-31',
        },
      ];

      // Sin check
      const resSinCheck = validarFormularioRecepcion({
        filas,
        hayDiferencias: true,
        checkboxDiferenciaConfirmado: false,
      });
      expect(resSinCheck.valido).toBe(false);
      expect(resSinCheck.erroresGenerales[0]).toContain('La cantidad difiere de lo pedido');

      // Con check
      const resConCheck = validarFormularioRecepcion({
        filas,
        hayDiferencias: true,
        checkboxDiferenciaConfirmado: true,
      });
      expect(resConCheck.valido).toBe(true);
    });

    it('no debe exigir lote ni vencimiento en filas que tienen cantidad 0 o vacía', () => {
      const filas: FilaLoteRecepcion[] = [
        {
          idFila: 'f1',
          idProducto: 1,
          nombreProducto: 'Prod 1',
          cantidadPedida: 10,
          cantidadRecibida: 10,
          numeroLote: 'LOT-1',
          fechaVencimiento: '2028-05-20',
        },
        {
          idFila: 'f2',
          idProducto: 2,
          nombreProducto: 'Prod 2',
          cantidadPedida: 5,
          cantidadRecibida: 0,
          numeroLote: '',
          fechaVencimiento: '',
        },
      ];

      const res = validarFormularioRecepcion({
        filas,
        hayDiferencias: true,
        checkboxDiferenciaConfirmado: true,
      });

      expect(res.valido).toBe(true);
      expect(res.erroresPorFila['f2']).toBeUndefined();
    });
  });

  // ─── 4. Vencimiento Pasado ──────────────────────────────────────────────────
  describe('esVencimientoPasado', () => {
    const hoy = '2026-10-10';

    it('debe retornar true si la fecha de vencimiento es anterior a hoy', () => {
      expect(esVencimientoPasado('2026-10-09', hoy)).toBe(true);
    });

    it('debe retornar true si la fecha de vencimiento es hoy mismo', () => {
      expect(esVencimientoPasado('2026-10-10', hoy)).toBe(true);
    });

    it('debe retornar false si la fecha de vencimiento es futura', () => {
      expect(esVencimientoPasado('2026-10-11', hoy)).toBe(false);
      expect(esVencimientoPasado('2027-01-01', hoy)).toBe(false);
    });
  });

  // ─── 5. Traducción de Errores de API ─────────────────────────────────────────
  describe('traducirErrorRecepcion', () => {
    it('debe traducir CONVERSION_REQUIRED de forma clara sin tecnicismos', () => {
      const err = new ApiRequestError(400, 'CONVERSION_REQUIRED', 'Unit conversion missing');
      const traducido = traducirErrorRecepcion(err);
      expect(traducido.esErrorConversion).toBe(true);
      expect(traducido.descripcion).toContain(
        'Uno de los productos se compra en una unidad distinta de la base'
      );
    });

    it('debe traducir INVALID_ORDER_STATE', () => {
      const err = new ApiRequestError(400, 'INVALID_ORDER_STATE', 'Order is not confirmed');
      const traducido = traducirErrorRecepcion(err);
      expect(traducido.esErrorEstado).toBe(true);
      expect(traducido.descripcion).toContain('Solo se pueden recibir órdenes en estado confirmada');
    });

    it('debe mostrar detalle por campos en INVALID_INPUT', () => {
      const err = new ApiRequestError(400, 'INVALID_INPUT', 'Validation error', {
        'items.0.numeroLote': ['El lote es requerido'],
      });
      const traducido = traducirErrorRecepcion(err);
      expect(traducido.detallesCampos).toContain('items.0.numeroLote: El lote es requerido');
    });
  });
});
