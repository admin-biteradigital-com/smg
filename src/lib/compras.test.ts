import { describe, it, expect } from 'vitest';
import {
  sugerirFechaEntregaEstimada,
  calcularSaldoOrden,
  esPagoVencido,
  esEntregaDemorada,
  validarCondicionPago,
  formatFecha,
  formatFechaHora,
  formatSoloFecha,
  formatInstanteFecha,
  formatInstanteFechaHora,
  getHoyString,
  formatCLP,
  calcularCostoInicialCompra,
  formatearDetalleEquivalenciaLinea,
  resolverSeleccionProveedor,
  filtrarYOrdenarProductosSelector,
  obtenerEtiquetaCatalogo,
  validarCambioProveedor,
  verificarConsistenciaLineasProveedor,
  determinarTipoAvisoPago,
  construirTextoAvisoCredito,
} from './compras';
import type { ProductoAdminItem } from '@/types';

describe('ADR-020: Módulo Compras — Lógica Pura', () => {
  describe('sugerirFechaEntregaEstimada (días hábiles)', () => {
    it('debe sumar 4 días hábiles saltando fin de semana si empieza un lunes', () => {
      // 2026-10-05 es Lunes
      // +1 Mar 06, +2 Mie 07, +3 Jue 08, +4 Vie 09
      const resultado = sugerirFechaEntregaEstimada('2026-10-05', 4);
      expect(resultado).toBe('2026-10-09');
    });

    it('debe sumar 4 días hábiles saltando sábado y domingo si empieza un jueves', () => {
      // 2026-10-08 es Jueves
      // +1 Vie 09, (Salto Sab 10, Dom 11), +2 Lun 12, +3 Mar 13, +4 Mie 14
      const resultado = sugerirFechaEntregaEstimada('2026-10-08', 4);
      expect(resultado).toBe('2026-10-14');
    });

    it('debe sumar 4 días hábiles saltando fin de semana si empieza un viernes', () => {
      // 2026-10-09 es Viernes
      // (Salto Sab 10, Dom 11), +1 Lun 12, +2 Mar 13, +3 Mie 14, +4 Jue 15
      const resultado = sugerirFechaEntregaEstimada('2026-10-09', 4);
      expect(resultado).toBe('2026-10-15');
    });
  });

  describe('calcularSaldoOrden', () => {
    it('debe retornar el total completo si no hay pagos', () => {
      expect(calcularSaldoOrden(50000, [])).toBe(50000);
      expect(calcularSaldoOrden(50000, null)).toBe(50000);
    });

    it('debe restar correctamente pagos parciales', () => {
      const pagos = [{ monto: 20000 }, { monto: 15000 }];
      expect(calcularSaldoOrden(50000, pagos)).toBe(15000);
    });

    it('debe retornar 0 si los pagos igualan o superan el total', () => {
      expect(calcularSaldoOrden(50000, [{ monto: 50000 }])).toBe(0);
      expect(calcularSaldoOrden(50000, [{ monto: 60000 }])).toBe(0);
    });
  });

  describe('esPagoVencido', () => {
    const hoy = '2026-10-10';

    it('debe marcar vencido si es credito, vencimiento < hoy, no pagado y no cancelada', () => {
      const orden = {
        condicion_pago: 'credito',
        fecha_vencimiento_pago: '2026-10-05',
        estado_pago: 'pendiente',
        estado: 'confirmada',
      };
      expect(esPagoVencido(orden, hoy)).toBe(true);
    });

    it('debe marcar vencido con pago parcial si vencimiento < hoy', () => {
      const orden = {
        condicion_pago: 'credito',
        fecha_vencimiento_pago: '2026-10-09',
        estado_pago: 'pagado_parcial',
        estado: 'recibida',
      };
      expect(esPagoVencido(orden, hoy)).toBe(true);
    });

    it('no debe marcar vencido si el vencimiento es hoy o futuro', () => {
      const ordenHoy = {
        condicion_pago: 'credito',
        fecha_vencimiento_pago: '2026-10-10',
        estado_pago: 'pendiente',
        estado: 'confirmada',
      };
      expect(esPagoVencido(ordenHoy, hoy)).toBe(false);

      const ordenFutura = {
        condicion_pago: 'credito',
        fecha_vencimiento_pago: '2026-10-15',
        estado_pago: 'pendiente',
        estado: 'confirmada',
      };
      expect(esPagoVencido(ordenFutura, hoy)).toBe(false);
    });

    it('no debe marcar vencido si ya está totalmente pagado', () => {
      const orden = {
        condicion_pago: 'credito',
        fecha_vencimiento_pago: '2026-10-01',
        estado_pago: 'pagado',
        estado: 'confirmada',
      };
      expect(esPagoVencido(orden, hoy)).toBe(false);
    });

    it('no debe marcar vencido si la orden fue cancelada', () => {
      const orden = {
        condicion_pago: 'credito',
        fecha_vencimiento_pago: '2026-10-01',
        estado_pago: 'pendiente',
        estado: 'cancelada',
      };
      expect(esPagoVencido(orden, hoy)).toBe(false);
    });

    it('no debe marcar vencido si la condicion es contado', () => {
      const orden = {
        condicion_pago: 'contado',
        fecha_vencimiento_pago: '2026-10-01',
        estado_pago: 'pendiente',
        estado: 'confirmada',
      };
      expect(esPagoVencido(orden, hoy)).toBe(false);
    });

    it('tolera fecha_vencimiento_pago nula, undefined o vacía sin marcar vencido', () => {
      expect(
        esPagoVencido({
          condicion_pago: 'credito',
          fecha_vencimiento_pago: null,
          estado_pago: 'pendiente',
          estado: 'confirmada',
        }, hoy)
      ).toBe(false);

      expect(
        esPagoVencido({
          condicion_pago: 'credito',
          fecha_vencimiento_pago: undefined,
          estado_pago: 'pendiente',
          estado: 'confirmada',
        }, hoy)
      ).toBe(false);

      expect(
        esPagoVencido({
          condicion_pago: 'credito',
          fecha_vencimiento_pago: '',
          estado_pago: 'pendiente',
          estado: 'confirmada',
        }, hoy)
      ).toBe(false);
    });
  });

  describe('esEntregaDemorada', () => {
    const hoy = '2026-10-10';

    it('debe marcar demorada si estado es confirmada y fecha estimada < hoy', () => {
      const orden = {
        estado: 'confirmada',
        fecha_entrega_estimada: '2026-10-08',
      };
      expect(esEntregaDemorada(orden, hoy)).toBe(true);
    });

    it('no debe marcar demorada si fecha estimada es hoy o futura', () => {
      expect(
        esEntregaDemorada(
          { estado: 'confirmada', fecha_entrega_estimada: '2026-10-10' },
          hoy
        )
      ).toBe(false);

      expect(
        esEntregaDemorada(
          { estado: 'confirmada', fecha_entrega_estimada: '2026-10-15' },
          hoy
        )
      ).toBe(false);
    });

    it('no debe marcar demorada si el estado no es confirmada (borrador, recibida, cancelada)', () => {
      expect(
        esEntregaDemorada(
          { estado: 'borrador', fecha_entrega_estimada: '2026-10-01' },
          hoy
        )
      ).toBe(false);

      expect(
        esEntregaDemorada(
          { estado: 'recibida', fecha_entrega_estimada: '2026-10-01' },
          hoy
        )
      ).toBe(false);

      expect(
        esEntregaDemorada(
          { estado: 'cancelada', fecha_entrega_estimada: '2026-10-01' },
          hoy
        )
      ).toBe(false);
    });
  });

  describe('validarCondicionPago', () => {
    it('debe aceptar credito sin fecha de vencimiento (nula, vacía o undefined)', () => {
      expect(validarCondicionPago('credito', null).valido).toBe(true);
      expect(validarCondicionPago('credito', '').valido).toBe(true);
      expect(validarCondicionPago('credito', undefined).valido).toBe(true);
      expect(validarCondicionPago('credito', '   ').valido).toBe(true);
    });

    it('debe aceptar credito con fecha de vencimiento valida', () => {
      expect(validarCondicionPago('credito', '2026-10-25').valido).toBe(true);
    });

    it('debe aceptar contado sin fecha de vencimiento', () => {
      expect(validarCondicionPago('contado', null).valido).toBe(true);
      expect(validarCondicionPago('contado', '').valido).toBe(true);
      expect(validarCondicionPago('contado', undefined).valido).toBe(true);
    });

    it('debe rechazar contado con fecha de vencimiento asignada', () => {
      expect(validarCondicionPago('contado', '2026-10-25').valido).toBe(false);
    });
  });

  describe('calcularCostoInicialCompra', () => {
    it('retorna null si el producto no tiene costo (null, undefined, 0 o negativo)', () => {
      expect(calcularCostoInicialCompra(null, 24)).toBeNull();
      expect(calcularCostoInicialCompra(undefined, 24)).toBeNull();
      expect(calcularCostoInicialCompra(0, 24)).toBeNull();
      expect(calcularCostoInicialCompra(-100, 24)).toBeNull();
    });

    it('calcula precioCosto x factor cuando hay factor > 1', () => {
      // $100 costo unitario base x factor 24 = $2.400 por caja
      expect(calcularCostoInicialCompra(100, 24)).toBe(2400);
      expect(calcularCostoInicialCompra(50, 10)).toBe(500);
    });

    it('calcula precioCosto x 1 cuando no hay factor o factor es 1', () => {
      expect(calcularCostoInicialCompra(1500, 1)).toBe(1500);
      expect(calcularCostoInicialCompra(1500, null)).toBe(1500);
      expect(calcularCostoInicialCompra(1500, undefined)).toBe(1500);
    });
  });

  describe('formatearDetalleEquivalenciaLinea', () => {
    it('muestra costo derivado exacto con signo $', () => {
      // 5 cajas x 24 = 120 display; $2.400 / 24 = $100 exacto
      const res = formatearDetalleEquivalenciaLinea({
        cantidad: 5,
        costoPorUnidadCompra: 2400,
        factorConversion: 24,
        nombreUnidadBase: 'display',
        nombreUnidadCompra: 'caja',
      });
      expect(res).toBe('= 120 display (24 por caja) · $100 c/u');
    });

    it('muestra costo derivado no exacto con signo ≈ $ y redondeado', () => {
      // 5 cajas x 24 = 120 display; $2.500 / 24 = 104.1666... -> ≈ $104
      const res = formatearDetalleEquivalenciaLinea({
        cantidad: 5,
        costoPorUnidadCompra: 2500,
        factorConversion: 24,
        nombreUnidadBase: 'display',
        nombreUnidadCompra: 'caja',
      });
      expect(res).toBe('= 120 display (24 por caja) · ≈ $104 c/u');
    });

    it('retorna null cuando factorConversion <= 1 o cantidad <= 0', () => {
      expect(
        formatearDetalleEquivalenciaLinea({
          cantidad: 5,
          costoPorUnidadCompra: 1000,
          factorConversion: 1,
          nombreUnidadBase: 'unidad',
          nombreUnidadCompra: 'unidad',
        })
      ).toBeNull();

      expect(
        formatearDetalleEquivalenciaLinea({
          cantidad: 0,
          costoPorUnidadCompra: 2400,
          factorConversion: 24,
          nombreUnidadBase: 'display',
          nombreUnidadCompra: 'caja',
        })
      ).toBeNull();
    });
  });

  describe('resolverSeleccionProveedor', () => {
    it('0 proveedores: retorna acción sin_proveedores con aviso descriptivo', () => {
      const res = resolverSeleccionProveedor([]);
      expect(res.accion).toBe('sin_proveedores');
      if (res.accion === 'sin_proveedores') {
        expect(res.mensaje).toBe('Este producto no tiene proveedores asociados. Asocialo desde el producto.');
      }
    });

    it('1 proveedor: retorna acción un_proveedor con el proveedor asignado', () => {
      const prov = { id: 10, nombre: 'Distribuidora Central', rut: '776899356' };
      const res = resolverSeleccionProveedor([prov]);
      expect(res.accion).toBe('un_proveedor');
      if (res.accion === 'un_proveedor') {
        expect(res.proveedor).toEqual(prov);
      }
    });

    it('2 o más proveedores: retorna acción multiples_proveedores para mostrar modal', () => {
      const p1 = { id: 10, nombre: 'Distribuidora Central', rut: '776899356' };
      const p2 = { id: 20, nombre: 'Agrocomercial Sur', rut: '76507455K' };
      const res = resolverSeleccionProveedor([p1, p2]);
      expect(res.accion).toBe('multiples_proveedores');
      if (res.accion === 'multiples_proveedores') {
        expect(res.proveedores).toHaveLength(2);
      }
    });
  });

  describe('Formateo seguro de fechas e instantes UTC', () => {
    const tzMontevideo = 'America/Montevideo';

    it('instante ISO con Z en huso UTC-3 (Montevideo): 2026-10-18T00:30:00.000Z se muestra como 17/10/2026 21:30', () => {
      expect(formatInstanteFecha('2026-10-18T00:30:00.000Z', tzMontevideo)).toBe('17/10/2026');
      expect(formatInstanteFechaHora('2026-10-18T00:30:00.000Z', tzMontevideo)).toBe('17/10/2026 21:30');
      expect(formatFecha('2026-10-18T00:30:00.000Z', tzMontevideo)).toBe('17/10/2026');
    });

    it('instante SQLite datetime sin zona (en UTC): 2026-10-18 00:30:00 se interpreta en UTC y se muestra como 17/10/2026 21:30', () => {
      expect(formatInstanteFecha('2026-10-18 00:30:00', tzMontevideo)).toBe('17/10/2026');
      expect(formatInstanteFechaHora('2026-10-18 00:30:00', tzMontevideo)).toBe('17/10/2026 21:30');
      expect(formatFecha('2026-10-18 00:30:00', tzMontevideo)).toBe('17/10/2026');
    });

    it('solo fecha YYYY-MM-DD: 2026-12-15 se muestra como 15/12/2026 sin conversion de zona', () => {
      expect(formatSoloFecha('2026-12-15')).toBe('15/12/2026');
      expect(formatFecha('2026-12-15')).toBe('15/12/2026');
    });

    it('debe retornar guion ante fechas nulas o vacias', () => {
      expect(formatSoloFecha(null)).toBe('—');
      expect(formatSoloFecha('')).toBe('—');
      expect(formatInstanteFecha(null)).toBe('—');
      expect(formatInstanteFechaHora(undefined)).toBe('—');
      expect(formatFecha(null)).toBe('—');
      expect(formatFechaHora(undefined)).toBe('—');
    });

    it('esPagoVencido cerca de la medianoche con fecha calendario local', () => {
      const orden = {
        condicion_pago: 'credito',
        estado_pago: 'pendiente',
        fecha_vencimiento_pago: '2026-10-18',
        estado: 'recibida',
      };

      // 17/10 a las 23:59 local (un minuto antes de la medianoche previa al vencimiento)
      const antesDeMedianoche = new Date(2026, 9, 17, 23, 59, 0);
      expect(esPagoVencido(orden, getHoyString(antesDeMedianoche))).toBe(false);

      // 18/10 a las 00:01 local (justo iniciada la fecha de vencimiento: vence hoy, no vencido aún)
      const inicioDiaVencimiento = new Date(2026, 9, 18, 0, 1, 0);
      expect(esPagoVencido(orden, getHoyString(inicioDiaVencimiento))).toBe(false);

      // 18/10 a las 23:59 local (último minuto del día de vencimiento)
      const finDiaVencimiento = new Date(2026, 9, 18, 23, 59, 0);
      expect(esPagoVencido(orden, getHoyString(finDiaVencimiento))).toBe(false);

      // 19/10 a las 00:01 local (un minuto después de medianoche, vencido)
      const diaSiguiente = new Date(2026, 9, 19, 0, 1, 0);
      expect(esPagoVencido(orden, getHoyString(diaSiguiente))).toBe(true);
    });
  });

  describe('formatCLP', () => {
    it('debe formatear pesos chilenos correctamente', () => {
      expect(formatCLP(15000)).toBe('$15.000');
      expect(formatCLP(0)).toBe('$0');
      expect(formatCLP(null)).toBe('$0');
    });
  });

  describe('filtrarYOrdenarProductosSelector y obtenerEtiquetaCatalogo', () => {
    // Catálogo con 35 productos para verificar que supera el límite previo de 30
    const mockCatalogo: ProductoAdminItem[] = [
      { id: 1, nombre: 'Zumo Naranja 1L', codigoBarras: '7801001', precioCosto: 800, activo: 1, visiblePublico: 1, idUnidadBase: 1, nombreUnidadBase: 'unidad', stockSeguridadMinimo: null, precioUnitarioSugerido: null, precioPublico: null, descripcion: null },
      { id: 2, nombre: 'Aceite Maravilla 900ml', codigoBarras: '7801002', precioCosto: 1500, activo: 1, visiblePublico: 1, idUnidadBase: 1, nombreUnidadBase: 'unidad', stockSeguridadMinimo: null, precioUnitarioSugerido: null, precioPublico: null, descripcion: null },
      { id: 3, nombre: 'PRUEBA CAJA', codigoBarras: '7809901', precioCosto: 12000, activo: 1, visiblePublico: 1, idUnidadBase: 1, nombreUnidadBase: 'unidad', idUnidadCompra: 2, nombreUnidadCompra: 'caja', factorConversionCompra: 24, stockSeguridadMinimo: null, precioUnitarioSugerido: null, precioPublico: null, descripcion: null },
      { id: 4, nombre: 'PRUEBA SIN PROV', codigoBarras: null, precioCosto: null, activo: 1, visiblePublico: 1, idUnidadBase: 1, nombreUnidadBase: 'unidad', stockSeguridadMinimo: null, precioUnitarioSugerido: null, precioPublico: null, descripcion: null },
      { id: 5, nombre: 'Freegells Menta', codigoBarras: '7801005', precioCosto: 250, activo: 1, visiblePublico: 1, idUnidadBase: 1, nombreUnidadBase: 'unidad', stockSeguridadMinimo: null, precioUnitarioSugerido: null, precioPublico: null, descripcion: null },
      ...Array.from({ length: 30 }, (_, i) => ({
        id: 10 + i,
        nombre: `Galletas Variedad ${String(i + 1).padStart(2, '0')}`,
        codigoBarras: `78020${String(i + 1).padStart(2, '0')}`,
        precioCosto: 500 + i * 10,
        activo: 1,
        visiblePublico: 1,
        idUnidadBase: 1,
        nombreUnidadBase: 'unidad',
        stockSeguridadMinimo: null,
        precioUnitarioSugerido: null,
        precioPublico: null,
        descripcion: null,
      })),
    ];

    it('sin texto devuelve todos los productos (más de 30) sin recortar', () => {
      expect(mockCatalogo.length).toBe(35);
      const resultado = filtrarYOrdenarProductosSelector(mockCatalogo, '');
      expect(resultado).toHaveLength(35);
      expect(resultado.length).toBeGreaterThan(30);
    });

    it('sin texto ordena alfabéticamente por nombre', () => {
      const resultado = filtrarYOrdenarProductosSelector(mockCatalogo, '');
      expect(resultado[0].nombre).toBe('Aceite Maravilla 900ml');
      expect(resultado[resultado.length - 1].nombre).toBe('Zumo Naranja 1L');
    });

    it('con texto filtra sobre todos los productos, sin recortar a un subconjunto previo', () => {
      const resultado = filtrarYOrdenarProductosSelector(mockCatalogo, 'PRU');
      expect(resultado).toHaveLength(2);
      expect(resultado.map((p) => p.nombre)).toEqual(['PRUEBA CAJA', 'PRUEBA SIN PROV']);
    });

    it('filtra por código de barras sobre todos los productos', () => {
      const resultado = filtrarYOrdenarProductosSelector(mockCatalogo, '7809901');
      expect(resultado).toHaveLength(1);
      expect(resultado[0].nombre).toBe('PRUEBA CAJA');
    });

    it('incluye productos sin costo y productos sin proveedor', () => {
      const resultado = filtrarYOrdenarProductosSelector(mockCatalogo, 'SIN PROV');
      expect(resultado).toHaveLength(1);
      expect(resultado[0].nombre).toBe('PRUEBA SIN PROV');
      expect(resultado[0].precioCosto).toBeNull();
    });

    it('obtenerEtiquetaCatalogo muestra "Todos los productos (N)" cuando no hay proveedor', () => {
      expect(obtenerEtiquetaCatalogo(undefined, 35)).toBe('Todos los productos (35)');
      expect(obtenerEtiquetaCatalogo(null, 0)).toBe('Todos los productos (0)');
      expect(obtenerEtiquetaCatalogo('', 12)).toBe('Todos los productos (12)');
    });

    it('obtenerEtiquetaCatalogo muestra "Productos de [proveedor] (N)" cuando hay proveedor seleccionado', () => {
      expect(obtenerEtiquetaCatalogo('Distribuidora Los Lagos', 18)).toBe(
        'Productos de Distribuidora Los Lagos (18)'
      );
      expect(obtenerEtiquetaCatalogo('Arcor Chile', 0)).toBe('Productos de Arcor Chile (0)');
    });

    it('maneja catálogos vacíos o inválidos sin fallar', () => {
      expect(filtrarYOrdenarProductosSelector([])).toEqual([]);
      expect(filtrarYOrdenarProductosSelector(null as unknown as ProductoAdminItem[])).toEqual([]);
      expect(obtenerEtiquetaCatalogo(undefined, -5)).toBe('Todos los productos (0)');
    });
  });

  describe('validarCambioProveedor', () => {
    it('sin líneas cargadas: permite cambiar a cualquier proveedor sin confirmación', () => {
      expect(validarCambioProveedor('', 1, 0)).toEqual({
        permitido: true,
        requiereConfirmacion: false,
      });
      expect(validarCambioProveedor(1, 2, 0)).toEqual({
        permitido: true,
        requiereConfirmacion: false,
      });
    });

    it('sin líneas cargadas: permite vaciar el proveedor sin confirmación', () => {
      expect(validarCambioProveedor(1, '', 0)).toEqual({
        permitido: true,
        requiereConfirmacion: false,
      });
    });

    it('mismo proveedor: no requiere confirmación ni cambio', () => {
      expect(validarCambioProveedor(1, 1, 3)).toEqual({
        permitido: true,
        requiereConfirmacion: false,
        motivo: 'sin_cambio',
      });
      expect(validarCambioProveedor('', '', 0)).toEqual({
        permitido: true,
        requiereConfirmacion: false,
        motivo: 'sin_cambio',
      });
    });

    it('con líneas cargadas: NO permite elegir la opción vacía (el proveedor no puede quedar vacío)', () => {
      const res = validarCambioProveedor(1, '', 2);
      expect(res.permitido).toBe(false);
      expect(res.requiereConfirmacion).toBe(false);
      expect(res.motivo).toBe('no_permitido_con_lineas');
      expect(res.mensaje).toBe('No puedes dejar la orden sin proveedor si ya tiene líneas cargadas.');
    });

    it('con líneas cargadas: cambiar a otro proveedor válido requiere confirmación', () => {
      const res = validarCambioProveedor(1, 2, 1);
      expect(res.permitido).toBe(true);
      expect(res.requiereConfirmacion).toBe(true);
    });
  });

  describe('verificarConsistenciaLineasProveedor', () => {
    it('todas las líneas pertenecen al proveedor: consistente es true', () => {
      const lineas = [
        { id_producto: 101, nombre: 'Producto A' },
        { id_producto: 102, nombre: 'Producto B' },
      ];
      const validos = new Set([101, 102, 103]);
      const res = verificarConsistenciaLineasProveedor(lineas, validos);
      expect(res.consistente).toBe(true);
      expect(res.lineasInconsistentes).toEqual([]);
    });

    it('detecta productos que no pertenecen al proveedor y los lista', () => {
      const lineas = [
        { id_producto: 101, nombre: 'Producto A' },
        { id_producto: 999, nombre: 'Producto Infiltrado' },
      ];
      const validos = [101, 102];
      const res = verificarConsistenciaLineasProveedor(lineas, validos);
      expect(res.consistente).toBe(false);
      expect(res.lineasInconsistentes).toHaveLength(1);
      expect(res.lineasInconsistentes[0].id_producto).toBe(999);
      expect(res.lineasInconsistentes[0].nombre).toBe('Producto Infiltrado');
    });

    it('sin líneas: siempre es consistente', () => {
      const res = verificarConsistenciaLineasProveedor([], new Set([1, 2]));
      expect(res.consistente).toBe(true);
      expect(res.lineasInconsistentes).toEqual([]);
    });
  });

  describe('ADR-020: Avisos de pago pendiente en órdenes recibidas (contado y crédito)', () => {
    const hoy = '2026-10-18';

    it('contado: orden recibida con pago pendiente retorna contado', () => {
      const orden = {
        estado: 'recibida',
        condicion_pago: 'contado',
        estado_pago: 'pendiente',
      };
      expect(determinarTipoAvisoPago(orden, hoy)).toBe('contado');
    });

    it('contado: orden recibida con pago parcial retorna contado', () => {
      const orden = {
        estado: 'recibida',
        condicion_pago: 'contado',
        estado_pago: 'parcial',
      };
      expect(determinarTipoAvisoPago(orden, hoy)).toBe('contado');
    });

    it('crédito sin vencimiento: orden recibida a crédito sin fecha de vencimiento', () => {
      const orden1 = {
        estado: 'recibida',
        condicion_pago: 'credito',
        estado_pago: 'pendiente',
        fecha_vencimiento_pago: null,
      };
      expect(determinarTipoAvisoPago(orden1, hoy)).toBe('credito_sin_vencimiento');

      const orden2 = {
        estado: 'recibida',
        condicion_pago: 'credito',
        estado_pago: 'pendiente',
        fecha_vencimiento_pago: '',
      };
      expect(determinarTipoAvisoPago(orden2, hoy)).toBe('credito_sin_vencimiento');
    });

    it('futuro: vencimiento posterior a hoy retorna futuro', () => {
      const orden = {
        estado: 'recibida',
        condicion_pago: 'credito',
        estado_pago: 'pendiente',
        fecha_vencimiento_pago: '2026-10-25',
      };
      expect(determinarTipoAvisoPago(orden, hoy)).toBe('futuro');
    });

    it('hoy: vencimiento igual a hoy retorna hoy', () => {
      const orden = {
        estado: 'recibida',
        condicion_pago: 'credito',
        estado_pago: 'pendiente',
        fecha_vencimiento_pago: '2026-10-18',
      };
      expect(determinarTipoAvisoPago(orden, hoy)).toBe('hoy');
    });

    it('pasado: vencimiento anterior a hoy retorna pasado (vencido)', () => {
      const orden = {
        estado: 'recibida',
        condicion_pago: 'credito',
        estado_pago: 'pendiente',
        fecha_vencimiento_pago: '2026-10-10',
      };
      expect(determinarTipoAvisoPago(orden, hoy)).toBe('pasado');
    });

    it('pagado (sin aviso): si estado_pago es pagado no muestra aviso', () => {
      expect(determinarTipoAvisoPago({
        estado: 'recibida',
        condicion_pago: 'contado',
        estado_pago: 'pagado',
      }, hoy)).toBeNull();

      expect(determinarTipoAvisoPago({
        estado: 'recibida',
        condicion_pago: 'credito',
        estado_pago: 'pagado',
        fecha_vencimiento_pago: '2026-10-10',
      }, hoy)).toBeNull();
    });

    it('no recibida (sin aviso): órdenes en borrador, confirmada o cancelada no muestran aviso', () => {
      expect(determinarTipoAvisoPago({
        estado: 'borrador',
        condicion_pago: 'contado',
        estado_pago: 'pendiente',
      }, hoy)).toBeNull();

      expect(determinarTipoAvisoPago({
        estado: 'confirmada',
        condicion_pago: 'credito',
        estado_pago: 'pendiente',
        fecha_vencimiento_pago: '2026-10-10',
      }, hoy)).toBeNull();

      expect(determinarTipoAvisoPago({
        estado: 'cancelada',
        condicion_pago: 'credito',
        estado_pago: 'pendiente',
      }, hoy)).toBeNull();
    });

    it('construirTextoAvisoCredito genera textos exactos según especificación', () => {
      expect(construirTextoAvisoCredito('credito_sin_vencimiento')).toBe(
        'Orden recibida a crédito con pago pendiente. Todavía no cargaste el vencimiento: cargalo cuando llegue la factura del proveedor.'
      );

      expect(construirTextoAvisoCredito('futuro', '2026-10-25', '$45.000')).toBe(
        'Orden recibida a crédito con pago pendiente. Vence el 25/10/2026 (saldo $45.000).'
      );

      expect(construirTextoAvisoCredito('hoy', '2026-10-18', '$12.000')).toBe(
        'Orden recibida a crédito con pago pendiente. Vence el 18/10/2026 (saldo $12.000).'
      );

      expect(construirTextoAvisoCredito('pasado', '2026-10-10', '$30.000')).toBe(
        'Pago a crédito vencido el 10/10/2026 (saldo $30.000).'
      );
    });
  });
});
