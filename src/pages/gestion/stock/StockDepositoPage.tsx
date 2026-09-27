import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Warehouse,
  Loader2,
  AlertCircle,
  Search,
  Package,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  X,
  Pencil,
} from 'lucide-react';
import {
  getStockDeposito,
  ajustarStockDeposito,
  ApiRequestError,
} from '@/lib/api';
import type { StockDepositoItem } from '@/lib/api';

// ─── StockDepositoPage ────────────────────────────────────────────────────────
// Ruta: /gestion/stock
// Lista el stock del depósito por lote con acción "Ajustar" por fila.

interface AjusteTarget {
  item: StockDepositoItem;
}

export default function StockDepositoPage() {
  const navigate = useNavigate();

  // Datos
  const [stock, setStock] = useState<StockDepositoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Filtro de búsqueda
  const [busqueda, setBusqueda] = useState('');

  // Modal de ajuste
  const [ajusteTarget, setAjusteTarget] = useState<AjusteTarget | null>(null);
  const [cantidadNueva, setCantidadNueva] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviandoAjuste, setEnviandoAjuste] = useState(false);
  const [errorAjuste, setErrorAjuste] = useState<string | null>(null);

  // ─── Load Data ──────────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getStockDeposito();
      setStock(res?.data || []);
    } catch (err: unknown) {
      console.error('[StockDepositoPage] Error al cargar stock:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo cargar el stock del depósito.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── Filter ─────────────────────────────────────────────────────────────────

  const filtrado = stock.filter((item) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      item.producto.nombre.toLowerCase().includes(q) ||
      item.numeroLote.toLowerCase().includes(q)
    );
  });

  // ─── Agrupar por producto ───────────────────────────────────────────────────

  const agrupado = filtrado.reduce<
    Record<number, { nombre: string; lotes: StockDepositoItem[] }>
  >((acc, item) => {
    if (!acc[item.producto.id]) {
      acc[item.producto.id] = { nombre: item.producto.nombre, lotes: [] };
    }
    acc[item.producto.id].lotes.push(item);
    return acc;
  }, {});

  const productosOrdenados = Object.entries(agrupado).sort(([, a], [, b]) =>
    a.nombre.localeCompare(b.nombre, 'es')
  );

  // ─── Open Adjustment Modal ──────────────────────────────────────────────────

  const abrirAjuste = (item: StockDepositoItem) => {
    setAjusteTarget({ item });
    setCantidadNueva(String(item.cantidadActual));
    setMotivo('');
    setErrorAjuste(null);
  };

  const cerrarAjuste = () => {
    setAjusteTarget(null);
    setCantidadNueva('');
    setMotivo('');
    setErrorAjuste(null);
    setEnviandoAjuste(false);
  };

  // ─── Submit Adjustment ──────────────────────────────────────────────────────

  const handleConfirmarAjuste = async () => {
    if (!ajusteTarget) return;

    const cantidad = parseInt(cantidadNueva, 10);
    if (isNaN(cantidad) || cantidad < 0) {
      setErrorAjuste('La cantidad debe ser un número entero mayor o igual a 0.');
      return;
    }

    setEnviandoAjuste(true);
    setErrorAjuste(null);

    try {
      const resultado = await ajustarStockDeposito({
        id_producto: ajusteTarget.item.producto.id,
        numero_lote: ajusteTarget.item.numeroLote,
        fecha_vencimiento: ajusteTarget.item.fechaVencimiento,
        cantidad_nueva: cantidad,
        motivo: motivo.trim() || undefined,
      });

      const data = resultado?.data;
      const diff = data
        ? data.cantidad_nueva - data.cantidad_anterior
        : cantidad - ajusteTarget.item.cantidadActual;
      const signo = diff > 0 ? '+' : '';

      setExitoMsg(
        `Lote ${ajusteTarget.item.numeroLote} ajustado: ${data?.cantidad_anterior ?? ajusteTarget.item.cantidadActual} → ${cantidad} (${signo}${diff})`
      );

      cerrarAjuste();

      // Refrescar datos
      await loadData();

      // Auto-clear success message
      setTimeout(() => setExitoMsg(null), 5000);
    } catch (err: unknown) {
      console.error('[StockDepositoPage] Error al ajustar stock:', err);
      if (err instanceof ApiRequestError) {
        setErrorAjuste(err.message || `Error del servidor (HTTP ${err.status})`);
      } else if (err instanceof Error) {
        setErrorAjuste(err.message);
      } else {
        setErrorAjuste('Error desconocido al registrar el ajuste.');
      }
      setEnviandoAjuste(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatFecha = (iso: string) => {
    try {
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return iso;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const totalLotes = stock.length;
  const totalUnidades = stock.reduce((acc, i) => acc + i.cantidadActual, 0);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header Fijo */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/gestion')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-orange-400" />
            <h1 className="text-sm font-bold text-white">Stock Depósito</h1>
          </div>

          {/* Spacer for symmetry */}
          <div className="w-[72px]" />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {/* Mensaje de éxito flotante */}
        {exitoMsg && (
          <div className="mb-4 flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 text-xs text-emerald-400 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1 leading-relaxed">{exitoMsg}</p>
            <button onClick={() => setExitoMsg(null)} className="p-0.5 hover:bg-emerald-500/20 rounded-lg transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-xs">Cargando stock del depósito...</p>
          </div>
        ) : errorMsg ? (
          <div className="space-y-4 py-8">
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
            <button
              onClick={loadData}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl text-xs font-bold transition-all"
            >
              Reintentar
            </button>
          </div>
        ) : stock.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mb-3">
              <Warehouse className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-sm font-bold text-zinc-200">Sin stock registrado</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Aún no hay lotes de stock en el depósito. Se cargarán al recibir mercadería.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Barra de búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por producto o lote..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-2xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-white rounded-md transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Resumen */}
            <div className="flex items-center justify-between px-1 text-xs text-zinc-400 font-medium">
              <span>
                {filtrado.length} {filtrado.length === 1 ? 'lote' : 'lotes'}
                {busqueda.trim() && ` de ${totalLotes}`}
              </span>
              <span className="text-zinc-500">
                {totalUnidades.toLocaleString('es-CL')} unidades totales
              </span>
            </div>

            {/* Lista agrupada por producto */}
            {productosOrdenados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">
                  No se encontraron lotes con "{busqueda}"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {productosOrdenados.map(([prodId, grupo]) => (
                  <div
                    key={prodId}
                    className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden"
                  >
                    {/* Header de producto */}
                    <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-100 truncate">
                          {grupo.nombre}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {grupo.lotes.length}{' '}
                          {grupo.lotes.length === 1 ? 'lote' : 'lotes'} ·{' '}
                          {grupo.lotes
                            .reduce((s, l) => s + l.cantidadActual, 0)
                            .toLocaleString('es-CL')}{' '}
                          {grupo.lotes[0]?.unidadBase || 'un.'}
                        </p>
                      </div>
                    </div>

                    {/* Lotes */}
                    <div className="divide-y divide-zinc-800/40">
                      {grupo.lotes.map((lote) => (
                        <div
                          key={lote.id}
                          className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold text-zinc-200">
                                Lote {lote.numeroLote}
                              </span>
                              {lote.alertaVencimiento && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Próx. vencer
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                              <span className="flex items-center gap-1">
                                <CalendarClock className="w-3 h-3" />
                                Vence {formatFecha(lote.fechaVencimiento)}
                              </span>
                              <span className="text-zinc-500">
                                {lote.diasParaVencer}d restantes
                              </span>
                            </div>
                          </div>

                          {/* Cantidad + Acción */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-bold text-zinc-100 tabular-nums">
                                {lote.cantidadActual.toLocaleString('es-CL')}
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                {lote.unidadBase}
                              </p>
                            </div>
                            <button
                              onClick={() => abrirAjuste(lote)}
                              className="p-2 bg-zinc-800/80 hover:bg-orange-500/20 border border-zinc-700/50 hover:border-orange-500/40 text-zinc-400 hover:text-orange-400 rounded-xl transition-all active:scale-95"
                              title="Ajustar cantidad"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modal de Ajuste ──────────────────────────────────────────────────── */}
      {ajusteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={cerrarAjuste}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-slide-up sm:animate-fade-in mx-4 sm:mx-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-white">Ajustar Cantidad</h2>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">
                  {ajusteTarget.item.producto.nombre}
                </p>
              </div>
              <button
                onClick={cerrarAjuste}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Datos del lote */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Lote</span>
                <span className="font-mono font-bold text-zinc-200">
                  {ajusteTarget.item.numeroLote}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Vencimiento</span>
                <span className="text-zinc-300">
                  {formatFecha(ajusteTarget.item.fechaVencimiento)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Cantidad actual</span>
                <span className="font-bold text-orange-400">
                  {ajusteTarget.item.cantidadActual.toLocaleString('es-CL')}{' '}
                  {ajusteTarget.item.unidadBase}
                </span>
              </div>
            </div>

            {/* Input: Cantidad Nueva */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">
                Cantidad nueva <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={cantidadNueva}
                onChange={(e) => {
                  setCantidadNueva(e.target.value);
                  setErrorAjuste(null);
                }}
                placeholder="Ej: 120"
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-2xl text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all tabular-nums"
                autoFocus
              />
              {cantidadNueva !== '' && !isNaN(parseInt(cantidadNueva, 10)) && (
                <p className="text-[11px] text-zinc-500 px-1">
                  {(() => {
                    const diff = parseInt(cantidadNueva, 10) - ajusteTarget.item.cantidadActual;
                    if (diff === 0) return 'Sin cambio';
                    const signo = diff > 0 ? '+' : '';
                    return `Diferencia: ${signo}${diff} ${ajusteTarget.item.unidadBase}`;
                  })()}
                </p>
              )}
            </div>

            {/* Input: Motivo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">
                Motivo <span className="text-zinc-600">(opcional)</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Conteo físico del 27/09, diferencia por rotura"
                rows={2}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-2xl text-zinc-100 text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all resize-none"
              />
            </div>

            {/* Error de ajuste */}
            {errorAjuste && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorAjuste}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={cerrarAjuste}
                disabled={enviandoAjuste}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarAjuste}
                disabled={enviandoAjuste || cantidadNueva === ''}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
              >
                {enviandoAjuste ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Ajustando...
                  </>
                ) : (
                  'Confirmar Ajuste'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
