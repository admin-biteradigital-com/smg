import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchJornadaActiva } from '@/lib/api';
import { ApiRequestError } from '@/lib/api';
import { db } from '@/lib/db';
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
  id: string;
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
    setLoading(true);
    setError(null);

    // 1. Si hay conexión, intentar consultar la verdad del servidor
    if (navigator.onLine) {
      try {
        const res = await fetchJornadaActiva();

        if (res.data && res.data.id) {
          // Persistir jornada activa en Dexie
          await db.jornadas.put(res.data);
          setJornada(mapJornadaToActiva(res.data));
          setLoading(false);
          return;
        } else {
          // Servidor indica sin jornada activa
          setJornada(null);
          setLoading(false);
          return;
        }
      } catch (err: unknown) {
        if (err instanceof ApiRequestError && err.status === 404) {
          setJornada(null);
          setLoading(false);
          return;
        }
        console.warn('[JornadaContext] Error al consultar servidor, intentando Dexie:', err);
      }
    }

    // 2. Si no hay red (o fallo de conexión), resolver desde Dexie local
    try {
      const localJornada = await db.jornadas.where('estado').equals('abierta').first();
      if (localJornada) {
        // Enriquecer datos de vehículo y ruta si faltan en el registro local
        if (!localJornada.vehiculoPatente && localJornada.idVehiculo) {
          const veh = await db.vehiculos.get(localJornada.idVehiculo);
          if (veh) {
            localJornada.vehiculoPatente = veh.patente;
            localJornada.vehiculoDescripcion = [veh.marca, veh.modelo].filter(Boolean).join(' ') || undefined;
          }
        }
        if (!localJornada.rutaNombre && localJornada.idRuta) {
          const ruta = await db.rutas.get(localJornada.idRuta);
          if (ruta) {
            localJornada.rutaNombre = ruta.nombre;
          }
        }
        setJornada(mapJornadaToActiva(localJornada));
      } else {
        setJornada(null);
      }
    } catch (dbErr) {
      console.error('[JornadaContext] Error al leer jornada de Dexie:', dbErr);
      setError('Error al consultar almacenamiento local.');
      setJornada(null);
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
