import { useState, useRef, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Package,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Clock,
  Plus,
  ShoppingCart,
  X,
} from 'lucide-react';
import { useCatalog, type ProductWithStock } from '@/hooks/useCatalog';

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Semáforo de stock */
function StockBadge({ nivel, count }: { nivel: ProductWithStock['nivelStock']; count: number }) {
  const cfg = {
    alto: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: `${count} uds` },
    bajo: { dot: 'bg-amber-400',   text: 'text-amber-400',   label: `${count} uds` },
    sin_stock: { dot: 'bg-zinc-600', text: 'text-zinc-500',  label: 'Sin stock' },
  }[nivel];

  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${nivel !== 'sin_stock' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}

/** Skeleton de tarjeta de producto */
function ProductCardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 animate-pulse space-y-3">
      <div className="w-full h-24 bg-zinc-800 rounded-xl" />
      <div className="space-y-2">
        <div className="h-3 bg-zinc-800 rounded w-3/4" />
        <div className="h-3 bg-zinc-800 rounded w-1/2" />
      </div>
      <div className="flex justify-between items-center">
        <div className="h-4 bg-zinc-800 rounded w-1/3" />
        <div className="h-7 w-7 bg-zinc-800 rounded-xl" />
      </div>
    </div>
  );
}

/** Tarjeta de producto individual */
function ProductCard({
  product,
  onAddToCart,
}: {
  product: ProductWithStock;
  onAddToCart: (product: ProductWithStock) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const sinStock = product.nivelStock === 'sin_stock';

  return (
    <div
      className={`bg-zinc-900 border rounded-2xl p-3.5 flex flex-col gap-2.5 transition-all active:scale-[0.98] ${
        sinStock ? 'border-zinc-800 opacity-60' : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Imagen del producto */}
      <div className="w-full h-24 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden relative">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.nombre}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <Package className="w-8 h-8 text-zinc-600" />
        )}
        {/* Badge de categoría */}
        {product.categoriaNombre && (
          <span className="absolute top-1.5 left-1.5 bg-zinc-950/70 text-zinc-400 text-[9px] font-semibold px-1.5 py-0.5 rounded-lg backdrop-blur-sm">
            {product.categoriaNombre}
          </span>
        )}
      </div>

      {/* Info del producto */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-xs font-bold text-zinc-100 leading-tight line-clamp-2">
          {product.nombre}
        </p>
        {product.marca && (
          <p className="text-[10px] text-zinc-500 font-medium">{product.marca}</p>
        )}
      </div>

      {/* Precio y acciones */}
      <div className="flex items-end justify-between gap-2 mt-auto">
        <div className="space-y-0.5">
          {product.precioOferta ? (
            <div className="flex items-baseline gap-1.5">
              <p className="text-sm font-black text-emerald-400">
                ${product.precioOferta.toLocaleString('es-CL')}
              </p>
              <p className="text-[10px] text-zinc-500 line-through">
                ${(product.precioPublico ?? product.precioBase).toLocaleString('es-CL')}
              </p>
            </div>
          ) : (
            <p className="text-sm font-black text-white">
              ${(product.precioPublico ?? product.precioBase).toLocaleString('es-CL')}
            </p>
          )}
          <StockBadge nivel={product.nivelStock} count={product.stockDisponible} />
        </div>

        <button
          onClick={() => onAddToCart(product)}
          disabled={sinStock}
          aria-label={`Agregar ${product.nombre} al carrito`}
          className="p-2 bg-brand-600 hover:bg-brand-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-all active:scale-90 shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function CatalogoPage() {
  const {
    products,
    isLoading,
    lastSync,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedBrand,
    setSelectedBrand,
    onlyWithStock,
    setOnlyWithStock,
    categories,
    brands,
    page,
    setPage,
    totalProducts,
    triggerCatalogSync,
    isSyncing,
  } = useCatalog({ pageSize: 40 });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto-focus al search al montar
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleAddToCart = (_product: ProductWithStock) => {
    // Por ahora incrementa el contador local; en Paso 4 se integrará con el módulo de pedidos
    setCartCount((c) => c + 1);
  };

  const lastSyncLabel = lastSync
    ? lastSync.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Nunca';

  const activeFilters = [selectedCategory, selectedBrand, onlyWithStock ? 'stock' : null].filter(Boolean).length;

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">

      {/* ── Cabecera sticky del Catálogo ── */}
      <div className="sticky top-14 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3 space-y-2.5">
        {/* Título + última sync */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Catálogo</h2>
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Clock className="w-3 h-3" />
              Sync: {lastSyncLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Carrito rápido */}
            {cartCount > 0 && (
              <div className="relative">
                <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full border border-zinc-950">
                  {cartCount}
                </span>
              </div>
            )}

            {/* Botón de sincronización manual */}
            <button
              onClick={triggerCatalogSync}
              disabled={isSyncing || !navigator.onLine}
              aria-label="Sincronizar catálogo"
              className="p-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 rounded-xl text-zinc-300 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-brand-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            ref={searchRef}
            type="search"
            inputMode="search"
            placeholder="Buscar por nombre, código o marca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-brand-600 rounded-2xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-600/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle de filtros */}
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
          {activeFilters > 0 && (
            <span className="bg-brand-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {activeFilters}
            </span>
          )}
          {filtersOpen ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
        </button>

        {/* Panel de filtros expandible */}
        {filtersOpen && (
          <div className="space-y-3 animate-fade-in pb-1">
            {/* Filtro: Categoría */}
            {categories.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Categoría</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${
                      !selectedCategory
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    Todas
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-brand-600 border-brand-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {cat.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtro: Marca */}
            {brands.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Marca</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedBrand(null)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${
                      !selectedBrand
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    Todas
                  </button>
                  {brands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
                      className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${
                        selectedBrand === brand
                          ? 'bg-brand-600 border-brand-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtro: Solo con stock */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setOnlyWithStock(!onlyWithStock)}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                  onlyWithStock ? 'bg-brand-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    onlyWithStock ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="text-xs font-medium text-zinc-300">Solo con stock disponible</span>
            </label>
          </div>
        )}
      </div>

      {/* ── Contador de resultados ── */}
      <div className="px-4 py-2 flex items-center justify-between">
        <p className="text-[11px] text-zinc-500 font-medium">
          {isLoading ? 'Cargando...' : `${totalProducts} producto${totalProducts !== 1 ? 's' : ''}`}
        </p>
        {activeFilters > 0 && (
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSelectedBrand(null);
              setOnlyWithStock(false);
              setSearchQuery('');
            }}
            className="text-[11px] text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ── Grid de productos ── */}
      <div className="flex-1 px-4 pb-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-sm font-bold text-zinc-300 mb-1">
              {searchQuery || activeFilters > 0 ? 'Sin resultados' : 'Catálogo vacío'}
            </p>
            <p className="text-xs text-zinc-500 max-w-xs">
              {searchQuery || activeFilters > 0
                ? 'Prueba con otro término o ajusta los filtros.'
                : 'El catálogo se descargará automáticamente al conectar. Puedes forzarlo con el botón de sincronización.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>

            {/* Paginación */}
            {totalProducts > 40 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 disabled:opacity-40 hover:bg-zinc-800 transition-all"
                >
                  Anterior
                </button>
                <span className="text-xs text-zinc-500 font-medium">Pág. {page}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * 40 >= totalProducts}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 disabled:opacity-40 hover:bg-zinc-800 transition-all"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
