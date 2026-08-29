import { useCallback } from 'react';
import { usePedidoActivo } from '@/store/pedidoActivo';
import type { LineaPedidoLocal } from '@/types';
import type { ProductWithStock } from '@/hooks/useCatalog';
import type { Cliente } from '@/types';

// ─── Hook useBorradorPedido ───────────────────────────────────────────────────
// Wrapper de conveniencia sobre usePedidoActivo que expone
// helpers de alto nivel para las pantallas del flujo de pedidos.

export function useBorradorPedido() {
  const {
    state,
    totalPedido,
    puedeConfirmar,
    setCliente,
    agregarLinea,
    actualizarCantidad,
    eliminarLinea,
    setNotas,
    limpiarPedido,
  } = usePedidoActivo();

  /** Agrega o actualiza un producto desde el catálogo al borrador */
  const agregarProducto = useCallback(
    (product: ProductWithStock, cantidad: number) => {
      if (cantidad <= 0) return;
      const linea: LineaPedidoLocal = {
        id_producto: product.id,
        nombre_producto: product.nombre,
        codigo_producto: product.codigo,
        cantidad,
        precio_unitario: product.precioBase,
        subtotal: cantidad * product.precioBase,
      };
      agregarLinea(linea);
    },
    [agregarLinea],
  );

  /** Retorna la cantidad actualmente en el borrador para un producto dado */
  const getCantidadEnBorrador = useCallback(
    (id_producto: string): number => {
      return (
        state.lineas.find((l) => l.id_producto === id_producto)?.cantidad ?? 0
      );
    },
    [state.lineas],
  );

  /** Seleccionar cliente */
  const seleccionarCliente = useCallback(
    (cliente: Cliente) => {
      setCliente(cliente);
    },
    [setCliente],
  );

  return {
    borrador: state,
    totalPedido,
    puedeConfirmar,
    cantidadLineas: state.lineas.length,
    agregarProducto,
    getCantidadEnBorrador,
    actualizarCantidad,
    eliminarLinea,
    seleccionarCliente,
    limpiarCliente: () => setCliente(null),
    setNotas,
    limpiarPedido,
  };
}
