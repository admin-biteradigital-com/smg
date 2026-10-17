import { describe, it, expect } from 'vitest';
import {
  sugerirFechaEntregaEstimada,
  calcularSaldoOrden,
  esPagoVencido,
  esEntregaDemorada,
  validarCondicionPago,
  formatFecha,
  formatFechaHora,
  formatCLP,
  calcularCostoInicialCompra,
  formatearDetalleEquivalenciaLinea,
  resolverSeleccionProveedor,
  filtrarYOrdenarProductosSelector,
  obtenerEtiquetaCatalogo,
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

  describe('Formateo seguro de fechas (SQLite e ISO)', () => {
    it('debe formatear correctamente fecha ISO', () => {
      expect(formatFecha('2026-10-04T12:00:00Z')).toBe('04/10/2026');
    });

    it('debe formatear correctamente fecha SQLite YYYY-MM-DD HH:MM:SS', () => {
      expect(formatFecha('2026-10-04 15:30:00')).toBe('04/10/2026');
      expect(formatFechaHora('2026-10-04 15:30:00')).toBe('04/10/2026 15:30');
    });

    it('debe manejar fecha solo YYYY-MM-DD', () => {
      expect(formatFecha('2026-10-04')).toBe('04/10/2026');
    });

    it('debe retornar guion ante fechas nulas o vacias', () => {
      expect(formatFecha(null)).toBe('—');
      expect(formatFecha('')).toBe('—');
      expect(formatFechaHora(undefined)).toBe('—');
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
});
