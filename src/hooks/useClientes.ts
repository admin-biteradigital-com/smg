import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/db';
import { onSyncStatusChange } from '@/lib/sync';
import type { Cliente, Sucursal, Pedido, VentaCobro } from '@/types';

export interface EnrichedCliente extends Cliente {
  sucursalesCount: number;
}

export interface DetalleCliente {
  cliente: Cliente;
  sucursales: Sucursal[];
  pedidos: Pedido[];
  cobros: VentaCobro[];
  totalVendido: number;
  totalCobrado: number;
  totalPendiente: number;
}

export interface UseClientesReturn {
  clientes: EnrichedCliente[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedTipo: string | null;
  setSelectedTipo: (t: string | null) => void;
  selectedEstado: string | null;
  setSelectedEstado: (e: string | null) => void;
  obtenerDetalleCliente: (clienteId: string) => Promise<DetalleCliente | null>;
  recargarClientes: () => Promise<void>;
}

/** Normaliza un texto para búsqueda: minúsculas, sin tildes */
function normalizeSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function useClientes(): UseClientesReturn {
  const [allClientes, setAllClientes] = useState<EnrichedCliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);

  // Carga masiva de datos desde IndexedDB
  const loadFromDB = useCallback(async () => {
    setIsLoading(true);
    try {
      const [clientesDB, sucursalesDB] = await Promise.all([
        db.clientes.toArray(),
        db.sucursales.toArray(),
      ]);

      // Contar sucursales por cliente
      const sucursalesMap = new Map<string, number>();
      for (const suc of sucursalesDB) {
        const prev = sucursalesMap.get(suc.clienteId) ?? 0;
        sucursalesMap.set(suc.clienteId, prev + 1);
      }

      const enriched: EnrichedCliente[] = clientesDB.map((c) => ({
        ...c,
        sucursalesCount: sucursalesMap.get(c.id) ?? 0,
      }));

      setAllClientes(enriched);
    } catch (err) {
      console.error('[useClientes] Error al cargar clientes desde DB local:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Filtrado local en memoria
  const filteredClientes = useMemo(() => {
    let result = [...allClientes];

    // Filtro por texto (RUT, Razón Social, Nombre Fantasía)
    if (searchQuery.trim()) {
      const normalizedQuery = normalizeSearch(searchQuery);
      result = result.filter((c) => {
        const matchRut = c.rut && normalizeSearch(c.rut).includes(normalizedQuery);
        const matchRazon = c.razonSocial && normalizeSearch(c.razonSocial).includes(normalizedQuery);
        const matchFantasia = c.nombreFantasia && normalizeSearch(c.nombreFantasia).includes(normalizedQuery);
        return matchRut || matchRazon || matchFantasia;
      });
    }

    // Filtro por tipo de cliente
    if (selectedTipo) {
      result = result.filter((c) => c.tipo === selectedTipo);
    }

    // Filtro por estado del cliente
    if (selectedEstado) {
      result = result.filter((c) => c.estado === selectedEstado);
    }

    // Ordenar alfabéticamente por Razón Social
    return result.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
  }, [allClientes, searchQuery, selectedTipo, selectedEstado]);

  // Obtener detalle completo de un cliente (sucursales, pedidos e historial financiero)
  const obtenerDetalleCliente = useCallback(async (clienteId: string): Promise<DetalleCliente | null> => {
    try {
      const cliente = await db.clientes.get(clienteId);
      if (!cliente) return null;

      const [sucursales, pedidos, cobros] = await Promise.all([
        db.sucursales.where('clienteId').equals(clienteId).toArray(),
        db.pedidos.where('clienteId').equals(clienteId).toArray(),
        db.ventas_cobros.where('clienteId').equals(clienteId).toArray(),
      ]);

      // Cálculos financieros
      const totalVendido = pedidos.reduce((acc, p) => acc + (p.total ?? 0), 0);
      const totalCobrado = cobros
        .filter((c) => c.estado === 'cobrado')
        .reduce((acc, c) => acc + (c.monto ?? 0), 0);

      const totalPendiente = cobros
        .filter((c) => c.estado === 'pendiente' || c.estado === 'parcial')
        .reduce((acc, c) => acc + (c.monto ?? 0), 0); // Ajustar si hay lógica parcial más compleja

      return {
        cliente,
        sucursales,
        pedidos: pedidos.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), // Más recientes primero
        cobros: cobros.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        totalVendido,
        totalCobrado,
        totalPendiente,
      };
    } catch (err) {
      console.error(`[useClientes] Error al obtener detalle del cliente ${clienteId}:`, err);
      return null;
    }
  }, []);

  return {
    clientes: filteredClientes,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedTipo,
    setSelectedTipo,
    selectedEstado,
    setSelectedEstado,
    obtenerDetalleCliente,
    recargarClientes: loadFromDB,
  };
}
