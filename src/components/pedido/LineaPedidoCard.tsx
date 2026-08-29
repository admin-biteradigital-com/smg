import { Minus, Plus, Trash2 } from 'lucide-react';
import type { LineaPedidoLocal } from '@/types';

interface LineaPedidoCardProps {
  linea: LineaPedidoLocal;
  onCantidadChange: (id_producto: string, cantidad: number) => void;
  onEliminar: (id_producto: string) => void;
  stockDisponible?: number;
  readonly?: boolean;
}

export function LineaPedidoCard({
  linea,
  onCantidadChange,
  onEliminar,
  stockDisponible,
  readonly = false,
}: LineaPedidoCardProps) {
  const sobrepasaStock =
    stockDisponible !== undefined && linea.cantidad > stockDisponible && stockDisponible > 0;

  return (
    <div
      className={`bg-zinc-900 border rounded-2xl p-4 flex flex-col gap-3 transition-all ${
        sobrepasaStock ? 'border-amber-500/40' : 'border-zinc-800'
      }`}
    >
      {/* Encabezado de línea */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-100 leading-tight line-clamp-2">
            {linea.nombre_producto}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{linea.codigo_producto}</p>
          {sobrepasaStock && (
            <p className="text-[10px] text-amber-400 mt-1 font-semibold">
              ⚠ Stock disponible: {stockDisponible} uds.
            </p>
          )}
        </div>

        {!readonly && (
          <button
            onClick={() => onEliminar(linea.id_producto)}
            aria-label={`Eliminar ${linea.nombre_producto}`}
            className="p-2 text-zinc-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Precio y Stepper */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-400 leading-none">Precio unit.</p>
          <p className="text-sm font-semibold text-zinc-200 mt-0.5">
            ${linea.precio_unitario.toLocaleString('es-CL')}
          </p>
        </div>

        {!readonly ? (
          // Stepper editable — touch targets >= 44px
          <div className="flex items-center gap-2 bg-zinc-800 rounded-2xl p-1">
            <button
              onClick={() => onCantidadChange(linea.id_producto, linea.cantidad - 1)}
              aria-label="Reducir cantidad"
              className="w-9 h-9 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-xl transition-all active:scale-90"
            >
              <Minus className="w-4 h-4" />
            </button>

            <span className="w-8 text-center text-sm font-bold text-white tabular-nums">
              {linea.cantidad}
            </span>

            <button
              onClick={() => onCantidadChange(linea.id_producto, linea.cantidad + 1)}
              aria-label="Aumentar cantidad"
              className="w-9 h-9 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-xl transition-all active:scale-90"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">
            <span className="font-bold text-zinc-200">{linea.cantidad}</span> uds.
          </p>
        )}

        <div className="text-right">
          <p className="text-xs text-zinc-400 leading-none">Subtotal</p>
          <p className="text-sm font-bold text-white mt-0.5">
            ${linea.subtotal.toLocaleString('es-CL')}
          </p>
        </div>
      </div>
    </div>
  );
}
