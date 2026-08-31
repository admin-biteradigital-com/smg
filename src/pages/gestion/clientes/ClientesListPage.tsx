import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Users,
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
  Search,
  MapPin,
  DollarSign,
  CreditCard,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { getClientesAdmin, getClientesSaldosPendientes, ApiRequestError } from '@/lib/api';
import { formatRut } from '@/lib/rut';
import type { ClienteAdminItem, SegmentoCliente } from '@/types';

const SEGMENTO_BADGES: Record<SegmentoCliente, { label: string; className: string }> = {
  pequeño: {
    label: 'Pequeño',
    className: 'text-zinc-300 bg-zinc-800 border-zinc-700',
  },
  mediano: {
    label: 'Mediano',
    className: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
  grande: {
    label: 'Grande',
    className: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  mayorista: {
    label: 'Mayorista',
    className: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
};

type FiltroEstado = 'todos' | 'activos' | 'inactivos';

export default function ClientesListPage() {
  const navigate = useNavigate();

  // Estados de datos
  const [clientes, setClientes] = useState<ClienteAdminItem[]>([]);
  const [saldosMap, setSaldosMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('activos');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const activoParam =
        filtroEstado === 'todos' ? undefined : filtroEstado === 'activos' ? true : false;

      // Carga paralela de clientes y saldos pendientes
      const [clientesRes, saldosRes] = await Promise.allSettled([
        getClientesAdmin({
          q: busqueda.trim() || undefined,
          activo: activoParam,
        }),
        getClientesSaldosPendientes(),
      ]);

      if (clientesRes.status === 'rejected') {
        throw clientesRes.reason;
      }

      const listaClientes = clientesRes.value?.data || [];

      // Mapear saldos por idCliente
      const map: Record<number, number> = {};
      if (saldosRes.status === 'fulfilled' && saldosRes.value?.data) {
        for (const item of saldosRes.value.data) {
          map[item.idCliente] = item.saldoPendienteTotal || 0;
        }
      }
      setSaldosMap(map);
      setClientes(listaClientes);
    } catch (err: unknown) {
      console.error('[ClientesListPage] Error al cargar clientes:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista de clientes.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Clientes con saldo combinado
  const clientesConSaldo = useMemo(() => {
    return clientes.map((c) => ({
      ...c,
      saldoPendiente: saldosMap[c.id] ?? 0,
    }));
  }, [clientes, saldosMap]);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header Fijo */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/gestion')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h1 className="text-sm font-bold text-white">Clientes</h1>
          </div>

          <button
            onClick={() => navigate('/gestion/clientes/nuevo')}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-4">
        {/* Barra de Búsqueda y Filtros */}
        <div className="space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por razón social o RUT..."
                className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-900/80 border border-zinc-800 focus:border-blue-500 rounded-2xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-2xl text-xs font-bold transition-colors shrink-0"
            >
              Buscar
            </button>
          </form>

          {/* Chips de Filtro Estado */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: 'activos', label: 'Activos' },
                { id: 'todos', label: 'Todos' },
                { id: 'inactivos', label: 'Inactivos' },
              ] as const
            ).map((chip) => {
              const isSelected = filtroEstado === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFiltroEstado(chip.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                      : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800/80 hover:text-zinc-200'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Listado / Estados */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs">Cargando clientes y saldos...</p>
          </div>
        ) : errorMsg ? (
          <div className="space-y-4 py-8">
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
            <button
              onClick={loadData}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl text-xs font-bold transition-all"
            >
              Reintentar
            </button>
          </div>
        ) : clientesConSaldo.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mb-3">
              <Building2 className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-sm font-bold text-zinc-200">No se encontraron clientes</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              {busqueda.trim()
                ? 'No hay clientes que coincidan con los criterios de búsqueda.'
                : 'Registra los clientes de tu cartera para gestionar sucursales, pedidos y créditos.'}
            </p>
            <button
              onClick={() => navigate('/gestion/clientes/nuevo')}
              className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Cliente</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-zinc-400 font-medium">
              <span>
                {clientesConSaldo.length}{' '}
                {clientesConSaldo.length === 1 ? 'cliente' : 'clientes'}
              </span>
            </div>

            {clientesConSaldo.map((cli) => {
              const activo = cli.activo;
              const segmento = cli.segmento ? SEGMENTO_BADGES[cli.segmento] : null;
              const saldo = cli.saldoPendiente ?? 0;
              const tieneDeuda = saldo > 0;
              const sucursal = cli.sucursalPrincipal;
              const rutFormateado = formatRut(cli.rut);

              return (
                <button
                  key={cli.id}
                  onClick={() => navigate(`/gestion/clientes/${cli.id}/editar`)}
                  className="w-full p-4 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl flex items-center gap-3.5 transition-all active:scale-[0.99] text-left group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0 text-blue-400 group-hover:scale-105 transition-transform">
                    <Building2 className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Fila 1: Razón Social + Badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-bold text-zinc-100 truncate">
                        {cli.razonSocial}
                      </p>
                      {activo ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md">
                          Inactivo
                        </span>
                      )}
                      {segmento && (
                        <span
                          className={`inline-flex items-center text-[10px] font-bold border px-2 py-0.5 rounded-md ${segmento.className}`}
                        >
                          {segmento.label}
                        </span>
                      )}
                    </div>

                    {/* Fila 2: RUT + Dirección Principal */}
                    <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                      <span className="font-mono text-zinc-300 font-medium">
                        {rutFormateado || cli.rut}
                      </span>
                      {sucursal && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1 text-zinc-400 truncate">
                            <MapPin className="w-3 h-3 shrink-0 text-zinc-500" />
                            <span className="truncate">
                              {sucursal.direccion}
                              {sucursal.ciudad ? `, ${sucursal.ciudad}` : ''}
                            </span>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Fila 3: Saldo Pendiente + Crédito */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] flex-wrap">
                      {/* Badge de Saldo */}
                      {tieneDeuda ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono">
                          <DollarSign className="w-3 h-3 shrink-0" />
                          Deuda: ${saldo.toLocaleString('es-CL')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          Al día
                        </span>
                      )}

                      {/* Términos de crédito si existen */}
                      {(cli.plazoCreditoDias > 0 || cli.limiteCredito > 0) && (
                        <span className="flex items-center gap-1 text-zinc-400 font-medium">
                          <CreditCard className="w-3 h-3 text-zinc-500" />
                          <span>
                            {cli.plazoCreditoDias > 0
                              ? `${cli.plazoCreditoDias} días`
                              : 'Contado'}
                            {cli.limiteCredito > 0
                              ? ` · Límite: $${cli.limiteCredito.toLocaleString('es-CL')}`
                              : ''}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
