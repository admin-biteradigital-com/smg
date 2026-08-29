import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchJornadaActiva } from '@/lib/api';
import { ApiRequestError } from '@/lib/api';
import type { Jornada, StockVehiculoItem as StockVehiculoItemBackend } from '@/types';

// ─── Tipos del contexto ──────────────────────────────────────────────────────
// Tipos normalizados para consumo en las escenas del Modo Jornada.
// Se mapean desde el tipo Jornada del backend al montar.

export interface StockVehiculoItem {
  idLote: number;
  idProducto: number;
  codigoProducto: string;
  nombreProducto: string;
  cantidadCargada: number;
  cantidadDisponible: number;
  unidadMedida: string;
  numeroLote: string;
  fechaVencimiento: string;
}

export interface JornadaActiva {
  id: number;
  idVehiculo: number;
  vehiculoPatente: string;
  vehiculoDescripcion: string;
  idRuta: number | null;
  rutaNombre: string;
  horaApertura: string;
  stockVehiculo: StockVehiculoItem[];
}

export interface JornadaContextValue {
  jornada: JornadaActiva | null;
  loading: boolean;
  error: string | null;
  refreshJornada: () => Promise<void>;
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const JornadaContext = createContext<JornadaContextValue | undefined>(undefined);

interface JornadaBackendResponse extends Jornada {
  vehiculoPatente?: string;
  vehiculoDescripcion?: string;
  rutaNombre?: string | null;
}

function mapJornadaToActiva(data: JornadaBackendResponse): JornadaActiva {
  const mappedStock: StockVehiculoItem[] = (data.stockVehiculo ?? []).map(
    (s: StockVehiculoItemBackend) => ({
      idLote: s.id,
      idProducto: s.idProducto,
      codigoProducto: s.productoCodigo ?? '',
      nombreProducto: s.productoNombre ?? `Producto #${s.idProducto}`,
      cantidadCargada: s.cantidad,
      cantidadDisponible: s.cantidad,
      unidadMedida: 'unidad',
      numeroLote: s.numeroLote,
      fechaVencimiento: s.fechaVencimiento ?? '',
    })
  );

  return {
    id: data.id,
    idVehiculo: data.idVehiculo,
    vehiculoPatente: data.vehiculoPatente ?? '',
    vehiculoDescripcion: data.vehiculoDescripcion ?? '',
    idRuta: data.idRuta,
    rutaNombre: data.rutaNombre ?? '',
    horaApertura: data.fechaApertura ?? '',
    stockVehiculo: mappedStock,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function JornadaProvider({ children }: { children: React.ReactNode }) {
  const [jornada, setJornada] = useState<JornadaActiva | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshJornada = useCallback(async () => {
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchJornadaActiva();

      if (res.data && res.data.id) {
        setJornada(mapJornadaToActiva(res.data));
      } else {
        setJornada(null);
      }
    } catch (err: unknown) {
      // 404 o sin jornada activa no es un error fatal, simplemente no hay jornada
      if (err instanceof ApiRequestError && err.status === 404) {
        setJornada(null);
      } else {
        const message =
          err instanceof Error ? err.message : 'Error al obtener estado de la jornada';
        console.warn('[JornadaContext] Error al consultar jornada activa:', err);
        setError(message);
        setJornada(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshJornada();
  }, [refreshJornada]);

  return (
    <JornadaContext.Provider
      value={{
        jornada,
        loading,
        error,
        refreshJornada,
      }}
    >
      {children}
    </JornadaContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useJornada(): JornadaContextValue {
  const context = useContext(JornadaContext);
  if (!context) {
    throw new Error('useJornada debe ser usado dentro de un JornadaProvider');
  }
  return context;
}
