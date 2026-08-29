import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { db } from '@/lib/db';
import type { BorradorPedido, LineaPedidoLocal } from '@/types';
import type { Cliente } from '@/types';

// ─── Estado ───────────────────────────────────────────────────────────────────

interface PedidoState {
  cliente: Cliente | null;
  lineas: LineaPedidoLocal[];
  notas: string;
  borradorId: number | null;   // ID de la fila en Dexie (null = aún no persistido)
}

const initialState: PedidoState = {
  cliente: null,
  lineas: [],
  notas: '',
  borradorId: null,
};

// ─── Acciones ────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_CLIENTE'; payload: Cliente | null }
  | { type: 'AGREGAR_LINEA'; payload: LineaPedidoLocal }
  | { type: 'ACTUALIZAR_CANTIDAD'; payload: { id_producto: string; cantidad: number } }
  | { type: 'ELIMINAR_LINEA'; payload: string }
  | { type: 'SET_NOTAS'; payload: string }
  | { type: 'SET_BORRADOR_ID'; payload: number }
  | { type: 'LIMPIAR_PEDIDO' }
  | { type: 'CARGAR_BORRADOR'; payload: PedidoState };

function reducer(state: PedidoState, action: Action): PedidoState {
  switch (action.type) {
    case 'SET_CLIENTE':
      return { ...state, cliente: action.payload };

    case 'AGREGAR_LINEA': {
      const idx = state.lineas.findIndex(
        (l) => l.id_producto === action.payload.id_producto,
      );
      if (idx >= 0) {
        // Si ya existe, sumar cantidad
        const updated = [...state.lineas];
        updated[idx] = {
          ...updated[idx],
          cantidad: updated[idx].cantidad + action.payload.cantidad,
          subtotal:
            (updated[idx].cantidad + action.payload.cantidad) *
            updated[idx].precio_unitario,
        };
        return { ...state, lineas: updated };
      }
      return { ...state, lineas: [...state.lineas, action.payload] };
    }

    case 'ACTUALIZAR_CANTIDAD': {
      const { id_producto, cantidad } = action.payload;
      if (cantidad <= 0) {
        return {
          ...state,
          lineas: state.lineas.filter((l) => l.id_producto !== id_producto),
        };
      }
      return {
        ...state,
        lineas: state.lineas.map((l) =>
          l.id_producto === id_producto
            ? { ...l, cantidad, subtotal: cantidad * l.precio_unitario }
            : l,
        ),
      };
    }

    case 'ELIMINAR_LINEA':
      return {
        ...state,
        lineas: state.lineas.filter((l) => l.id_producto !== action.payload),
      };

    case 'SET_NOTAS':
      return { ...state, notas: action.payload };

    case 'SET_BORRADOR_ID':
      return { ...state, borradorId: action.payload };

    case 'LIMPIAR_PEDIDO':
      return { ...initialState };

    case 'CARGAR_BORRADOR':
      return action.payload;

    default:
      return state;
  }
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

interface PedidoContextType {
  state: PedidoState;
  totalPedido: number;
  puedeConfirmar: boolean;
  setCliente: (cliente: Cliente | null) => void;
  agregarLinea: (linea: LineaPedidoLocal) => void;
  actualizarCantidad: (id_producto: string, cantidad: number) => void;
  eliminarLinea: (id_producto: string) => void;
  setNotas: (notas: string) => void;
  limpiarPedido: () => Promise<void>;
}

const PedidoContext = createContext<PedidoContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PedidoActivoProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: number;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al montar: cargar el borrador más reciente del vendedor actual
  useEffect(() => {
    async function hydrate() {
      const borrador = await db.borradores_pedido
        .where('id_vendedor')
        .equals(userId)
        .and((b) => b.estado === 'borrador')
        .last();

      if (!borrador) return;

      // Necesitamos reconstruir el cliente desde Dexie si está guardado el id
      let cliente: Cliente | null = null;
      if (borrador.id_cliente) {
        cliente = (await db.clientes.get(borrador.id_cliente)) ?? null;
      }

      dispatch({
        type: 'CARGAR_BORRADOR',
        payload: {
          cliente,
          lineas: borrador.lineas,
          notas: borrador.notas,
          borradorId: borrador.id ?? null,
        },
      });
    }

    hydrate().catch(console.error);
  }, [userId]);

  // Auto-guardado con debounce de 500ms en cada cambio de estado relevante
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      const borrador: BorradorPedido = {
        id: state.borradorId ?? undefined,
        id_vendedor: userId,
        id_cliente: state.cliente?.id ?? null,
        nombre_cliente: state.cliente?.razonSocial ?? null,
        lineas: state.lineas,
        notas: state.notas,
        estado: 'borrador',
        fecha_creacion: state.borradorId
          ? (await db.borradores_pedido.get(state.borradorId))?.fecha_creacion ??
            new Date().toISOString()
          : new Date().toISOString(),
        fecha_modificacion: new Date().toISOString(),
      };

      if (state.borradorId != null) {
        await db.borradores_pedido.put(borrador);
      } else if (state.lineas.length > 0 || state.cliente !== null) {
        // Solo crear el borrador si hay algo que guardar
        const newId = await db.borradores_pedido.add(borrador);
        dispatch({ type: 'SET_BORRADOR_ID', payload: newId as number });
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.cliente, state.lineas, state.notas, state.borradorId, userId]);

  const totalPedido = state.lineas.reduce((acc, l) => acc + l.subtotal, 0);
  const puedeConfirmar = state.cliente !== null && state.lineas.length > 0;

  const setCliente = useCallback((cliente: Cliente | null) => {
    dispatch({ type: 'SET_CLIENTE', payload: cliente });
  }, []);

  const agregarLinea = useCallback((linea: LineaPedidoLocal) => {
    dispatch({ type: 'AGREGAR_LINEA', payload: linea });
  }, []);

  const actualizarCantidad = useCallback((id_producto: string, cantidad: number) => {
    dispatch({ type: 'ACTUALIZAR_CANTIDAD', payload: { id_producto, cantidad } });
  }, []);

  const eliminarLinea = useCallback((id_producto: string) => {
    dispatch({ type: 'ELIMINAR_LINEA', payload: id_producto });
  }, []);

  const setNotas = useCallback((notas: string) => {
    dispatch({ type: 'SET_NOTAS', payload: notas });
  }, []);

  const limpiarPedido = useCallback(async () => {
    if (state.borradorId != null) {
      await db.borradores_pedido.delete(state.borradorId);
    }
    dispatch({ type: 'LIMPIAR_PEDIDO' });
  }, [state.borradorId]);

  return (
    <PedidoContext.Provider
      value={{
        state,
        totalPedido,
        puedeConfirmar,
        setCliente,
        agregarLinea,
        actualizarCantidad,
        eliminarLinea,
        setNotas,
        limpiarPedido,
      }}
    >
      {children}
    </PedidoContext.Provider>
  );
}

export function usePedidoActivo(): PedidoContextType {
  const context = useContext(PedidoContext);
  if (!context) {
    throw new Error('usePedidoActivo debe usarse dentro de PedidoActivoProvider');
  }
  return context;
}
