// @deprecated - reemplazado por ADR-012 (Escenas en src/pages/jornada/)
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Users,
  Package,
  RefreshCw,
  WifiOff,
  TrendingUp,
  DollarSign,
  Truck,
  MapPin,
  Clock,
  PackagePlus,
  Lock,
  Boxes,
  PlusCircle,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SyncIndicator } from '@/components/offline/SyncIndicator';
import { onSyncStatusChange, getCurrentSyncStatus, runSync } from '@/lib/sync';
import { getPendingCount } from '@/lib/db';
import type { SyncStatus, Jornada, Vehiculo, Ruta, ResumenCierre } from '@/types';
import { api, fetchJornadaActiva, fetchVehiculos, fetchRutas } from '@/lib/api';
import { ModalAbrirJornada } from '@/components/jornada/ModalAbrirJornada';
import { ModalCargarStock } from '@/components/jornada/ModalCargarStock';
import { ModalCierreJornada } from '@/components/jornada/ModalCierreJornada';

export default function JornadaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getCurrentSyncStatus);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  // Estados de Jornada
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [loadingJornada, setLoadingJornada] = useState(true);
  const [vehiculosMap, setVehiculosMap] = useState<Record<number, Vehiculo>>({});
  const [rutasMap, setRutasMap] = useState<Record<number, Ruta>>({});

  // Modales
  const [showModalAbrir, setShowModalAbrir] = useState(false);
  const [showModalCarga, setShowModalCarga] = useState(false);
  const [showModalCierre, setShowModalCierre] = useState(false);

  // Estados del resumen del día (Dashboard)
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardData, setDashboardData] = useState<{
    pedidosHoy: number;
    montoHoy: number;
  } | null>(null);

  // Cargar jornada activa y metadatos de flota/rutas
  const loadJornadaData = useCallback(async () => {
    if (!navigator.onLine) {
      setLoadingJornada(false);
      return;
    }

    setLoadingJornada(true);
    try {
      const [jornadaRes, vehiculosRes, rutasRes] = await Promise.all([
        fetchJornadaActiva().catch(() => ({ data: null })),
        fetchVehiculos().catch(() => ({ data: [] })),
        fetchRutas().catch(() => ({ data: [] })),
      ]);

      setJornada(jornadaRes.data || null);

      const vMap: Record<number, Vehiculo> = {};
      (vehiculosRes.data || []).forEach((v) => {
        vMap[v.id] = v;
      });
      setVehiculosMap(vMap);

      const rMap: Record<number, Ruta> = {};
      (rutasRes.data || []).forEach((r) => {
        rMap[r.id] = r;
      });
      setRutasMap(rMap);
    } catch (err) {
      console.error('[Jornada] Error al cargar jornada activa:', err);
    } finally {
      setLoadingJornada(false);
    }
  }, []);

  // Monitorear red y sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      loadJornadaData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = onSyncStatusChange((status, pending) => {
      setSyncStatus(status);
      setPendingCount(pending);
    });

    getPendingCount().then(setPendingCount);
    loadJornadaData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [loadJornadaData]);

  // Cargar dashboard de la API si está online
  useEffect(() => {
    if (!isOnline) {
      setLoadingDashboard(false);
      return;
    }

    async function loadDashboard() {
      setLoadingDashboard(true);
      try {
        const data = await api.get<{ data: { pedidosHoy: number; montoHoy: number } }>(
          '/api/v1/dashboard'
        );
        setDashboardData(data.data);
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
      } finally {
        setLoadingDashboard(false);
      }
    }

    loadDashboard();
  }, [isOnline, syncStatus]);

  const handleManualSync = async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    try {
      await runSync();
      await loadJornadaData();
    } catch (error) {
      console.error('Sync falló:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleJornadaAbierta = (nuevaJornada: Jornada) => {
    setJornada(nuevaJornada);
    loadJornadaData();
  };

  const handleStockCargado = () => {
    loadJornadaData();
  };

  const handleJornadaCerrada = (_resumen: ResumenCierre) => {
    setJornada(null);
    loadJornadaData();
  };

  // Helper para formatear fechas
  const formatHoraApertura = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' hrs';
    } catch {
      return dateStr;
    }
  };

  const formatFechaApertura = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  // Determinar color de alerta de sync pendientes
  const getSyncColorClass = () => {
    if (pendingCount === 0) return 'border-emerald-500/25 bg-emerald-500/5 text-emerald-400';
    if (pendingCount <= 5) return 'border-amber-500/25 bg-amber-500/5 text-amber-400';
    return 'border-rose-500/25 bg-rose-500/5 text-rose-400';
  };

  const getSyncDotClass = () => {
    if (pendingCount === 0) return 'bg-emerald-400';
    if (pendingCount <= 5) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  const vehiculoActual = jornada?.idVehiculo ? vehiculosMap[jornada.idVehiculo] : null;
  const rutaActual = jornada?.idRuta ? rutasMap[jornada.idRuta] : null;
  const totalStockUnidades = (jornada?.stockVehiculo || []).reduce((sum, item) => sum + (item?.cantidad ?? 0), 0);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] flex flex-col px-4 py-5 space-y-6 max-w-2xl mx-auto">
      {/* Banner de Modo Offline */}
      {!isOnline && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3.5 text-rose-400 animate-fade-in shadow-lg">
          <WifiOff className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Modo Offline Activo</p>
            <p className="text-[11px] text-rose-400/80 mt-0.5 leading-relaxed">
              Tus operaciones se guardarán localmente y se sincronizarán al recuperar la conexión. (Las acciones de apertura, carga y cierre de jornada requieren internet).
            </p>
          </div>
        </div>
      )}

      {/* Header Operador / Perfil */}
      <section className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/85 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Panel del Operador
            </p>
            <h2 className="text-xl font-black text-white mt-1">
              {user?.email?.split('@')[0] ?? 'Operador'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] bg-brand-500/20 text-brand-300 font-semibold px-2 py-0.5 rounded-md border border-brand-500/30 capitalize">
                {user?.rol || 'Vendedor'}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <SyncIndicator status={syncStatus} pendingCount={pendingCount} />
          </div>
        </div>
      </section>

      {/* ─── SECCIÓN PRINCIPAL: ESTADO DE LA JORNADA ─────────────────────────── */}
      {loadingJornada ? (
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center space-y-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-zinc-800" />
          <div className="h-4 w-36 bg-zinc-800 rounded" />
          <div className="h-3 w-48 bg-zinc-800 rounded" />
        </section>
      ) : jornada ? (
        /* ESTADO 1: JORNADA ACTIVA EN CURSO */
        <section className="space-y-4">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-3xl p-5 shadow-xl space-y-4 relative overflow-hidden">
            {/* Glow decorativo de fondo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Badge de estado y acciones de turno */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Jornada Activa #{jornada.id}
                </span>
              </div>
              <button
                onClick={() => setShowModalCierre(true)}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                Cerrar Jornada
              </button>
            </div>

            {/* Detalles del vehículo y ruta asignados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Vehículo */}
              <div className="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-xl shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-white border border-zinc-700">
                      {vehiculoActual?.patente || `Vehículo #${jornada.idVehiculo}`}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 font-semibold mt-1 truncate">
                    {[vehiculoActual?.marca, vehiculoActual?.modelo].filter(Boolean).join(' ') || 'Móvil asignado'}
                  </p>
                  {vehiculoActual?.capacidadKg && (
                    <p className="text-[10px] text-zinc-500">Capacidad: {vehiculoActual.capacidadKg} kg</p>
                  )}
                </div>
              </div>

              {/* Ruta y Horario */}
              <div className="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex items-center gap-3">
                <div className="p-2.5 bg-accent-500/10 border border-accent-500/20 text-accent-400 rounded-xl shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-300 font-semibold truncate">
                    {rutaActual?.nombre || 'Ruta libre / sin asignar'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {formatHoraApertura(jornada.fechaApertura)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      {formatFechaApertura(jornada.fechaApertura)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {jornada.notasApertura && (
              <p className="text-[11px] text-zinc-400 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/60 italic">
                Nota de apertura: &quot;{jornada.notasApertura}&quot;
              </p>
            )}
          </div>

          {/* ─── STOCK EN VEHÍCULO ────────────────────────────────────────────── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Stock en Móvil
                </h3>
              </div>
              <button
                onClick={() => setShowModalCarga(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                Cargar Stock
              </button>
            </div>

            {jornada.stockVehiculo && jornada.stockVehiculo.length > 0 ? (
              <div className="space-y-3">
                {/* Resumen pills */}
                <div className="flex items-center gap-3 text-xs text-zinc-400 pb-1">
                  <span className="bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700/60">
                    <strong className="text-white">{jornada.stockVehiculo.length}</strong> SKUs
                  </span>
                  <span className="bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700/60">
                    <strong className="text-emerald-400">{totalStockUnidades}</strong> unidades disponibles
                  </span>
                </div>

                {/* Lista de ítems cargados */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {jornada.stockVehiculo.map((item) => (
                    <div
                      key={`${item.idProducto}-${item.numeroLote}`}
                      className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex items-center justify-between"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="text-xs font-bold text-zinc-200 truncate">
                          {item.productoNombre || `Producto #${item.idProducto}`}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          Lote: {item.numeroLote} • Vence: {item.fechaVencimiento || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl">
                        <span className="text-sm font-black text-emerald-400">{item.cantidad}</span>
                        <span className="text-[10px] text-emerald-400/80 ml-1">unid.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Sin stock cargado aún en el vehículo */
              <div className="p-6 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl text-center space-y-2">
                <p className="text-xs text-zinc-400">
                  Tu vehículo aún no tiene stock cargado para esta jornada.
                </p>
                <p className="text-[11px] text-zinc-500">
                  Haz clic en &quot;Cargar Stock&quot; para transferir productos del depósito al vehículo antes de iniciar la venta en ruta.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setShowModalCarga(true)}
                    className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-all"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    Realizar primera carga
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        /* ESTADO 2: SIN JORNADA ABIERTA */
        <section className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 text-center space-y-4 shadow-xl relative overflow-hidden">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-400 shadow-inner">
            <Truck className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-white">No tienes una jornada abierta</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Para registrar pedidos en ruta y descontar stock del vehículo, debes iniciar tu jornada asignando tu móvil de trabajo.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowModalAbrir(true)}
              className="w-full max-w-xs py-3.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold rounded-2xl shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm mx-auto"
            >
              <PlusCircle className="w-4 h-4" />
              Abrir Jornada
            </button>
          </div>
        </section>
      )}

      {/* ─── ACCESOS RÁPIDOS ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
          Accesos Rápidos
        </h3>
        <div className="grid grid-cols-2 gap-3.5">
          <button
            onClick={() => navigate('/pedidos/nuevo')}
            className="flex flex-col items-start p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-850 active:scale-95 transition-all text-left group"
          >
            <div className="p-3 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-xl group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-zinc-200 mt-4">Nuevo Pedido</span>
            <span className="text-[11px] text-zinc-400 mt-0.5">Venta rápida en ruta</span>
          </button>

          <button
            onClick={() => navigate('/clientes')}
            className="flex flex-col items-start p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-850 active:scale-95 transition-all text-left group"
          >
            <div className="p-3 bg-accent-500/10 border border-accent-500/20 text-accent-400 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-zinc-200 mt-4">Clientes</span>
            <span className="text-[11px] text-zinc-400 mt-0.5">Cartera de clientes</span>
          </button>

          <button
            onClick={() => navigate('/catalogo')}
            className="flex flex-col items-start p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-850 active:scale-95 transition-all text-left group"
          >
            <div className="p-3 bg-zinc-800 border border-zinc-700/60 text-zinc-300 rounded-xl group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-zinc-200 mt-4">Catálogo</span>
            <span className="text-[11px] text-zinc-400 mt-0.5">Ver stock y precios</span>
          </button>

          <button
            onClick={handleManualSync}
            disabled={!isOnline || syncing}
            className="flex flex-col items-start p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-850 active:scale-95 transition-all text-left group disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            </div>
            <span className="text-sm font-bold text-zinc-200 mt-4">Sincronizar</span>
            <span className="text-[11px] text-zinc-400 mt-0.5">Forzar envío / pull</span>
          </button>
        </div>
      </section>

      {/* ─── ESTADO DE SINCRONIZACIÓN ────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
          Estado de Sincronización
        </h3>
        <div className={`border rounded-2xl p-4 flex items-center justify-between ${getSyncColorClass()}`}>
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${getSyncDotClass()} animate-pulse shrink-0`} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-200">Cola Offline</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {pendingCount === 0
                  ? 'Todo sincronizado en la nube.'
                  : `${pendingCount} operación${pendingCount > 1 ? 'es' : ''} pendiente${pendingCount > 1 ? 's' : ''} de envío.`}
              </p>
            </div>
          </div>
          {pendingCount > 0 && isOnline && (
            <button
              onClick={handleManualSync}
              className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              Enviar ya
            </button>
          )}
        </div>
      </section>

      {/* ─── RESUMEN DEL DÍA ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Resumen de Hoy</h3>
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 grid grid-cols-2 gap-4">
          {loadingDashboard ? (
            <>
              <div className="space-y-2 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-zinc-800" />
                <div className="h-4 w-12 bg-zinc-800 rounded" />
                <div className="h-3 w-16 bg-zinc-800 rounded" />
              </div>
              <div className="space-y-2 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-zinc-800" />
                <div className="h-4 w-20 bg-zinc-800 rounded" />
                <div className="h-3 w-16 bg-zinc-800 rounded" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <div className="p-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-lg w-max">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <p className="text-lg font-black text-white">
                  {dashboardData?.pedidosHoy ?? 0}
                </p>
                <p className="text-[11px] text-zinc-400">Pedidos tomados</p>
              </div>

              <div className="space-y-1.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg w-max">
                  <DollarSign className="w-4 h-4" />
                </div>
                <p className="text-lg font-black text-white">
                  {dashboardData?.montoHoy != null
                    ? `$${dashboardData.montoHoy.toLocaleString('es-CL')}`
                    : '$0'}
                </p>
                <p className="text-[11px] text-zinc-400">Monto cobrado</p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── MODALES DE FLUJO DE JORNADA ─────────────────────────────────────── */}
      <ModalAbrirJornada
        isOpen={showModalAbrir}
        onClose={() => setShowModalAbrir(false)}
        onSuccess={handleJornadaAbierta}
      />

      {jornada && (
        <>
          <ModalCargarStock
            isOpen={showModalCarga}
            idJornada={jornada.id}
            onClose={() => setShowModalCarga(false)}
            onSuccess={handleStockCargado}
          />

          <ModalCierreJornada
            isOpen={showModalCierre}
            idJornada={jornada.id}
            onClose={() => setShowModalCierre(false)}
            onSuccess={handleJornadaCerrada}
          />
        </>
      )}
    </div>
  );
}
