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
} from 'lucide-react';
import { getProductosAdmin, ApiRequestError } from '@/lib/api';
import type { ProductoAdminItem } from '@/types';

export default function ProductosListPage() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<ProductoAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl text-xs font-bold transition-all"
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
            <div className="flex items-center justify-between px-1 text-xs text-zinc-400 font-medium">
              <span>{productos.length} {productos.length === 1 ? 'producto' : 'productos'}</span>
            </div>

            {productos.map((prod) => {
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
            })}
          </div>
        )}
      </main>
    </div>
  );
}
