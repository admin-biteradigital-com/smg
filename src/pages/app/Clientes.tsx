import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  SlidersHorizontal,
  User,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  TrendingUp,
  Plus,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { useClientes, type EnrichedCliente, type DetalleCliente } from '@/hooks/useClientes';
import { useBorradorPedido } from '@/hooks/useBorradorPedido';
import { SyncIndicator } from '@/components/offline/SyncIndicator';
import { onSyncStatusChange, getCurrentSyncStatus } from '@/lib/sync';
import { useEffect } from 'react';
import type { SyncStatus } from '@/types';

export default function ClientesPage() {
  const navigate = useNavigate();
  const { seleccionarCliente } = useBorradorPedido();
  const {
    clientes,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedTipo,
    setSelectedTipo,
    selectedEstado,
    setSelectedEstado,
    obtenerDetalleCliente,
  } = useClientes();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getCurrentSyncStatus);
  const [pendingCount, setPendingCount] = useState(0);

  // Escuchar cambios de estado de sync
  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status, pending) => {
      setSyncStatus(status);
      setPendingCount(pending);
    });
    return unsubscribe;
  }, []);

  // UI States
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<DetalleCliente | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Abrir ficha de detalle
  const handleSelectCliente = async (cliente: EnrichedCliente) => {
    setSelectedClienteId(cliente.id);
    setLoadingDetalle(true);
    try {
      const res = await obtenerDetalleCliente(cliente.id);
      setDetalle(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // Cerrar detalle
  const handleCloseDetalle = () => {
    setSelectedClienteId(null);
    setDetalle(null);
  };

  // Iniciar flujo de pedido
  const handleCrearPedido = (cliente: any) => {
    seleccionarCliente(cliente);
    navigate('/pedidos/nuevo/items');
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'activo':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'suspendido':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'inactivo':
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'minorista':
        return 'Minorista';
      case 'mayorista':
        return 'Mayorista';
      case 'horeca':
        return 'Horeca';
      case 'institucional':
        return 'Institucional';
      default:
        return tipo;
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-950 pb-20">
      {/* HEADER PRINCIPAL */}
      {!selectedClienteId ? (
        <>
          <header className="pt-safe bg-zinc-900/40 border-b border-zinc-800/60 px-4 py-4 sticky top-0 z-40 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-400" />
                  Clientes
                </h1>
                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">
                  {clientes.length} Cliente{clientes.length !== 1 ? 's' : ''} en base local
                </p>
              </div>
              <SyncIndicator status={syncStatus} pendingCount={pendingCount} />
            </div>
          </header>

          <main className="flex-1 px-4 py-4 space-y-4">
            {/* BUSCADOR Y FILTROS */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, RUT o fantasía..."
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-brand-600 rounded-2xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-600/30 transition-all"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-3 rounded-2xl border transition-all ${
                    showFilters || selectedTipo || selectedEstado
                      ? 'bg-brand-600/10 border-brand-600/40 text-brand-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* FILTROS DESPLEGABLES */}
              {showFilters && (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4 animate-in fade-in-50 duration-200">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Tipo de Cliente
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {['minorista', 'mayorista', 'horeca', 'institucional'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedTipo(selectedTipo === t ? null : t)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                            selectedTipo === t
                              ? 'bg-brand-600 border-brand-600 text-white'
                              : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          {getTipoLabel(t)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Estado
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {['activo', 'suspendido', 'inactivo'].map((e) => (
                        <button
                          key={e}
                          onClick={() => setSelectedEstado(selectedEstado === e ? null : e)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold capitalize transition-all ${
                            selectedEstado === e
                              ? 'bg-brand-600 border-brand-600 text-white'
                              : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LISTADO DE CLIENTES */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            ) : clientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                  <Users className="w-8 h-8 text-zinc-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-300">No se encontraron clientes</h3>
                  <p className="text-xs text-zinc-600 mt-1 max-w-[240px]">
                    Intenta cambiar los términos de búsqueda o filtros de estado.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {clientes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCliente(c)}
                    className="w-full text-left bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase ${getStatusColor(
                            c.estado
                          )}`}
                        >
                          {c.estado}
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-500">
                          {getTipoLabel(c.tipo)}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-zinc-100 truncate mt-1">
                        {c.razonSocial}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{c.rut}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg">
                        {c.sucursalesCount} suc.
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </main>
        </>
      ) : (
        /* DETALLE / FICHA DE CLIENTE */
        <div className="flex flex-col min-h-dvh">
          <header className="pt-safe bg-zinc-900/40 border-b border-zinc-800/60 px-4 py-4 sticky top-0 z-40 backdrop-blur-md flex items-center gap-3">
            <button
              onClick={handleCloseDetalle}
              className="p-2 -ml-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-black text-white truncate">
                {detalle?.cliente.razonSocial || 'Ficha de Cliente'}
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono">
                {detalle?.cliente.rut || ''}
              </p>
            </div>
            <SyncIndicator status={syncStatus} pendingCount={pendingCount} />
          </header>

          {loadingDetalle || !detalle ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
              <div className="w-10 h-10 border-4 border-brand-600/30 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-xs text-zinc-500 font-semibold">Cargando historial local...</p>
            </div>
          ) : (
            <main className="flex-1 px-4 py-6 space-y-6">
              {/* RESUMEN FINANCIERO */}
              <section className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-3 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                    Total Comprado
                  </span>
                  <p className="text-sm font-black text-white mt-1">
                    ${detalle.totalVendido.toLocaleString('es-CL')}
                  </p>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-3 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                    Total Cobrado
                  </span>
                  <p className="text-sm font-black text-emerald-400 mt-1">
                    ${detalle.totalCobrado.toLocaleString('es-CL')}
                  </p>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-3 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                    Pendiente
                  </span>
                  <p className="text-sm font-black text-rose-400 mt-1">
                    ${detalle.totalPendiente.toLocaleString('es-CL')}
                  </p>
                </div>
              </section>

              {/* ACCIÓN PRINCIPAL: NUEVO PEDIDO */}
              {detalle.cliente.estado === 'activo' && (
                <button
                  onClick={() => handleCrearPedido(detalle.cliente)}
                  className="w-full py-4 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  Iniciar Nuevo Pedido
                </button>
              )}

              {/* DETALLES DE CONTACTO */}
              <section className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-4 space-y-3.5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Datos Generales
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500">Tipo de Cliente</span>
                    <p className="text-xs font-bold text-zinc-300">
                      {getTipoLabel(detalle.cliente.tipo)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500">Estado Cuenta</span>
                    <p className="text-xs font-bold text-zinc-300 capitalize">
                      {detalle.cliente.estado}
                    </p>
                  </div>
                </div>

                <div className="h-[1px] bg-zinc-850" />

                <div className="space-y-3 text-xs">
                  {detalle.cliente.telefonoContacto && (
                    <div className="flex items-center gap-3 text-zinc-400">
                      <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                      <a href={`tel:${detalle.cliente.telefonoContacto}`} className="hover:text-zinc-200">
                        {detalle.cliente.telefonoContacto}
                      </a>
                    </div>
                  )}
                  {detalle.cliente.emailContacto && (
                    <div className="flex items-center gap-3 text-zinc-400">
                      <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                      <a href={`mailto:${detalle.cliente.emailContacto}`} className="hover:text-zinc-200 truncate">
                        {detalle.cliente.emailContacto}
                      </a>
                    </div>
                  )}
                  {detalle.cliente.listaPrecioId && (
                    <div className="flex items-center gap-3 text-zinc-400">
                      <TrendingUp className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span>Lista de Precio ID: {detalle.cliente.listaPrecioId}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* SUCURSALES */}
              <section className="space-y-2.5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Sucursales ({detalle.sucursales.length})
                </p>
                {detalle.sucursales.length === 0 ? (
                  <p className="text-xs text-zinc-650">No hay sucursales registradas.</p>
                ) : (
                  <div className="space-y-2.5">
                    {detalle.sucursales.map((s) => (
                      <div
                        key={s.id}
                        className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-300">{s.nombre}</p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                            {s.direccion}, {s.ciudad}
                          </p>
                          {s.contactoNombre && (
                            <p className="text-[10px] text-zinc-600">
                              Contacto: {s.contactoNombre} {s.contactoTelefono ? `(${s.contactoTelefono})` : ''}
                            </p>
                          )}
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${s.direccion}, ${s.ciudad}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all shrink-0"
                          title="Ver en Google Maps"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* HISTORIAL DE PEDIDOS */}
              <section className="space-y-2.5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Pedidos Recientes ({detalle.pedidos.length})
                </p>
                {detalle.pedidos.length === 0 ? (
                  <p className="text-xs text-zinc-650">No registra pedidos recientes en caché.</p>
                ) : (
                  <div className="space-y-2.5">
                    {detalle.pedidos.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-300">
                              Pedido {p.numero ? `#${p.numero}` : '(Borrador)'}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(p.createdAt).toLocaleDateString('es-CL')}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 capitalize">
                            Pago: {p.metodoPago} | Estado: {p.estado}
                          </p>
                        </div>
                        <p className="font-black text-white">
                          ${(p.total ?? 0).toLocaleString('es-CL')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </main>
          )}
        </div>
      )}
    </div>
  );
}
