// @deprecated - reemplazado por ADR-012 (EscenaCargarVehiculo en src/pages/jornada/EscenaCargarVehiculo.tsx)
import { useEffect, useState } from 'react';
import {
  X,
  PackagePlus,
  Trash2,
  Plus,
  AlertCircle,
  WifiOff,
  Loader2,
  Box,
} from 'lucide-react';
import { api, cargarStockVehiculo } from '@/lib/api';
import type { CargaStockItemPayload, ResumenCargaStock } from '@/types';

interface DepositoStockItem {
  id: number;
  producto: { id: number; nombre: string };
  numeroLote: string;
  fechaVencimiento: string;
  cantidadActual: number;
  unidadBase: string;
}

interface ModalCargarStockProps {
  isOpen: boolean;
  idJornada: number;
  onClose: () => void;
  onSuccess: (resumen: ResumenCargaStock) => void;
}

interface ItemEnCarga {
  idProducto: number;
  nombreProducto: string;
  numeroLote: string;
  cantidad: number;
  maxDisponible?: number;
}

export function ModalCargarStock({
  isOpen,
  idJornada,
  onClose,
  onSuccess,
}: ModalCargarStockProps) {
  const [stockDeposito, setStockDeposito] = useState<DepositoStockItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Lista de items a cargar
  const [itemsCarga, setItemsCarga] = useState<ItemEnCarga[]>([]);
  const [observaciones, setObservaciones] = useState('');

  // Selector temporal para añadir fila
  const [selectedStockId, setSelectedStockId] = useState<number | ''>('');
  const [inputCantidad, setInputCantidad] = useState<number | ''>('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isOnline = navigator.onLine;

  useEffect(() => {
    if (!isOpen) return;

    setItemsCarga([]);
    setObservaciones('');
    setSelectedStockId('');
    setInputCantidad('');
    setSubmitError(null);
    setLoadError(null);

    async function loadStock() {
      setLoadingStock(true);
      try {
        // Intentar consultar stock en depósito
        const res = await api.get<{ data: DepositoStockItem[] }>('/api/v1/stock');
        const items = res.data || [];
        setStockDeposito(items);
        if (items.length > 0) {
          setSelectedStockId(items[0].id);
        }
      } catch (err: unknown) {
        console.warn('[ModalCargarStock] No se pudo obtener stock de depósito:', err);
        setLoadError('No se pudo obtener la lista de stock disponible en depósito.');
      } finally {
        setLoadingStock(false);
      }
    }

    if (isOnline) {
      loadStock();
    }
  }, [isOpen, isOnline]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (selectedStockId === '') return;
    const stockItem = stockDeposito.find((s) => s.id === Number(selectedStockId));
    if (!stockItem) return;

    const qty = typeof inputCantidad === 'number' ? inputCantidad : 1;
    if (qty <= 0) return;

    // Verificar si ya existe en la lista
    const existingIndex = itemsCarga.findIndex(
      (item) => item.idProducto === stockItem.producto.id && item.numeroLote === stockItem.numeroLote
    );

    if (existingIndex >= 0) {
      const updated = [...itemsCarga];
      updated[existingIndex].cantidad += qty;
      setItemsCarga(updated);
    } else {
      setItemsCarga([
        ...itemsCarga,
        {
          idProducto: stockItem.producto.id,
          nombreProducto: stockItem.producto.nombre,
          numeroLote: stockItem.numeroLote,
          cantidad: qty,
          maxDisponible: stockItem.cantidadActual,
        },
      ]);
    }

    setInputCantidad('');
  };

  const handleRemoveItem = (index: number) => {
    setItemsCarga(itemsCarga.filter((_, i) => i !== index));
  };

  const handleUpdateCantidad = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...itemsCarga];
    updated[index].cantidad = newQty;
    setItemsCarga(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsCarga.length === 0) {
      setSubmitError('Debes agregar al menos un producto para realizar la carga.');
      return;
    }

    if (!isOnline) {
      setSubmitError('Se requiere conexión a internet para registrar la carga de stock.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const payloadItems: CargaStockItemPayload[] = itemsCarga.map((item) => ({
      idProducto: item.idProducto,
      numeroLote: item.numeroLote,
      cantidad: item.cantidad,
    }));

    try {
      const res = await cargarStockVehiculo(idJornada, {
        items: payloadItems,
        observaciones: observaciones.trim() || undefined,
      });

      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      console.error('[ModalCargarStock] Error al cargar stock:', err);
      setSubmitError(err.message || 'Error al procesar la carga de stock.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cargar Stock al Vehículo</h2>
              <p className="text-xs text-zinc-400">Transfiere productos desde el depósito a tu vehículo</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Advertencia Offline */}
          {!isOnline && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 text-amber-400">
              <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Sin conexión a internet</p>
                <p className="text-amber-400/80 mt-0.5">
                  La transferencia de stock actualiza el inventario en el servidor y requiere conexión activa.
                </p>
              </div>
            </div>
          )}

          {loadingStock ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-zinc-400">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
              <p className="text-xs">Consultando stock disponible en depósito...</p>
            </div>
          ) : (
            <>
              {/* Formulario de adición de items */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-emerald-400" />
                  Agregar Producto de Depósito
                </p>

                {stockDeposito.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    {loadError || 'No hay lotes con stock disponibles en el depósito.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={selectedStockId}
                      onChange={(e) => setSelectedStockId(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      {stockDeposito.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.producto.nombre} (Lote: {s.numeroLote} • Disp: {s.cantidadActual} {s.unidadBase})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Cantidad"
                        value={inputCantidad}
                        onChange={(e) => setInputCantidad(e.target.value ? Number(e.target.value) : '')}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de productos agregados a la carga */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Productos a Cargar ({itemsCarga.length})
                </p>

                {itemsCarga.length === 0 ? (
                  <div className="p-6 border border-dashed border-zinc-800 rounded-2xl text-center">
                    <p className="text-xs text-zinc-500">
                      No has agregado ningún producto a la orden de carga.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {itemsCarga.map((item, idx) => (
                      <div
                        key={`${item.idProducto}-${item.numeroLote}`}
                        className="p-3 bg-zinc-950/40 border border-zinc-800 rounded-xl flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-semibold text-zinc-200 truncate">
                            {item.nombreProducto}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono">
                            Lote: {item.numeroLote}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => handleUpdateCantidad(idx, Number(e.target.value))}
                            className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-center text-zinc-100 font-bold focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Observaciones de Carga <span className="text-zinc-500 text-[10px] lowercase font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej: Carga adicional para ruta matutina..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Error de envío */}
              {submitError && (
                <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3.5 text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs">{submitError}</p>
                </div>
              )}
            </>
          )}

          {/* Footer */}
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
              type="submit"
              disabled={submitting || itemsCarga.length === 0 || !isOnline}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                `Transferir ${itemsCarga.length} Ítem${itemsCarga.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
