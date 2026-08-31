import { useState } from 'react';
import {
  X,
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Loader2,
  WifiOff,
  ShoppingBag,
} from 'lucide-react';
import { cerrarJornada } from '@/lib/api';
import type { ResumenCierre } from '@/types';

interface ModalCierreJornadaProps {
  isOpen: boolean;
  idJornada: string;
  onClose: () => void;
  onSuccess: (resumen: ResumenCierre) => void;
}

export function ModalCierreJornada({
  isOpen,
  idJornada,
  onClose,
  onSuccess,
}: ModalCierreJornadaProps) {
  const [notasCierre, setNotasCierre] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenCierre | null>(null);

  const isOnline = navigator.onLine;

  if (!isOpen) return null;

  const handleConfirmarCierre = async () => {
    if (!isOnline) {
      setErrorMsg('Se requiere conexión a internet para cerrar la jornada.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await cerrarJornada(idJornada, {
        notasCierre: notasCierre.trim() || null,
      });

      setResumen(res.data);
    } catch (err: any) {
      console.error('[ModalCierreJornada] Error al cerrar jornada:', err);
      setErrorMsg(err.message || 'No se pudo cerrar la jornada. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizar = () => {
    if (resumen) {
      onSuccess(resumen);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${
              resumen
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}>
              {resumen ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {resumen ? 'Jornada Finalizada' : 'Cerrar Jornada'}
              </h2>
              <p className="text-xs text-zinc-400">
                {resumen ? 'Resumen y conciliación de turno' : `Finalizar turno #${idJornada}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* PASO 2: Resumen devuelto tras el cierre */}
          {resumen ? (
            <div className="space-y-5">
              <div className="text-center py-2">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white">¡Jornada #{resumen.idJornada} Cerrada!</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                  El stock remanente ha sido retornado al depósito central y las cuentas del día están conciliadas.
                </p>
              </div>

              {/* Grid de métricas de cierre */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-1">
                  <div className="p-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-xl w-max">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black text-white">{resumen.totalVentas}</p>
                  <p className="text-[11px] text-zinc-400 font-semibold">Total Ventas</p>
                </div>

                <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-1">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl w-max">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black text-white">
                    ${resumen.totalMontoVendido.toLocaleString('es-CL')}
                  </p>
                  <p className="text-[11px] text-zinc-400 font-semibold">Monto Vendido</p>
                </div>

                <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-1">
                  <div className="p-2 bg-accent-500/10 border border-accent-500/20 text-accent-400 rounded-xl w-max">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black text-white">
                    ${resumen.totalCobrado.toLocaleString('es-CL')}
                  </p>
                  <p className="text-[11px] text-zinc-400 font-semibold">Total Cobrado</p>
                </div>

                <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-1">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl w-max">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-black text-white">
                    {resumen.itemsRetornadosAlDeposito}
                  </p>
                  <p className="text-[11px] text-zinc-400 font-semibold">Lotes al Depósito</p>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleFinalizar}
                  className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] text-sm"
                >
                  Aceptar y Volver a Inicio
                </button>
              </div>
            </div>
          ) : (
            /* PASO 1: Confirmación de cierre */
            <div className="space-y-4">
              {/* Alerta explicativa */}
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-300">¿Estás seguro de cerrar la jornada?</p>
                  <p className="text-amber-400/85 leading-relaxed">
                    Al cerrar la jornada:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-400/80">
                    <li>Todo el stock remanente en el vehículo se reintegrará al inventario central del depósito.</li>
                    <li>No se podrán registrar más ventas ni cargar stock en este turno.</li>
                    <li>Se generará el reporte consolidado de ventas y cobranzas.</li>
                  </ul>
                </div>
              </div>

              {!isOnline && (
                <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3.5 text-rose-400">
                  <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold">Sin conexión a internet</p>
                    <p className="text-rose-400/80 mt-0.5">
                      El cierre de jornada requiere conexión activa para conciliar inventario en la nube.
                    </p>
                  </div>
                </div>
              )}

              {/* Notas de cierre */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  Notas de Cierre <span className="text-zinc-500 text-[10px] lowercase font-normal">(opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={notasCierre}
                  onChange={(e) => setNotasCierre(e.target.value)}
                  placeholder="Ej: Kilometraje final, novedades de cobranza o ruta..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-rose-500 transition-colors resize-none"
                />
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3.5 text-rose-400">
                  <X className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs">{errorMsg}</p>
                </div>
              )}

              {/* Acciones */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarCierre}
                  disabled={submitting || !isOnline}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cerrando turno...
                    </>
                  ) : (
                    'Confirmar y Cerrar'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
