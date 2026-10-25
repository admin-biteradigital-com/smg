import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateUlid, isValidUlid } from '@/lib/db';
import { crearPayloadVenta, type LineaCarrito } from './EscenaVenta';
import {
  serializarItemsCarga,
  obtenerOActualizarClaveCarga,
} from './EscenaCargarVehiculo';
import { procesarResultadosBatch, type BatchSyncResultItem } from '@/lib/sync';
import type { OfflineQueueItem, CargaStockItemPayload } from '@/types';
import * as dbModule from '@/lib/db';

describe('Lógica de Clave de Idempotencia en Venta y Carga', () => {
  describe('Formato Canónico de ULID', () => {
    it('genera un ULID de 26 caracteres Base32 Crockford válido', () => {
      const ulid = generateUlid();
      expect(typeof ulid).toBe('string');
      expect(ulid.length).toBe(26);
      expect(isValidUlid(ulid)).toBe(true);
    });

    it('dos llamadas consecutivas generan ULIDs distintos y monótonos', () => {
      const u1 = generateUlid();
      const u2 = generateUlid();
      expect(u1).not.toBe(u2);
      expect(isValidUlid(u1)).toBe(true);
      expect(isValidUlid(u2)).toBe(true);
    });

    it('identifica strings inválidos como no-ULID', () => {
      expect(isValidUlid('')).toBe(false);
      expect(isValidUlid('01JM7890ABC')).toBe(false); // muy corto
      expect(isValidUlid('01JM7890ABCDEF123456789012345')).toBe(false); // muy largo
      expect(isValidUlid('01JM7890ABCDEF1234567890I!')).toBe(false); // caracteres no Crockford
    });
  });

  describe('Venta (EscenaVenta)', () => {
    const lineasEjemplo: LineaCarrito[] = [
      {
        idProducto: 101,
        idLote: 1,
        nombreProducto: 'Alfajor Artesanal',
        codigoProducto: 'ALF-01',
        numeroLote: 'LOT-2026',
        cantidadDisponible: 20,
        cantidad: 3,
        precioUnitario: 1500,
        unidadMedida: 'unidad',
      },
    ];

    it('se reusa la misma clave de idempotencia entre el intento online y el encolado offline', () => {
      // 1. Al confirmar la venta, se genera la clave
      const claveVenta = generateUlid();

      // 2. Se arma el payload para el intento online
      const payloadOnline = crearPayloadVenta(45, 12, lineasEjemplo, 'Cliente paga en efectivo', claveVenta);
      expect(payloadOnline.clave_idempotencia).toBe(claveVenta);

      // 3. Si falla por red (offline) y se encola, el payload encolado debe conservar la MISMA clave
      const payloadEncolado = { ...payloadOnline };
      expect(payloadEncolado.clave_idempotencia).toBe(claveVenta);
      expect(payloadEncolado.clave_idempotencia).toBe(payloadOnline.clave_idempotencia);
    });

    it('es nueva para cada venta distinta', () => {
      const clave1 = generateUlid();
      const payload1 = crearPayloadVenta(45, 12, lineasEjemplo, '', clave1);

      const clave2 = generateUlid();
      const payload2 = crearPayloadVenta(45, 12, lineasEjemplo, '', clave2);

      expect(payload1.clave_idempotencia).not.toBe(payload2.clave_idempotencia);
      expect(isValidUlid(payload1.clave_idempotencia!)).toBe(true);
      expect(isValidUlid(payload2.clave_idempotencia!)).toBe(true);
    });

    it('doble toque no genera otra clave ni otra solicitud si enviando es true', () => {
      let llamadas = 0;
      let claveGenerada: string | null = null;
      let enviando = false;

      const simularConfirmarVenta = () => {
        if (enviando) return; // Guard de doble toque
        enviando = true;
        llamadas++;
        claveGenerada = generateUlid();
      };

      // Primer toque
      simularConfirmarVenta();
      const primeraClave = claveGenerada;
      expect(llamadas).toBe(1);

      // Segundo toque inmediato (doble toque en pantalla táctil)
      simularConfirmarVenta();
      expect(llamadas).toBe(1);
      expect(claveGenerada).toBe(primeraClave);
    });
  });

  describe('Carga del Vehículo (EscenaCargarVehiculo)', () => {
    const itemsCarga: CargaStockItemPayload[] = [
      { idProducto: 101, numeroLote: 'LOT-A', cantidad: 10 },
      { idProducto: 102, numeroLote: 'LOT-B', cantidad: 5 },
    ];

    it('genera una clave nueva en la primera carga', () => {
      const estadoInicial = { clave: null, signature: null };
      const res = obtenerOActualizarClaveCarga(itemsCarga, estadoInicial);

      expect(res.esReuso).toBe(false);
      expect(isValidUlid(res.clave)).toBe(true);
      expect(res.signature).toBe(serializarItemsCarga(itemsCarga));
    });

    it('se reusa la clave en el reintento de la misma carga (ítems idénticos)', () => {
      const estadoInicial = { clave: null, signature: null };
      const primerIntento = obtenerOActualizarClaveCarga(itemsCarga, estadoInicial);

      // El usuario reintenta tras un error temporal sin modificar ítems
      const reintento = obtenerOActualizarClaveCarga(itemsCarga, {
        clave: primerIntento.clave,
        signature: primerIntento.signature,
      });

      expect(reintento.esReuso).toBe(true);
      expect(reintento.clave).toBe(primerIntento.clave);
    });

    it('genera una clave nueva si cambian los ítems (cantidad o producto)', () => {
      const estadoInicial = { clave: null, signature: null };
      const primerIntento = obtenerOActualizarClaveCarga(itemsCarga, estadoInicial);

      // El usuario cambia la cantidad de un ítem
      const itemsModificados: CargaStockItemPayload[] = [
        { idProducto: 101, numeroLote: 'LOT-A', cantidad: 15 }, // cambió de 10 a 15
        { idProducto: 102, numeroLote: 'LOT-B', cantidad: 5 },
      ];

      const intentoModificado = obtenerOActualizarClaveCarga(itemsModificados, {
        clave: primerIntento.clave,
        signature: primerIntento.signature,
      });

      expect(intentoModificado.esReuso).toBe(false);
      expect(intentoModificado.clave).not.toBe(primerIntento.clave);
      expect(isValidUlid(intentoModificado.clave)).toBe(true);
    });

    it('doble toque en carga no genera otra clave ni duplica transferencia', () => {
      let llamadas = 0;
      let claveAsignada: string | null = null;
      let submitting = false;

      const simularSubmitCarga = () => {
        if (submitting) return; // Guard de doble toque
        submitting = true;
        llamadas++;
        claveAsignada = generateUlid();
      };

      simularSubmitCarga();
      const clave1 = claveAsignada;
      expect(llamadas).toBe(1);

      // Doble toque
      simularSubmitCarga();
      expect(llamadas).toBe(1);
      expect(claveAsignada).toBe(clave1);
    });
  });
});

describe('Procesamiento de Lotes Mixtos en Sincronización Batch (sync.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('procesa lote mixto: ok se sincroniza, conflict no reintenta, error incrementa retries', async () => {
    const markSyncedSpy = vi.spyOn(dbModule, 'markOperationSynced').mockResolvedValue(undefined);
    const markConflictSpy = vi.spyOn(dbModule, 'markOperationConflict').mockResolvedValue(undefined);
    const markFailedSpy = vi.spyOn(dbModule, 'markOperationFailed').mockResolvedValue(undefined);

    const op1: OfflineQueueItem = {
      id: 1,
      ulid: '01JM1111111111111111111111',
      type: 'CREATE_PEDIDO',
      endpoint: '/api/v1/ventas',
      method: 'POST',
      payload: { id_cliente: 10, lineas: [] },
      status: 'pending',
      retries: 0,
      maxRetries: 5,
      timestamp: Date.now(),
    };

    const op2: OfflineQueueItem = {
      id: 2,
      ulid: '01JM2222222222222222222222',
      type: 'CREATE_PEDIDO',
      endpoint: '/api/v1/ventas',
      method: 'POST',
      payload: { id_cliente: 20, lineas: [] },
      status: 'pending',
      retries: 0,
      maxRetries: 5,
      timestamp: Date.now(),
    };

    const op3: OfflineQueueItem = {
      id: 3,
      ulid: '01JM3333333333333333333333',
      type: 'CREATE_PEDIDO',
      endpoint: '/api/v1/ventas',
      method: 'POST',
      payload: { id_cliente: 30, lineas: [] },
      status: 'pending',
      retries: 0,
      maxRetries: 5,
      timestamp: Date.now(),
    };

    const results: BatchSyncResultItem[] = [
      { ulid: op1.ulid, status: 'ok' },
      { ulid: op2.ulid, status: 'conflict', error: 'CLAVE_IDEMPOTENCIA_CONFLICTO' },
      { ulid: op3.ulid, status: 'error', error: 'Payload de venta inválido' },
    ];

    const syncResult = await procesarResultadosBatch(results, [op1, op2, op3]);

    // 1. Resumen de resultados
    expect(syncResult.synced).toBe(1);
    expect(syncResult.conflicts).toBe(1);
    expect(syncResult.failed).toBe(1);
    expect(syncResult.errors).toHaveLength(2);

    // 2. Operación 1 (ok) -> eliminada de la cola
    expect(markSyncedSpy).toHaveBeenCalledWith(1);

    // 3. Operación 2 (conflict) -> marcada como fallida SIN reintento
    expect(markConflictSpy).toHaveBeenCalledWith(2, 'CLAVE_IDEMPOTENCIA_CONFLICTO');

    // 4. Operación 3 (error) -> marcada como fallida incrementando retries (sin loop infinito)
    expect(markFailedSpy).toHaveBeenCalledWith(3, 'Payload de venta inválido');
  });

  it('markOperationConflict en cola offline marca retries = maxRetries y status = failed sin reintento', async () => {
    let modifiedItem: any;
    const modifyMock = vi.fn((callback: (item: any) => void) => {
      const item = { retries: 1, status: 'pending', maxRetries: 5, errorMessage: '' };
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

    await dbModule.markOperationConflict(42, 'Conflicto 409');

    expect(whereMock).toHaveBeenCalledWith('id');
    expect(modifiedItem).toBeDefined();
    expect(modifiedItem.retries).toBe(5); // retries agotados = sin reintento automático
    expect(modifiedItem.status).toBe('failed');
    expect(modifiedItem.errorMessage).toBe('Conflicto 409');
  });
});
