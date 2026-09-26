import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ShoppingBag,
  Search,
  Loader2,
  AlertCircle,
  Eye,
  Tag,
  Package,
  X,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { getCatalogoPublico, getCatalogoMarcas, ApiRequestError } from '@/lib/api';
import type { CatalogProductItem, ApiResponse } from '@/types';

/** Helper para extraer nombres de marcas de forma resiliente ante cualquier envoltorio de API */
function extractBrandNames(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const obj = item as { nombre?: string; slug?: string };
          return obj.nombre || obj.slug || '';
        }
        return '';
      })
      .filter(Boolean);
  }
  if (typeof raw === 'object' && 'data' in raw) {
    const data = (raw as { data: unknown }).data;
    if (Array.isArray(data)) {
      return extractBrandNames(data);
    }
  }
  return [];
}

/** Formateador de moneda para pesos chilenos (CLP) */
function formatCLP(amount: number): string {
  return `$ ${amount.toLocaleString('es-CL')}`;
}

export default function CatalogoGestionPage() {
  const navigate = useNavigate();

  // Estados de datos
  const [productos, setProductos] = useState<CatalogProductItem[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroMarca, setFiltroMarca] = useState<string>('todas');

  // Fallback de imágenes que fallan al cargar
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const handleImageError = (id: number) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  // Cargar datos del catálogo y marcas
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // Petición en paralelo: productos del catálogo y marcas
      const [catalogoRes, marcasRes] = await Promise.allSettled([
        getCatalogoPublico<CatalogProductItem[]>({
          q: busqueda.trim() || undefined,
          marca: filtroMarca !== 'todas' ? filtroMarca : undefined,
          pageSize: 100,
        }),
        getCatalogoMarcas(),
      ]);

      if (catalogoRes.status === 'rejected') {
        throw catalogoRes.reason;
      }

      // Procesar productos
      const dataResponse = catalogoRes.value as ApiResponse<CatalogProductItem[]>;
      const items = Array.isArray(dataResponse?.data) ? dataResponse.data : [];
      setProductos(items);

      // Procesar marcas si resolvió con éxito
      if (marcasRes.status === 'fulfilled') {
        const brandList = extractBrandNames(marcasRes.value);
        setMarcas(brandList);
      }
    } catch (err: unknown) {
      console.error('[CatalogoGestionPage] Error al cargar catálogo:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo cargar el catálogo público.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [busqueda, filtroMarca]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleClearSearch = () => {
    setBusqueda('');
  };

  // Filtrado local adicional para respuesta instantánea si el usuario escribe
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      if (filtroMarca !== 'todas') {
        const marcaActual = (p.marca || '').toLowerCase();
        if (marcaActual !== filtroMarca.toLowerCase()) return false;
      }
      return true;
    });
  }, [productos, filtroMarca]);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header Fijo */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/gestion')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-teal-400" />
            <h1 className="text-sm font-bold text-white">Catálogo Público</h1>
            <span className="hidden sm:inline-flex items-center text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded-full">
              Vista previa
            </span>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            title="Actualizar catálogo"
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {/* Banner Informativo de Vista Previa */}
        <div className="mb-6 p-4 rounded-2xl bg-teal-950/30 border border-teal-500/25 flex items-start gap-3.5 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0 text-teal-400 mt-0.5">
            <Eye className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-teal-200">Previsualización de Cara al Público</h2>
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-teal-300 bg-teal-500/20 px-1.5 py-0.5 rounded">
                <Sparkles className="w-2.5 h-2.5" /> E-commerce
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Esta pantalla muestra los productos, descripciones web y <strong className="text-zinc-200">precios de venta al público final</strong> (no costos internos) tal como se publicarán en el sitio web de SMG.
            </p>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="space-y-3.5 mb-6">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre de producto..."
              className="w-full pl-10 pr-10 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
            {busqueda && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Filtro de Marcas */}
          {marcas.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-semibold text-zinc-400 shrink-0 flex items-center gap-1 mr-1">
                <Tag className="w-3 h-3 text-zinc-400" /> Marca:
              </span>
              <button
                type="button"
                onClick={() => setFiltroMarca('todas')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filtroMarca === 'todas'
                    ? 'bg-teal-500 text-zinc-950 font-bold shadow-sm'
                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                Todas
              </button>
              {marcas.map((marca) => {
                const isSelected = filtroMarca.toLowerCase() === marca.toLowerCase();
                return (
                  <button
                    key={marca}
                    type="button"
                    onClick={() => setFiltroMarca(marca)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-teal-500 text-zinc-950 font-bold shadow-sm'
                        : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {marca}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Estados de Carga / Error / Vacío / Lista */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            <p className="text-xs">Cargando catálogo público...</p>
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
        ) : productosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mb-3">
              <ShoppingBag className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-sm font-bold text-zinc-200">No se encontraron productos</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              {busqueda || filtroMarca !== 'todas'
                ? 'Prueba modificando los términos de búsqueda o el filtro de marca.'
                : 'No hay productos marcados como visibles para el catálogo público.'}
            </p>
            {(busqueda || filtroMarca !== 'todas') && (
              <button
                onClick={() => {
                  setBusqueda('');
                  setFiltroMarca('todas');
                }}
                className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-xl text-xs font-bold transition-all"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-zinc-400 font-medium">
              <span>
                {productosFiltrados.length}{' '}
                {productosFiltrados.length === 1 ? 'producto en catálogo' : 'productos en catálogo'}
              </span>
              <span className="text-[11px] text-zinc-400">
                Mostrando precios para clientes finales
              </span>
            </div>

            {productosFiltrados.map((prod) => {
              const hasImage = Boolean(prod.imagenUrl && !imageErrors[prod.id]);
              const hasOffer = Boolean(
                prod.precioOferta !== null &&
                prod.precioOferta !== undefined &&
                prod.precioPublico !== null &&
                prod.precioPublico !== undefined &&
                prod.precioOferta < prod.precioPublico
              );

              return (
                <div
                  key={prod.id}
                  className="w-full p-4 bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all shadow-sm group"
                >
                  {/* Thumbnail / Imagen del Producto */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-zinc-800/80 border border-zinc-700/60 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {hasImage ? (
                      <img
                        src={prod.imagenUrl!}
                        alt={prod.nombre}
                        onError={() => handleImageError(prod.id)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-500 gap-1 p-2 text-center">
                        <Package className="w-6 h-6 text-zinc-600 group-hover:text-teal-400 transition-colors" />
                        <span className="text-[9px] text-zinc-600 font-medium">Sin foto</span>
                      </div>
                    )}
                  </div>

                  {/* Información Principal del Producto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {/* Marca / Fabricante */}
                      {prod.marca && (
                        <span className="inline-flex items-center text-[10px] font-bold text-zinc-300 bg-zinc-800/90 border border-zinc-700/70 px-2 py-0.5 rounded-md">
                          {prod.marca}
                        </span>
                      )}

                      {/* Categoría Web */}
                      {prod.categoriaWeb && (
                        <span className="inline-flex items-center text-[10px] font-medium text-teal-400 bg-teal-500/10 border border-teal-500/25 px-2 py-0.5 rounded-md">
                          {prod.categoriaWeb}
                        </span>
                      )}

                      {/* Unidad de Venta */}
                      {prod.unidadVenta && (
                        <span className="text-[10px] text-zinc-400">
                          Venta por {prod.unidadVenta}
                        </span>
                      )}
                    </div>

                    {/* Nombre del Producto */}
                    <h3 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-white transition-colors">
                      {prod.nombre}
                    </h3>

                    {/* Descripción Web de Cara al Público */}
                    {prod.descripcionWeb ? (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {prod.descripcionWeb}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-400 italic mt-1">
                        Sin descripción web configurada
                      </p>
                    )}
                  </div>

                  {/* Sección de Precio de Venta al Público (NO de costo) */}
                  <div className="w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80 flex sm:flex-col items-center sm:items-end justify-between shrink-0">
                    <div className="text-left sm:text-right">
                      {hasOffer ? (
                        <div>
                          <div className="flex items-center gap-1.5 sm:justify-end">
                            <span className="text-xs text-zinc-500 line-through">
                              {formatCLP(prod.precioPublico!)}
                            </span>
                            <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.2 rounded">
                              Oferta
                            </span>
                          </div>
                          <p className="text-base sm:text-lg font-black text-rose-400 leading-tight">
                            {formatCLP(prod.precioOferta!)}
                          </p>
                        </div>
                      ) : prod.precioPublico !== null && prod.precioPublico !== undefined ? (
                        <p className="text-base sm:text-lg font-black text-emerald-400 leading-tight">
                          {formatCLP(prod.precioPublico)}
                        </p>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md">
                          Sin precio público
                        </span>
                      )}
                      <span className="text-[10px] font-medium text-zinc-400 block mt-0.5">
                        Precio público sugerido
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
