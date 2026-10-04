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
} from './compras';

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
    it('debe rechazar credito sin fecha de vencimiento', () => {
      expect(validarCondicionPago('credito', null).valido).toBe(false);
      expect(validarCondicionPago('credito', '').valido).toBe(false);
      expect(validarCondicionPago('credito', '   ').valido).toBe(false);
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
});
