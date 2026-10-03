import { useEffect, useState, useRef } from 'react';
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
  Plus,
  ChevronRight,
  ArrowLeft,
  Camera,
  Barcode,
  RefreshCw,
} from 'lucide-react';
import BarcodeScannerModal, { isBarcodeScannerSupported } from '@/components/gestion/BarcodeScannerModal';
import {
  getStockDeposito,
  ajustarStockDeposito,
  getProductosAdmin,
  ApiRequestError,
} from '@/lib/api';
import type { StockDepositoItem } from '@/lib/api';
import type { ProductoAdminItem } from '@/types';

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

  // Modal de nuevo lote
  const [nuevoLoteOpen, setNuevoLoteOpen] = useState(false);
  const [nuevoLotePaso, setNuevoLotePaso] = useState<'producto' | 'detalle'>('producto');
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoAdminItem[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoAdminItem | null>(null);
  const [nuevoNumeroLote, setNuevoNumeroLote] = useState('');
  const [nuevoFechaVenc, setNuevoFechaVenc] = useState('');
  const [nuevoCantidad, setNuevoCantidad] = useState('');
  const [nuevoMotivo, setNuevoMotivo] = useState('');
  const [enviandoNuevo, setEnviandoNuevo] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);
  const nuevoLoteInputRef = useRef<HTMLInputElement>(null);

  // Escaneo de código de barras en Paso 1 (Agregar lote)
  // TODO: BarcodeDetector no funciona en iOS Safari — evaluar @zxing/browser si se necesita soporte cross-browser
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedMatch, setScannedMatch] = useState<ProductoAdminItem | null>(null);
  const [scannedNotFoundCode, setScannedNotFoundCode] = useState<string | null>(null);

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

  // ─── Nuevo Lote ─────────────────────────────────────────────────────────────

  const abrirNuevoLote = async () => {
    setNuevoLoteOpen(true);
    setNuevoLotePaso('producto');
    setProductoSeleccionado(null);
    setBusquedaProducto('');
    setNuevoNumeroLote('');
    setNuevoFechaVenc('');
    setNuevoCantidad('');
    setNuevoMotivo('');
    setErrorNuevo(null);
    setEnviandoNuevo(false);

    // Cargar productos si no los tenemos aún
    if (productosDisponibles.length === 0) {
      setLoadingProductos(true);
      try {
        const res = await getProductosAdmin(1); // solo activos
        setProductosDisponibles(res?.data || []);
      } catch (err) {
        console.error('[StockDepositoPage] Error al cargar productos:', err);
        setErrorNuevo('No se pudo cargar la lista de productos.');
      } finally {
        setLoadingProductos(false);
      }
    }
  };

  const cerrarNuevoLote = () => {
    setNuevoLoteOpen(false);
    setProductoSeleccionado(null);
    setBusquedaProducto('');
    setNuevoNumeroLote('');
    setNuevoFechaVenc('');
    setNuevoCantidad('');
    setNuevoMotivo('');
    setErrorNuevo(null);
    setEnviandoNuevo(false);
    setScannerOpen(false);
    setScannedMatch(null);
    setScannedNotFoundCode(null);
  };

  const handleBarcodeScanned = (codigo: string) => {
    const clean = codigo.trim();
    const match = productosDisponibles.find(
      (p) => p.codigoBarras && p.codigoBarras.trim() === clean
    );

    if (match) {
      setScannedMatch(match);
      setScannedNotFoundCode(null);
    } else {
      setScannedNotFoundCode(clean);
      setScannedMatch(null);
    }
  };

  const seleccionarProducto = (prod: ProductoAdminItem) => {
    setProductoSeleccionado(prod);
    setNuevoLotePaso('detalle');
    setErrorNuevo(null);
    // Focus en el primer campo tras animación
    setTimeout(() => nuevoLoteInputRef.current?.focus(), 100);
  };

  const volverAProducto = () => {
    setNuevoLotePaso('producto');
    setErrorNuevo(null);
  };

  const productosFiltrados = productosDisponibles.filter((p) => {
    if (!busquedaProducto.trim()) return true;
    const q = busquedaProducto.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      (p.codigoBarras && p.codigoBarras.toLowerCase().includes(q))
    );
  });

  const handleConfirmarNuevoLote = async () => {
    if (!productoSeleccionado) return;

    if (!nuevoNumeroLote.trim()) {
      setErrorNuevo('El número de lote es obligatorio.');
      return;
    }
    if (!nuevoFechaVenc) {
      setErrorNuevo('La fecha de vencimiento es obligatoria.');
      return;
    }
    const cantidad = parseInt(nuevoCantidad, 10);
    if (isNaN(cantidad) || cantidad < 0) {
      setErrorNuevo('La cantidad debe ser un número entero mayor o igual a 0.');
      return;
    }

    setEnviandoNuevo(true);
    setErrorNuevo(null);

    try {
      const resultado = await ajustarStockDeposito({
        id_producto: productoSeleccionado.id,
        numero_lote: nuevoNumeroLote.trim(),
        fecha_vencimiento: nuevoFechaVenc,
        cantidad_nueva: cantidad,
        motivo: nuevoMotivo.trim() || undefined,
      });

      const data = resultado?.data;
      const fueCreado = data?.lote_creado ?? true;

      setExitoMsg(
        fueCreado
          ? `Lote nuevo "${nuevoNumeroLote.trim()}" creado para ${productoSeleccionado.nombre} con ${cantidad} ${productoSeleccionado.nombreUnidadBase}.`
          : `El lote "${nuevoNumeroLote.trim()}" ya existía para ${productoSeleccionado.nombre} — cantidad actualizada a ${cantidad} ${productoSeleccionado.nombreUnidadBase}.`
      );

      cerrarNuevoLote();
      await loadData();
      setTimeout(() => setExitoMsg(null), 6000);
    } catch (err: unknown) {
      console.error('[StockDepositoPage] Error al crear lote nuevo:', err);
      if (err instanceof ApiRequestError) {
        setErrorNuevo(err.message || `Error del servidor (HTTP ${err.status})`);
      } else if (err instanceof Error) {
        setErrorNuevo(err.message);
      } else {
        setErrorNuevo('Error desconocido al registrar el lote.');
      }
      setEnviandoNuevo(false);
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
              Aún no hay lotes de stock en el depósito.
            </p>
            <button
              onClick={abrirNuevoLote}
              className="mt-4 flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md"
            >
              <Plus className="w-4 h-4" />
              Agregar primer lote
            </button>
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

            {/* Resumen + Botón Agregar */}
            <div className="flex items-center justify-between px-1 text-xs text-zinc-400 font-medium">
              <span>
                {filtrado.length} {filtrado.length === 1 ? 'lote' : 'lotes'}
                {busqueda.trim() && ` de ${totalLotes}`}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-zinc-500">
                  {totalUnidades.toLocaleString('es-CL')} un. totales
                </span>
                <button
                  onClick={abrirNuevoLote}
                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[11px] font-bold transition-all active:scale-95 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar lote
                </button>
              </div>
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

      {/* ── Modal de Nuevo Lote ─────────────────────────────────────────────── */}
      {nuevoLoteOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={cerrarNuevoLote}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-slide-up sm:animate-fade-in mx-4 sm:mx-0 max-h-[85dvh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 shrink-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-white">
                  {nuevoLotePaso === 'producto' ? 'Seleccionar Producto' : 'Nuevo Lote'}
                </h2>
                {nuevoLotePaso === 'detalle' && productoSeleccionado && (
                  <button
                    onClick={volverAProducto}
                    className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 mt-0.5 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Cambiar producto
                  </button>
                )}
              </div>
              <button
                onClick={cerrarNuevoLote}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Paso 1: Seleccionar Producto ─────────────────────────────── */}
            {nuevoLotePaso === 'producto' && (
              <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
                {loadingProductos ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    <p className="text-xs">Cargando productos...</p>
                  </div>
                ) : errorNuevo && productosDisponibles.length === 0 ? (
                  <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3 text-xs text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{errorNuevo}</p>
                  </div>
                ) : (
                  <>
                    {/* Búsqueda de producto y Escáner */}
                    <div className="flex gap-2 shrink-0">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar por nombre o código..."
                          value={busquedaProducto}
                          onChange={(e) => setBusquedaProducto(e.target.value)}
                          className="w-full pl-10 pr-8 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-2xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all"
                          autoFocus
                        />
                        {busquedaProducto && (
                          <button
                            type="button"
                            onClick={() => setBusquedaProducto('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white rounded-lg transition-colors"
                            title="Limpiar búsqueda"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {isBarcodeScannerSupported && (
                        <button
                          type="button"
                          onClick={() => setScannerOpen(true)}
                          className="px-3 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 text-orange-400 rounded-2xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shrink-0 shadow-sm"
                          title="Escanear código de barras con la cámara"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Escanear</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-500 px-1 shrink-0">
                      {productosFiltrados.length} {productosFiltrados.length === 1 ? 'producto' : 'productos'}
                      {busquedaProducto.trim() && ` encontrados`}
                    </p>

                    {/* Lista de productos */}
                    <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-1">
                      {productosFiltrados.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <Search className="w-6 h-6 text-zinc-600 mb-2" />
                          <p className="text-xs text-zinc-400">
                            No se encontraron productos con "{busquedaProducto}"
                          </p>
                        </div>
                      ) : (
                        productosFiltrados.map((prod) => (
                          <button
                            key={prod.id}
                            onClick={() => seleccionarProducto(prod)}
                            className="w-full px-3.5 py-3 bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800/60 hover:border-zinc-700/60 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.98] text-left group"
                          >
                            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-zinc-100 truncate">
                                {prod.nombre}
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                {prod.nombreUnidadBase}
                                {prod.codigoBarras && ` · ${prod.codigoBarras}`}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Paso 2: Detalle del Lote ──────────────────────────────────── */}
            {nuevoLotePaso === 'detalle' && productoSeleccionado && (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
                {/* Producto seleccionado */}
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <Package className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-200 truncate">{productoSeleccionado.nombre}</p>
                    <p className="text-[11px] text-zinc-500">{productoSeleccionado.nombreUnidadBase}</p>
                  </div>
                </div>

                {/* Input: Número de Lote */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Número de lote <span className="text-rose-400">*</span>
                  </label>
                  <input
                    ref={nuevoLoteInputRef}
                    type="text"
                    value={nuevoNumeroLote}
                    onChange={(e) => {
                      setNuevoNumeroLote(e.target.value);
                      setErrorNuevo(null);
                    }}
                    placeholder="Ej: L2026-0145"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-2xl text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all font-mono"
                  />
                </div>

                {/* Input: Fecha de Vencimiento */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Fecha de vencimiento <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={nuevoFechaVenc}
                    onChange={(e) => {
                      setNuevoFechaVenc(e.target.value);
                      setErrorNuevo(null);
                    }}
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-2xl text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all [color-scheme:dark]"
                  />
                </div>

                {/* Input: Cantidad */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Cantidad <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={nuevoCantidad}
                    onChange={(e) => {
                      setNuevoCantidad(e.target.value);
                      setErrorNuevo(null);
                    }}
                    placeholder="Ej: 200"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-2xl text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all tabular-nums"
                  />
                </div>

                {/* Input: Motivo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Motivo <span className="text-zinc-600">(opcional)</span>
                  </label>
                  <textarea
                    value={nuevoMotivo}
                    onChange={(e) => setNuevoMotivo(e.target.value)}
                    placeholder="Ej: Recepción compra proveedor X"
                    rows={2}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-2xl text-zinc-100 text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all resize-none"
                  />
                </div>

                {/* Error */}
                {errorNuevo && (
                  <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3 text-xs text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{errorNuevo}</p>
                  </div>
                )}

                {/* Botones */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={cerrarNuevoLote}
                    disabled={enviandoNuevo}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarNuevoLote}
                    disabled={enviandoNuevo || !nuevoNumeroLote.trim() || !nuevoFechaVenc || nuevoCantidad === ''}
                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
                  >
                    {enviandoNuevo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      'Crear Lote'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Escáner de Código de Barras (Cámara en vivo / Foto) */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Modal de Confirmación: Coincidencia Encontrada */}
      {scannedMatch && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => setScannedMatch(null)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-slide-up sm:animate-fade-in text-zinc-100 flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Producto encontrado</h2>
                  <p className="text-[11px] text-zinc-400">Coincidencia por código de barras</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScannedMatch(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-400 shrink-0" />
                <h3 className="text-base font-bold text-white leading-snug">
                  {scannedMatch.nombre}
                </h3>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-zinc-400 flex-wrap pt-2 border-t border-zinc-900">
                <span className="font-mono text-[11px] text-orange-300 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 flex items-center gap-1">
                  <Barcode className="w-3 h-3" />
                  {scannedMatch.codigoBarras}
                </span>
                <span className="text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-[11px]">
                  {scannedMatch.nombreUnidadBase || 'Unidad'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const prod = scannedMatch;
                  setScannedMatch(null);
                  seleccionarProducto(prod);
                }}
                className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar y seleccionar producto</span>
              </button>

              <button
                type="button"
                onClick={() => setScannedMatch(null)}
                className="w-full py-2 px-4 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alerta: Coincidencia No Encontrada */}
      {scannedNotFoundCode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => setScannedNotFoundCode(null)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-slide-up sm:animate-fade-in text-zinc-100 flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    No se encontró ningún producto con ese código
                  </h2>
                  <p className="text-[11px] text-zinc-400">Catálogo de productos activos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScannedNotFoundCode(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center space-y-1.5 shadow-inner">
              <p className="text-xs text-zinc-400">
                No existe ningún producto activo registrado con el código de barras:
              </p>
              <p className="text-lg font-mono font-bold tracking-wider text-rose-300 py-0.5">
                {scannedNotFoundCode}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setScannedNotFoundCode(null);
                  setScannerOpen(true);
                }}
                className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Volver a intentar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBusquedaProducto(scannedNotFoundCode);
                  setScannedNotFoundCode(null);
                }}
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar manualmente</span>
              </button>

              <button
                type="button"
                onClick={() => setScannedNotFoundCode(null)}
                className="w-full py-2 px-4 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
