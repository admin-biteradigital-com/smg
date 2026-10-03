import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Package,
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
  Globe,
  Tag,
  Barcode,
  Search,
  X,
  Camera,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import BarcodeScannerModal, { isBarcodeScannerSupported } from '@/components/gestion/BarcodeScannerModal';
import { getProductosAdmin, ApiRequestError } from '@/lib/api';
import type { ProductoAdminItem } from '@/types';

// TODO: BarcodeDetector no funciona en iOS Safari — evaluar @zxing/browser si se necesita soporte cross-browser

export default function ProductosListPage() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<ProductoAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Búsqueda y filtrado en memoria
  const [busqueda, setBusqueda] = useState('');

  // Escáner de código de barras y confirmaciones
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedMatch, setScannedMatch] = useState<ProductoAdminItem | null>(null);
  const [scannedNotFoundCode, setScannedNotFoundCode] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getProductosAdmin();
      if (res?.data) {
        setProductos(res.data);
      }
    } catch (err: unknown) {
      console.error('[ProductosListPage] Error al cargar productos:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista de productos.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Procesamiento del resultado entregado por el escáner
  const handleBarcodeScanned = (codigo: string) => {
    const clean = codigo.trim();
    const match = productos.find(
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

  // Filtrado de productos en memoria
  const term = busqueda.trim().toLowerCase();
  const productosFiltrados = term
    ? productos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(term) ||
          (p.codigoBarras && p.codigoBarras.toLowerCase().includes(term)) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(term))
      )
    : productos;

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
            <Package className="w-4 h-4 text-violet-400" />
            <h1 className="text-sm font-bold text-white">Productos</h1>
          </div>

          <button
            onClick={() => navigate('/gestion/productos/nuevo')}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-xs">Cargando productos...</p>
          </div>
        ) : errorMsg ? (
          <div className="space-y-4 py-8">
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
            <button
              onClick={loadData}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-xl text-xs font-bold transition-all"
            >
              Reintentar
            </button>
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-sm font-bold text-zinc-200">No hay productos registrados</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Crea tu catálogo de productos, unidades y precios de venta.
            </p>
            <button
              onClick={() => navigate('/gestion/productos/nuevo')}
              className="mt-5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Producto</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Barra de Búsqueda y Botón de Escáner */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o código..."
                  className="w-full pl-10 pr-9 py-2.5 bg-zinc-900/80 border border-zinc-800 focus:border-violet-500 rounded-2xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 rounded-lg transition-colors"
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
                  className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-violet-500/40 text-violet-300 rounded-2xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Escanear código de barras con la cámara"
                >
                  <Camera className="w-3.5 h-3.5 text-violet-400" />
                  <span>Escanear</span>
                </button>
              )}
            </div>

            {/* Contador de Productos */}
            <div className="flex items-center justify-between px-1 text-xs text-zinc-400 font-medium">
              <span>
                {term
                  ? `${productosFiltrados.length} de ${productos.length} ${productos.length === 1 ? 'producto' : 'productos'}`
                  : `${productos.length} ${productos.length === 1 ? 'producto' : 'productos'}`}
              </span>
            </div>

            {/* Lista de Productos o Estado Vacío de Filtro */}
            {productosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl">
                <Search className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-xs font-bold text-zinc-300">
                  No se encontraron productos coincidentes
                </p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                  No hay resultados para "{busqueda}".
                </p>
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="mt-3 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl transition-colors"
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : (
              productosFiltrados.map((prod) => {
                const activo = prod.activo === 1;
                const visibleWeb = prod.visiblePublico === 1;

                return (
                  <button
                    key={prod.id}
                    onClick={() => navigate(`/gestion/productos/${prod.id}/editar`)}
                    className="w-full p-4 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl flex items-center gap-3.5 transition-all active:scale-[0.99] text-left group shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0 text-violet-400 group-hover:scale-105 transition-transform">
                      <Package className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-bold text-zinc-100 truncate">
                          {prod.nombre}
                        </p>
                        {activo ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md">
                            Inactivo
                          </span>
                        )}
                        {visibleWeb && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-md">
                            <Globe className="w-2.5 h-2.5" />
                            Visible web
                          </span>
                        )}
                      </div>

                      {prod.descripcion && (
                        <p className="text-xs text-zinc-400 line-clamp-1 mb-1 leading-relaxed">
                          {prod.descripcion}
                        </p>
                      )}

                      <div className="flex items-center gap-2.5 text-xs text-zinc-400 flex-wrap mt-1">
                        {/* Precio sugerido */}
                        <span className="font-bold text-zinc-200 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-violet-400" />
                          {prod.precioUnitarioSugerido !== null
                            ? `$${prod.precioUnitarioSugerido.toLocaleString('es-CL')}`
                            : 'Sin precio'}
                        </span>

                        {/* Unidad Base */}
                        <span className="text-[11px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50">
                          {prod.nombreUnidadBase || 'Unidad'}
                        </span>

                        {/* Precio Costo si existe */}
                        {prod.precioCosto !== null && (
                          <span className="text-[11px] text-zinc-500">
                            Costo: ${prod.precioCosto.toLocaleString('es-CL')}
                          </span>
                        )}

                        {/* Código de barras si existe */}
                        {prod.codigoBarras && (
                          <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
                            <Barcode className="w-3 h-3" />
                            {prod.codigoBarras}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Modal de Escáner de Código de Barras (Cámara en vivo / Foto) */}
        <BarcodeScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleBarcodeScanned}
        />

        {/* Modal: Coincidencia Encontrada (Muestra Nombre del Producto) */}
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
                  <Package className="w-4 h-4 text-violet-400 shrink-0" />
                  <h3 className="text-base font-bold text-white leading-snug">
                    {scannedMatch.nombre}
                  </h3>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-zinc-400 flex-wrap pt-2 border-t border-zinc-900">
                  <span className="font-mono text-[11px] text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 flex items-center gap-1">
                    <Barcode className="w-3 h-3" />
                    {scannedMatch.codigoBarras}
                  </span>
                  <span className="text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-[11px]">
                    {scannedMatch.nombreUnidadBase || 'Unidad'}
                  </span>
                  {scannedMatch.precioUnitarioSugerido !== null && (
                    <span className="font-bold text-zinc-200 text-xs">
                      ${scannedMatch.precioUnitarioSugerido.toLocaleString('es-CL')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda(scannedMatch.nombre);
                    setScannedMatch(null);
                  }}
                  className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Aplicar como filtro</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const id = scannedMatch.id;
                    setScannedMatch(null);
                    navigate(`/gestion/productos/${id}/editar`);
                  }}
                  className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ir al producto</span>
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

        {/* Modal: Coincidencia No Encontrada */}
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
                    <p className="text-[11px] text-zinc-400">Catálogo de productos</p>
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
                  No existe ningún producto registrado con el código de barras:
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
                  className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Volver a intentar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBusqueda(scannedNotFoundCode);
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
      </main>
    </div>
  );
}
