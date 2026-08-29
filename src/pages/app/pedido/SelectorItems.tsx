import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  Check,
  X,
  Minus,
  Plus,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import { useCatalog, type ProductWithStock } from '@/hooks/useCatalog';
import { useBorradorPedido } from '@/hooks/useBorradorPedido';

// ─── Tarjeta de producto para selección ───────────────────────────────────────

function ProductoSelectorCard({
  product,
  cantidad,
  onCantidadChange,
}: {
  product: ProductWithStock;
  cantidad: number;
  onCantidadChange: (id: string, cantidad: number) => void;
}) {
  const sinStock = product.nivelStock === 'sin_stock';
  const sobreStock =
    product.stockDisponible > 0 && cantidad > product.stockDisponible;

  const dotColor =
    product.nivelStock === 'alto'
      ? 'bg-emerald-400'
      : product.nivelStock === 'bajo'
      ? 'bg-amber-400'
      : 'bg-zinc-600';

  return (
    <div
      className={`bg-zinc-900 border rounded-2xl p-3.5 flex flex-col gap-3 transition-all ${
        cantidad > 0
          ? 'border-brand-500/50 ring-1 ring-brand-600/30'
          : sinStock
          ? 'border-zinc-800 opacity-60'
          : 'border-zinc-800'
      }`}
    >
      {/* Info del producto */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-zinc-100 leading-tight line-clamp-2">
            {product.nombre}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{product.codigo}</p>
        </div>
        {cantidad > 0 && (
          <span className="bg-brand-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg shrink-0">
            ✓ {cantidad}
          </span>
        )}
      </div>

      {/* Precio y stock */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-white">
          ${product.precioBase.toLocaleString('es-CL')}
        </p>
        <span className={`flex items-center gap-1 text-[10px] font-semibold ${
          sinStock ? 'text-zinc-500' : sobreStock ? 'text-amber-400' : 'text-zinc-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          {sinStock ? 'Sin stock' : `${product.stockDisponible} uds`}
          {sobreStock && ' ⚠'}
        </span>
      </div>

      {/* Stepper — touch targets ≥ 44px */}
      <div className="flex items-center gap-2 bg-zinc-800 rounded-2xl p-1">
        <button
          onClick={() => onCantidadChange(product.id, cantidad - 1)}
          disabled={cantidad === 0}
          aria-label="Reducir"
          className="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30 rounded-xl transition-all active:scale-90"
        >
          {cantidad === 1 ? <X className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
        </button>
        <span className="flex-1 text-center text-sm font-bold text-white tabular-nums">
          {cantidad === 0 ? '—' : cantidad}
        </span>
        <button
          onClick={() => onCantidadChange(product.id, cantidad + 1)}
          aria-label="Aumentar"
          className="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-xl transition-all active:scale-90"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Página SelectorItems ─────────────────────────────────────────────────────

export default function SelectorItemsPage() {
  const navigate = useNavigate();
  const {
    products,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    totalProducts,
    page,
    setPage,
  } = useCatalog({ pageSize: 30 });

  const { borrador, getCantidadEnBorrador, actualizarCantidad, agregarProducto } =
    useBorradorPedido();

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Cantidad total de items en borrador (para el badge del header)
  const totalItemsEnBorrador = borrador.lineas.reduce((acc, l) => acc + l.cantidad, 0);
  const productosDistintosEnBorrador = borrador.lineas.length;

  const handleCantidadChange = (product: ProductWithStock, nuevaCantidad: number) => {
    const cantidadActual = getCantidadEnBorrador(product.id);

    if (nuevaCantidad <= 0 && cantidadActual > 0) {
      // Eliminar del borrador
      actualizarCantidad(product.id, 0);
    } else if (cantidadActual === 0 && nuevaCantidad > 0) {
      // Agregar nuevo producto al borrador
      agregarProducto(product, nuevaCantidad);
    } else {
      // Actualizar cantidad existente
      actualizarCantidad(product.id, nuevaCantidad);
    }
  };

  const handleListo = () => {
    navigate('/pedidos/nuevo', { replace: true });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] pb-24">
      {/* Cabecera sticky */}
      <div className="sticky top-14 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Agregar Productos</h2>
            {productosDistintosEnBorrador > 0 && (
              <p className="text-[10px] text-brand-400 font-semibold">
                {productosDistintosEnBorrador} producto{productosDistintosEnBorrador !== 1 ? 's' : ''} ·{' '}
                {totalItemsEnBorrador} uds. en borrador
              </p>
            )}
          </div>
          <button
            onClick={handleListo}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            Listo
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="search"
            inputMode="search"
            placeholder="Buscar producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-brand-600 rounded-2xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-600/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle filtros */}
        {categories.length > 0 && (
          <>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Categorías
              {filtersOpen ? (
                <ChevronUp className="w-3.5 h-3.5 ml-auto" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
              )}
            </button>

            {filtersOpen && (
              <div className="flex flex-wrap gap-2 pb-1">
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
                    onClick={() =>
                      setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
                    }
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
            )}
          </>
        )}
      </div>

      {/* Contador */}
      <div className="px-4 py-2">
        <p className="text-[11px] text-zinc-500 font-medium">
          {isLoading ? 'Cargando...' : `${totalProducts} producto${totalProducts !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Grid de productos */}
      <div className="flex-1 px-4 space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 animate-pulse space-y-3 h-44"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="w-10 h-10 text-zinc-700 mb-3" />
            <p className="text-sm font-bold text-zinc-300 mb-1">Sin resultados</p>
            <p className="text-xs text-zinc-500">Prueba con otro término de búsqueda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => {
                const cantidadActual = getCantidadEnBorrador(product.id);
                return (
                  <ProductoSelectorCard
                    key={product.id}
                    product={product}
                    cantidad={cantidadActual}
                    onCantidadChange={(_id, c) => handleCantidadChange(product, c)}
                  />
                );
              })}
            </div>

            {/* Paginación */}
            {totalProducts > 30 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 disabled:opacity-40 hover:bg-zinc-800 transition-all"
                >
                  Anterior
                </button>
                <span className="text-xs text-zinc-500">Pág. {page}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * 30 >= totalProducts}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 disabled:opacity-40 hover:bg-zinc-800 transition-all"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer flotante con botón Listo */}
      {productosDistintosEnBorrador > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-2">
          <button
            onClick={handleListo}
            className="w-full max-w-lg mx-auto flex items-center justify-between bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 px-5 rounded-2xl shadow-xl shadow-brand-950/30 transition-all active:scale-[0.98]"
          >
            <span className="text-sm">Aplicar selección</span>
            <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-lg">
              {productosDistintosEnBorrador} prod · {totalItemsEnBorrador} uds
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
