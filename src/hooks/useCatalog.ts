import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/db';
import { syncCatalog, onSyncStatusChange } from '@/lib/sync';
import type { Producto, Categoria } from '@/types';

// ─── Tipos extendidos del hook ────────────────────────────────────────────────

/** Producto enriquecido con stock calculado y categoría resuelta. */
export interface ProductWithStock extends Producto {
  /** Stock actual de todos los lotes, menos unidades comprometidas en cola offline */
  stockDisponible: number;
  /** Nivel de stock para semáforo: 'alto' | 'bajo' | 'sin_stock' */
  nivelStock: 'alto' | 'bajo' | 'sin_stock';
  /** Nombre de categoría (si está cargada) */
  categoriaNombre?: string;
  /** Marca extraída del campo nombre o proveniente del servidor */
  marca?: string;
}

export interface UseCatalogOptions {
  pageSize?: number;
}

export interface UseCatalogReturn {
  products: ProductWithStock[];
  isLoading: boolean;
  lastSync: Date | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (c: string | null) => void;
  selectedBrand: string | null;
  setSelectedBrand: (b: string | null) => void;
  onlyWithStock: boolean;
  setOnlyWithStock: (v: boolean) => void;
  categories: Categoria[];
  brands: string[];
  page: number;
  setPage: (p: number) => void;
  totalProducts: number;
  triggerCatalogSync: () => Promise<void>;
  isSyncing: boolean;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STOCK_ALTO_UMBRAL = 20;
const CATALOG_SYNC_KEY = 'siglo_last_catalog_sync';
const BRANDS_KEY = 'siglo_brands';
const DEFAULT_PAGE_SIZE = 40;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNivelStock(stock: number): ProductWithStock['nivelStock'] {
  if (stock <= 0) return 'sin_stock';
  if (stock <= STOCK_ALTO_UMBRAL) return 'bajo';
  return 'alto';
}

/** Calcula las unidades comprometidas en la cola offline para cada productoId */
async function getComprometidosPorProducto(): Promise<Map<string, number>> {
  const comprometidos = new Map<string, number>();

  try {
    // Buscar en cola de operaciones pendientes de tipo CREATE_PEDIDO
    const pendingItems = await db.offline_queue
      .where('type')
      .equals('CREATE_PEDIDO')
      .toArray();

    for (const item of pendingItems) {
      if (!item.payload || typeof item.payload !== 'object') continue;
      const payload = item.payload as { lineas?: Array<{ productoId: string; cantidad: number }> };
      if (!Array.isArray(payload.lineas)) continue;

      for (const linea of payload.lineas) {
        const prev = comprometidos.get(linea.productoId) ?? 0;
        comprometidos.set(linea.productoId, prev + (linea.cantidad ?? 0));
      }
    }
  } catch (err) {
    console.warn('[useCatalog] Error al calcular comprometidos offline:', err);
  }

  return comprometidos;
}

/** Normaliza un texto para búsqueda: minúsculas, sin tildes */
function normalizeSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCatalog({ pageSize = DEFAULT_PAGE_SIZE }: UseCatalogOptions = {}): UseCatalogReturn {
  const [allProducts, setAllProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [onlyWithStock, setOnlyWithStock] = useState(false);
  const [page, setPage] = useState(1);

  // Marcas cargadas de localStorage (las trae syncCatalog)
  const brands: string[] = useMemo(() => {
    try {
      const raw = localStorage.getItem(BRANDS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leer el timestamp de última sync
  const refreshLastSync = useCallback(() => {
    const raw = localStorage.getItem(CATALOG_SYNC_KEY);
    if (raw) {
      const ts = parseInt(raw, 10);
      if (!isNaN(ts)) setLastSync(new Date(ts));
    }
  }, []);

  // Carga masiva desde IndexedDB
  const loadFromDB = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productos, lotes, categoriasDB, comprometidos] = await Promise.all([
        db.productos.filter((p) => p.activo === true).toArray(),
        db.lotes.toArray(),
        db.categorias.toArray(),
        getComprometidosPorProducto(),
      ]);

      // Mapa de stock total por productoId
      const stockPorProducto = new Map<string, number>();
      for (const lote of lotes) {
        const prev = stockPorProducto.get(lote.productoId) ?? 0;
        stockPorProducto.set(lote.productoId, prev + (lote.stockActual ?? 0));
      }

      // Mapa de nombre de categoría
      const catMap = new Map<string, string>();
      for (const cat of categoriasDB) catMap.set(cat.id, cat.nombre);

      const enriched: ProductWithStock[] = productos.map((p) => {
        const stockBruto = stockPorProducto.get(p.id) ?? 0;
        const comprometido = comprometidos.get(p.id) ?? 0;
        const stockDisponible = Math.max(0, stockBruto - comprometido);
        return {
          ...p,
          stockDisponible,
          nivelStock: getNivelStock(stockDisponible),
          categoriaNombre: catMap.get(p.categoriaId),
        };
      });

      setAllProducts(enriched);
      setCategories(categoriasDB);
      refreshLastSync();
    } catch (err) {
      console.error('[useCatalog] Error al cargar desde IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, [refreshLastSync]);

  // Cargar al montar y en cambios de sincronización
  useEffect(() => {
    loadFromDB();
    const unsubscribe = onSyncStatusChange((status) => {
      if (status === 'online') {
        loadFromDB();
      }
    });
    return unsubscribe;
  }, [loadFromDB]);

  // Forzar sync manual
  const triggerCatalogSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncCatalog(true);
      await loadFromDB();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, loadFromDB]);

  // Reset de página al cambiar filtros
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, selectedBrand, onlyWithStock]);

  // Filtrado y búsqueda (en memoria, sin más queries a IndexedDB)
  const filteredProducts = useMemo(() => {
    const q = normalizeSearch(searchQuery.trim());

    return allProducts.filter((p) => {
      if (q) {
        const searchable = normalizeSearch(`${p.nombre} ${p.codigo} ${p.marca ?? ''} ${p.categoriaNombre ?? ''}`);
        if (!searchable.includes(q)) return false;
      }
      if (selectedCategory && p.categoriaId !== selectedCategory) return false;
      if (selectedBrand && (p.marca ?? '').toLowerCase() !== selectedBrand.toLowerCase()) return false;
      if (onlyWithStock && p.stockDisponible <= 0) return false;
      return true;
    });
  }, [allProducts, searchQuery, selectedCategory, selectedBrand, onlyWithStock]);

  // Paginación local
  const products = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  return {
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
    totalProducts: filteredProducts.length,
    triggerCatalogSync,
    isSyncing,
  };
}
