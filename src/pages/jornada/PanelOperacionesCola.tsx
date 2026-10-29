import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Trash2,
  RotateCcw,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Loader2,
  Clock,
} from 'lucide-react';
import { db, retryOperation, discardOperation } from '@/lib/db';
import { runSync, onSyncStatusChange } from '@/lib/sync';
import { extraerLineasDePayload } from '@/lib/stock-disponible';
import type { OfflineQueueItem, Cliente } from '@/types';

export interface OperacionDetallada {
  item: OfflineQueueItem;
  clienteNombre: string;
  totalMonto: number;
  totalUnidades: number;
}

export interface PanelOperacionesColaProps {
  onOperacionModificada?: () => void;
}

export default function PanelOperacionesCola({
  onOperacionModificada,
}: PanelOperacionesColaProps) {
  const [operaciones, setOperaciones] = useState<OperacionDetallada[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [confirmandoDescarteId, setConfirmandoDescarteId] = useState<number | null>(null);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  const cargarOperaciones = useCallback(async () => {
    try {
      const items = await db.offline_queue.toArray();
      // Filtrar a operaciones en cola activas (pending, syncing, failed, conflict)
      const operacionesCola = items.filter(
        (it) =>
          it.status === 'pending' ||
          it.status === 'syncing' ||
          it.status === 'failed' ||
          it.status === 'conflict'
      );

      if (operacionesCola.length === 0) {
        setOperaciones([]);
        setLoading(false);
        return;
      }

      // Cargar clientes para mostrar razones sociales
      const clientes = await db.clientes.toArray();
      const clientesMap = new Map<string, Cliente>();
      for (const c of clientes) {
        clientesMap.set(String(c.id), c);
      }

      const detalladas: OperacionDetallada[] = operacionesCola.map((item) => {
        const payload = item.payload as Record<string, unknown> | null;
        const clienteId = payload?.id_cliente ?? payload?.idCliente;
        const clienteObj = clienteId ? clientesMap.get(String(clienteId)) : undefined;
        const clienteNombre =
          clienteObj?.razonSocial || (clienteId ? `Cliente #${clienteId}` : 'Cliente no especificado');

        const lineas = extraerLineasDePayload(item.payload);
        const totalMonto = lineas.reduce(
          (acc, l) => acc + l.cantidad * (l.precio_unitario || 0),
          0
        );
        const totalUnidades = lineas.reduce((acc, l) => acc + l.cantidad, 0);

        return {
          item,
          clienteNombre,
          totalMonto,
          totalUnidades,
        };
      });

      // Ordenar: fallidas primero, luego conflictos, luego pendientes
      detalladas.sort((a, b) => {
        const priority = (s: string) => (s === 'failed' ? 1 : s === 'conflict' ? 2 : 3);
        return priority(a.item.status) - priority(b.item.status);
      });

      setOperaciones(detalladas);

      // Si hay fallidas o conflictos, expandir automáticamente el panel
      const tieneProblemas = detalladas.some(
        (o) => o.item.status === 'failed' || o.item.status === 'conflict'
      );
      if (tieneProblemas) {
        setExpanded(true);
      }
    } catch (err) {
      console.error('[PanelOperacionesCola] Error al cargar operaciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarOperaciones();

    // Recargar ante cambios en la sincronización
    const unsubscribe = onSyncStatusChange(() => {
      cargarOperaciones();
    });

    return () => {
      unsubscribe();
    };
  }, [cargarOperaciones]);

  const handleReintentar = async (id: number) => {
    setProcesandoId(id);
    try {
      await retryOperation(id);
      await cargarOperaciones();
      onOperacionModificada?.();
      // Disparar sincronización
      runSync().catch(console.error);
    } catch (err) {
      console.error('[PanelOperacionesCola] Error al reintentar operación:', err);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleDescartar = async (id: number) => {
    setProcesandoId(id);
    try {
      await discardOperation(id);
      setConfirmandoDescarteId(null);
      await cargarOperaciones();
      onOperacionModificada?.();
    } catch (err) {
      console.error('[PanelOperacionesCola] Error al descartar operación:', err);
    } finally {
      setProcesandoId(null);
    }
  };

  if (loading || operaciones.length === 0) {
    return null;
  }

  const fallidasCount = operaciones.filter((o) => o.item.status === 'failed').length;
  const conflictosCount = operaciones.filter((o) => o.item.status === 'conflict').length;
  const pendientesCount = operaciones.filter(
    (o) => o.item.status === 'pending' || o.item.status === 'syncing'
  ).length;

  const tieneCriticos = fallidasCount > 0 || conflictosCount > 0;

  return (
    <div
      className={`mx-4 mt-3 rounded-2xl border transition-all overflow-hidden ${
        tieneCriticos
          ? 'bg-rose-950/20 border-rose-500/40 ring-1 ring-rose-500/20'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      {/* Cabecera del Panel (Toggle) */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {tieneCriticos ? (
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          )}

          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-100 flex items-center gap-2">
              <span>Operaciones de la jornada</span>
              {fallidasCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-semibold">
                  {fallidasCount} {fallidasCount === 1 ? 'fallida' : 'fallidas'}
                </span>
              )}
              {conflictosCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-semibold">
                  {conflictosCount} conflicto
                </span>
              )}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {pendientesCount > 0 && `${pendientesCount} pendiente${pendientesCount === 1 ? '' : 's'}`}
              {pendientesCount > 0 && (fallidasCount > 0 || conflictosCount > 0) && ' · '}
              {tieneCriticos && 'Requieren atención antes del cierre'}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-zinc-400 p-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Lista Desplegable de Operaciones */}
      {expanded && (
        <div className="border-t border-zinc-800/80 p-3 space-y-2.5 bg-zinc-950/40">
          {operaciones.map(({ item, clienteNombre, totalMonto, totalUnidades }) => {
            const esFallida = item.status === 'failed';
            const esConflicto =
              item.status === 'conflict' ||
              Boolean(item.errorMessage?.toLowerCase().includes('conflicto'));
            const esSyncing = item.status === 'syncing';
            const itemId = item.id;
            const confirmandoEste = itemId !== undefined && confirmandoDescarteId === itemId;
            const procesandoEste = itemId !== undefined && procesandoId === itemId;

            return (
              <div
                key={item.ulid || item.id}
                className={`p-3 rounded-xl border text-xs space-y-2.5 transition-all ${
                  esFallida
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : esConflicto
                    ? 'bg-purple-950/20 border-purple-500/30'
                    : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                {/* Fila 1: Cliente, Monto y Badge de Estado */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                      <ShoppingBag className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                      <span className="truncate">{clienteNombre}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {totalMonto > 0 && (
                        <span className="font-semibold text-zinc-300">
                          ${totalMonto.toLocaleString('es-CL')}
                        </span>
                      )}
                      {totalUnidades > 0 && ` (${totalUnidades} uds)`}
                      <span className="text-zinc-600 font-mono ml-1">· {item.ulid.slice(-6)}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {esFallida ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-[10px]">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Fallida
                      </span>
                    ) : esConflicto ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold text-[10px]">
                        Conflicto
                      </span>
                    ) : esSyncing ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold text-[10px]">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Sincronizando
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-[10px]">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>

                {/* Fila 2: Motivo exacto devuelto por SIGLO en fallidas o conflictos */}
                {(esFallida || esConflicto) && item.errorMessage && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] leading-relaxed">
                    <p className="font-semibold text-rose-200 mb-0.5">Motivo del rechazo:</p>
                    <p className="font-mono text-[10.5px] break-words">{item.errorMessage}</p>
                  </div>
                )}

                {/* Fila 3: Acciones (Reintentar y Descartar) */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800/60">
                  {confirmandoEste ? (
                    <div className="flex items-center gap-2 w-full justify-between animate-fade-in">
                      <span className="text-[11px] text-zinc-400">¿Descartar esta venta?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmandoDescarteId(null)}
                          className="px-2.5 py-1 text-[11px] rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => itemId !== undefined && handleDescartar(itemId)}
                          disabled={procesandoEste}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1"
                        >
                          {procesandoEste ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Confirmar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Descartar con confirmación */}
                      <button
                        type="button"
                        onClick={() => itemId !== undefined && setConfirmandoDescarteId(itemId)}
                        disabled={procesandoEste}
                        className="px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Descartar
                      </button>

                      {/* Reintentar: solo en operaciones fallidas por error, NO en conflicto */}
                      {esFallida && !esConflicto && (
                        <button
                          type="button"
                          onClick={() => itemId !== undefined && handleReintentar(itemId)}
                          disabled={procesandoEste}
                          className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-brand-500/20"
                        >
                          {procesandoEste ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Reintentar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
