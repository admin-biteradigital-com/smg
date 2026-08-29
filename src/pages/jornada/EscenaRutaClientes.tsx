import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Search,
  Truck,
  MapPin,
  UserCheck,
  ChevronRight,
  X,
  RefreshCw,
  LogOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useJornada } from '@/contexts/JornadaContext';
import JornadaLayout from '@/components/layout/JornadaLayout';
import { useClientes, type EnrichedCliente } from '@/hooks/useClientes';
import { db } from '@/lib/db';
import { runSync } from '@/lib/sync';
import { getClientesSaldosPendientes } from '@/lib/api';
import type { Sucursal } from '@/types';

// ─── Normalización para búsqueda ─────────────────────────────────────────────

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ─── EscenaRutaClientesPage ───────────────────────────────────────────────────
// Escena 3 del Modo Jornada: /jornada/ruta
// Muestra la lista de clientes disponibles para la ruta activa.
// Permite seleccionar un cliente + sucursal para navegar a /jornada/venta/:clienteId
// o a /jornada/cobro-pendiente/:clienteId si tiene deuda pendiente (ADR-013).

export default function EscenaRutaClientesPage() {
  const navigate = useNavigate();
  const { jornada, loading: jornadaLoading } = useJornada();
  const { clientes, isLoading: loadingClientes, recargarClientes } = useClientes();

  const [busqueda, setBusqueda] = useState('');
  const [sucursalesMap, setSucursalesMap] = useState<Record<string, Sucursal[]>>({});
  const [saldosMap, setSaldosMap] = useState<Map<string, number>>(new Map());
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Cargar sucursales de Dexie
  useEffect(() => {
    async function loadSucursales() {
      try {
        const todas = await db.sucursales.toArray();
        const map: Record<string, Sucursal[]> = {};
        for (const s of todas) {
          if (!map[s.clienteId]) {
            map[s.clienteId] = [];
          }
          map[s.clienteId].push(s);
        }
        setSucursalesMap(map);
      } catch (err) {
        console.error('[EscenaRutaClientes] Error al cargar sucursales:', err);
      }
    }
    loadSucursales();
  }, [clientes]);

  // Cargar saldos pendientes desde el backend (ADR-013)
  useEffect(() => {
    async function loadSaldos() {
      try {
        const res = await getClientesSaldosPendientes();
        const map = new Map<string, number>();
        if (res?.data && Array.isArray(res.data)) {
          for (const s of res.data) {
            map.set(String(s.idCliente), s.saldoPendienteTotal);
          }
        }
        setSaldosMap(map);
      } catch (err) {
        // Degradación silenciosa si no hay conexión o falla el endpoint
        console.error('[EscenaRutaClientes] Error al cargar saldos pendientes:', err);
      }
    }
    loadSaldos();
  }, [clientes]);

  // Filtrado de clientes por texto en tiempo real
  const clientesFiltrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return clientes;

    return clientes.filter((c) => {
      const matchRut = (c.rut ?? '').toLowerCase().includes(q);
      const matchRazon = normalizar(c.razonSocial || '').includes(q);
      const matchFantasia = normalizar(c.nombreFantasia || '').includes(q);

      // Buscar también en direcciones de sus sucursales
      const sucs = sucursalesMap[c.id] || [];
      const matchSucursal = sucs.some(
        (s) =>
          normalizar(s.nombre || '').includes(q) ||
          normalizar(s.direccion || '').includes(q) ||
          normalizar(s.ciudad || '').includes(q)
      );

      return matchRut || matchRazon || matchFantasia || matchSucursal;
    });
  }, [clientes, busqueda, sucursalesMap]);

  // Si no hay jornada activa → redirigir a /jornada
  if (!jornadaLoading && !jornada) {
    return <Navigate to="/jornada" replace />;
  }

  // Manejador de selección de cliente (ADR-013: condicional según deuda)
  const handleSelectCliente = (cliente: EnrichedCliente) => {
    const sucs = sucursalesMap[cliente.id] || [];
    const saldoPendiente = saldosMap.get(String(cliente.id)) ?? 0;
    const hasDebt = saldoPendiente > 0;

    if (sucs.length > 1) {
      // Caso 2: Tiene múltiples sucursales → expandir para elegir sucursal primero
      setExpandedClienteId((prev) => (prev === cliente.id ? null : cliente.id));
    } else if (sucs.length === 1) {
      // Caso 1: 1 sucursal → seleccionar automáticamente
      const target = hasDebt
        ? `/jornada/cobro-pendiente/${cliente.id}?sucursalId=${sucs[0].id}`
        : `/jornada/venta/${cliente.id}?sucursalId=${sucs[0].id}`;
      navigate(target);
    } else {
      // Caso 3: Sin sucursales registradas → navegar directo
      const target = hasDebt
        ? `/jornada/cobro-pendiente/${cliente.id}`
        : `/jornada/venta/${cliente.id}`;
      navigate(target);
    }
  };

  const handleSelectSucursal = (clienteId: string, sucursalId: string) => {
    const saldoPendiente = saldosMap.get(String(clienteId)) ?? 0;
    const hasDebt = saldoPendiente > 0;

    const target = hasDebt
      ? `/jornada/cobro-pendiente/${clienteId}?sucursalId=${sucursalId}`
      : `/jornada/venta/${clienteId}?sucursalId=${sucursalId}`;
    navigate(target);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await runSync();
      await recargarClientes();
      try {
        const res = await getClientesSaldosPendientes();
        const map = new Map<string, number>();
        if (res?.data && Array.isArray(res.data)) {
          for (const s of res.data) {
            map.set(String(s.idCliente), s.saldoPendienteTotal);
          }
        }
        setSaldosMap(map);
      } catch (err) {
        console.error('[EscenaRutaClientes] Error al refrescar saldos en sync:', err);
      }
    } catch (err) {
      console.error('[EscenaRutaClientes] Error al sincronizar:', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <JornadaLayout titulo="En Ruta" mostrarAtras={false}>
      <div className="flex flex-col min-h-[calc(100dvh-57px)] pb-24">
        {/* Subheader informativo: Patente y Ruta */}
        <div className="bg-zinc-900/90 border-b border-zinc-800/60 px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 font-mono font-bold uppercase tracking-wider shrink-0">
                <Truck className="w-3 h-3 text-brand-400" />
                {jornada?.vehiculoPatente || 'VEHÍCULO'}
              </span>
              <span className="text-zinc-400 truncate">·</span>
              <div className="flex items-center gap-1 text-zinc-300 truncate font-medium">
                <MapPin className="w-3 h-3 text-accent-400 shrink-0" />
                <span className="truncate">{jornada?.rutaNombre || 'Ruta libre'}</span>
              </div>
            </div>
            {jornada?.stockVehiculo && (
              <span className="text-[11px] text-zinc-400 font-semibold shrink-0 bg-zinc-800/60 px-2 py-0.5 rounded-md">
                {jornada.stockVehiculo.length} {jornada.stockVehiculo.length === 1 ? 'ítem' : 'ítems'}
              </span>
            )}
          </div>
        </div>

        {/* Barra de búsqueda sticky */}
        <div className="sticky top-[57px] z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="search"
              inputMode="search"
              placeholder="Buscar cliente por nombre, RUT o dirección..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-brand-500 rounded-2xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition-all"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de clientes */}
        <div className="flex-1 px-4 py-4 space-y-2.5">
          {loadingClientes ? (
            // Skeleton loaders
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 animate-pulse"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
                  <div className="h-2.5 bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : clientes.length === 0 ? (
            // Estado vacío de Dexie (sin datos sincronizados)
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                <UserCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-200">
                  No hay clientes sincronizados
                </p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Verifica tu conexión y sincroniza los clientes asignados para operar en ruta.
                </p>
              </div>
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
              </button>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            // Sin resultados para el filtro
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-sm font-bold text-zinc-300 mb-1">Sin resultados</p>
              <p className="text-xs text-zinc-500">
                No se encontraron clientes para "{busqueda}".
              </p>
            </div>
          ) : (
            clientesFiltrados.map((cliente) => {
              const sucs = sucursalesMap[cliente.id] || [];
              const isExpanded = expandedClienteId === cliente.id;
              const hasMultipleSucs = sucs.length > 1;
              const saldoPendiente = saldosMap.get(String(cliente.id)) ?? 0;
              const hasDebt = saldoPendiente > 0;

              return (
                <div
                  key={cliente.id}
                  className={`bg-zinc-900 border transition-all rounded-2xl overflow-hidden ${
                    isExpanded ? 'border-brand-500/50 ring-1 ring-brand-500/30' : 'border-zinc-800'
                  }`}
                >
                  <button
                    onClick={() => handleSelectCliente(cliente)}
                    className="w-full text-left p-4 flex items-center gap-3.5 hover:bg-zinc-850 transition-colors active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-zinc-100 truncate">
                        {cliente.razonSocial}
                      </p>
                      {cliente.nombreFantasia && cliente.nombreFantasia !== cliente.razonSocial && (
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          {cliente.nombreFantasia}
                        </p>
                      )}
                      {hasDebt && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                            ${saldoPendiente.toLocaleString('es-CL')} pendiente
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {cliente.rut}
                        </span>
                        {sucs.length > 0 && (
                          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded font-medium">
                            {sucs.length} {sucs.length === 1 ? 'sucursal' : 'sucursales'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-zinc-500">
                      {hasMultipleSucs ? (
                        isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-brand-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Desglose de sucursales si tiene múltiples y está expandido */}
                  {hasMultipleSucs && isExpanded && (
                    <div className="border-t border-zinc-800 bg-zinc-950/60 p-2 space-y-1.5">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
                        Selecciona la sucursal de entrega:
                      </p>
                      {sucs.map((suc) => (
                        <button
                          key={suc.id}
                          onClick={() => handleSelectSucursal(cliente.id, suc.id)}
                          className="w-full text-left p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:border-brand-500/50 hover:bg-brand-500/5 flex items-center justify-between transition-all group"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold text-zinc-200 group-hover:text-brand-300 truncate">
                              {suc.nombre || 'Sucursal principal'}
                            </p>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                              {[suc.direccion, suc.ciudad].filter(Boolean).join(', ')}
                            </p>
                          </div>
                          <div className="w-7 h-7 rounded-lg bg-zinc-800 group-hover:bg-brand-500 group-hover:text-white text-zinc-400 flex items-center justify-center shrink-0 transition-colors">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer fijo con botón Cerrar Jornada */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div className="text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">
                {clientesFiltrados.length}
              </span>{' '}
              {clientesFiltrados.length === 1 ? 'cliente' : 'clientes'}
            </div>

            <button
              onClick={() => navigate('/jornada/cierre')}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-700/80 hover:border-rose-500/40 text-zinc-200 hover:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-400" />
              Cerrar Jornada
            </button>
          </div>
        </div>
      </div>
    </JornadaLayout>
  );
}
