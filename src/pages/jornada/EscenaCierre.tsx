import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Truck,
  MapPin,
  FileText,
  Boxes,
  Home,
  LogOut,
  ShoppingBag,
  DollarSign,
  ArrowDownLeft,
  PackageCheck,
} from 'lucide-react';
import { useJornada } from '@/contexts/JornadaContext';
import JornadaLayout from '@/components/layout/JornadaLayout';
import { cerrarJornada, ApiRequestError } from '@/lib/api';
import { db, getPendingCount } from '@/lib/db';
import type { ResumenCierre } from '@/types';

// ─── EscenaCierrePage ─────────────────────────────────────────────────────────
// Escena 6 del Modo Jornada: /jornada/cierre
// Permite cerrar la jornada activa, conciliar stock remanente y visualizar
// el resumen final de ventas, cobros y lotes retornados al depósito.

export default function EscenaCierrePage() {
  const navigate = useNavigate();
  const { jornada, loading: jornadaLoading, refreshJornada } = useJornada();

  const [notasCierre, setNotasCierre] = useState('');
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);
  const [cerrando, setCerrando] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenCierre | null>(null);

  // 1. Consultar operaciones pendientes en la cola offline al montar
  useEffect(() => {
    async function checkPendingQueue() {
      try {
        const count = await getPendingCount();
        setPendingQueueCount(count);
      } catch (err) {
        console.error('[EscenaCierre] Error al consultar cola offline:', err);
        // Fallback a conteo directo de Dexie si getPendingCount falla
        try {
          const directCount = await db.offline_queue.count();
          setPendingQueueCount(directCount);
        } catch {
          setPendingQueueCount(0);
        }
      }
    }
    checkPendingQueue();
  }, []);

  // 2. Filtrar items de stock del vehículo con cantidadDisponible > 0 (remanentes)
  const itemsRemanentes = useMemo(() => {
    if (!jornada?.stockVehiculo) return [];
    return jornada.stockVehiculo.filter((item) => item.cantidadDisponible > 0);
  }, [jornada?.stockVehiculo]);

  const totalUnidadesRemanentes = useMemo(() => {
    return itemsRemanentes.reduce((acc, item) => acc + item.cantidadDisponible, 0);
  }, [itemsRemanentes]);

  // Guard: si no hay jornada activa y no estamos mostrando el resumen → redirigir a /jornada
  if (!jornadaLoading && !jornada && !resumen) {
    return <Navigate to="/jornada" replace />;
  }

  // 3. Ejecutar Cierre de Jornada
  const handleConfirmarCierre = async () => {
    if (!jornada) return;

    setCerrando(true);
    setErrorCierre(null);

    try {
      const payload = notasCierre.trim() ? { notasCierre: notasCierre.trim() } : undefined;
      const res = await cerrarJornada(jornada.id, payload);

      const resumenData = res.data;
      setResumen(resumenData);

      // Refrescar el contexto de jornada para limpiar la jornada activa
      await refreshJornada();
    } catch (err: unknown) {
      console.error('[EscenaCierre] Error al cerrar jornada:', err);
      const message =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Error inesperado al cerrar la jornada. Por favor reintenta.';
      setErrorCierre(message);
    } finally {
      setCerrando(false);
    }
  };

  // ─── Estado Resumen (Post-cierre exitoso) ──────────────────────────────────
  if (resumen) {
    const totalVentasStr = `${resumen.totalVentas} ${resumen.totalVentas === 1 ? 'venta' : 'ventas'}`;
    const montoVendidoStr = `$${Math.round(resumen.totalMontoVendido).toLocaleString('es-CL')}`;
    const montoCobradoStr = `$${Math.round(resumen.totalCobrado).toLocaleString('es-CL')}`;
    const lotesRetornadosStr = `${resumen.itemsRetornadosAlDeposito} ${resumen.itemsRetornadosAlDeposito === 1 ? 'lote' : 'lotes'}`;

    return (
      <JornadaLayout titulo="Jornada Cerrada" mostrarAtras={false}>
        <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-120px)] px-4 py-8 text-center animate-fade-in max-w-lg mx-auto">
          {/* Badge / Ícono de Éxito */}
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 animate-pulse shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>

          <h2 className="text-2xl font-black text-white mb-1">
            Jornada Cerrada
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6">
            La jornada #{resumen.idJornada} ha sido finalizada y el stock restante fue conciliado en el depósito.
          </p>

          {/* Tarjetas de Métricas */}
          <div className="w-full grid grid-cols-2 gap-3 mb-6 text-left">
            {/* Ventas Realizadas */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <ShoppingBag className="w-3.5 h-3.5 text-brand-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Ventas</span>
              </div>
              <p className="text-lg font-black text-white">{totalVentasStr}</p>
            </div>

            {/* Monto Total Vendido */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Monto Vendido</span>
              </div>
              <p className="text-lg font-black text-emerald-400">{montoVendidoStr}</p>
            </div>

            {/* Total Cobrado */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <ArrowDownLeft className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Cobrado</span>
              </div>
              <p className="text-lg font-black text-teal-300">{montoCobradoStr}</p>
            </div>

            {/* Lotes Retornados */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <PackageCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Retorno Depósito</span>
              </div>
              <p className="text-lg font-black text-white">{lotesRetornadosStr}</p>
            </div>
          </div>

          {/* Botón Volver al Inicio */}
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </button>
        </div>
      </JornadaLayout>
    );
  }

  // ─── Estado Confirmación (Pre-cierre) ───────────────────────────────────────
  return (
    <JornadaLayout
      titulo="Cerrar Jornada"
      mostrarAtras={true}
      onAtras={() => navigate('/jornada/ruta')}
    >
      <div className="flex flex-col min-h-[calc(100dvh-57px)] pb-36">
        {/* Subheader: Info del vehículo y ruta de la jornada */}
        <div className="bg-zinc-900/90 border-b border-zinc-800/60 px-4 py-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand-400 shrink-0" />
              <p className="text-sm font-bold text-zinc-100 truncate">
                {jornada?.vehiculoPatente || 'Vehículo'} {jornada?.vehiculoDescripcion ? `— ${jornada.vehiculoDescripcion}` : ''}
              </p>
            </div>
            {jornada?.rutaNombre && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-400 pl-6">
                <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                <span className="truncate">Ruta: {jornada.rutaNombre}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 px-4 py-4 space-y-4">
          {/* Advertencia si hay operaciones offline pendientes */}
          {pendingQueueCount > 0 && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-amber-300 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-200">
                  {pendingQueueCount} {pendingQueueCount === 1 ? 'operación pendiente' : 'operaciones pendientes'} de sincronización
                </p>
                <p className="text-amber-300/80 leading-relaxed">
                  Hay operaciones guardadas offline sin sincronizar con el servidor. Se recomienda esperar a tener conexión a internet para que se envíen antes de cerrar la jornada.
                </p>
              </div>
            </div>
          )}

          {/* Sección: Stock Remanente en el Vehículo */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                <Boxes className="w-4 h-4 text-zinc-500" />
                <span>Stock remanente a devolver</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                {itemsRemanentes.length} {itemsRemanentes.length === 1 ? 'ítem' : 'ítems'} ({totalUnidadesRemanentes} uds)
              </span>
            </div>

            {itemsRemanentes.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 text-center space-y-2">
                <Boxes className="w-8 h-8 text-zinc-700 mx-auto" />
                <p className="text-xs font-bold text-zinc-300">
                  Vehículo sin stock remanente
                </p>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  El vehículo está vacío. No hay stock pendiente de retorno al depósito.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {itemsRemanentes.map((item) => (
                  <div
                    key={`${item.idProducto}-${item.idLote}`}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-zinc-100 truncate">
                        {item.nombreProducto}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {item.codigoProducto}
                        </span>
                        <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                          Lote: {item.numeroLote}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-brand-500/10 text-brand-300 border border-brand-500/20 tabular-nums">
                        {item.cantidadDisponible} {item.unidadMedida || 'uds'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campo opcional: Notas de Cierre */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              Notas de cierre <span className="text-zinc-600 font-normal lowercase">(opcional)</span>
            </label>
            <textarea
              rows={3}
              value={notasCierre}
              onChange={(e) => setNotasCierre(e.target.value)}
              placeholder="Observaciones del cierre..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          {/* Error de cierre */}
          {errorCierre && (
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-rose-400 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-bold">Error al cerrar la jornada</p>
                <p className="text-rose-400/90">{errorCierre}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer fijo con botón Cerrar Jornada */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate('/jornada/ruta')}
              disabled={cerrando}
              className="px-4 py-3 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              onClick={handleConfirmarCierre}
              disabled={cerrando}
              className="flex-1 max-w-xs py-3.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-2xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
            >
              {cerrando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cerrando jornada...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Cerrar Jornada
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </JornadaLayout>
  );
}
