// @deprecated - reemplazado por ADR-012 (ModoSelectorPage en src/pages/ModoSelector.tsx)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Users, ShoppingCart, CreditCard, RefreshCw, WifiOff, Wifi, AlertTriangle, Clock } from 'lucide-react';
import { SyncIndicator } from '@/components/offline/SyncIndicator';
import { onSyncStatusChange, getCurrentSyncStatus, runSync } from '@/lib/sync';
import { db } from '@/lib/db';
import type { SyncStatus } from '@/types';

// ─── Dashboard Page (Stub) ────────────────────────────────────────────────────
// Vista principal del vendedor. Se expandirá en fases posteriores.

interface DashboardStat {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getCurrentSyncStatus);
  const [pendingCount, setPendingCount] = useState(0);
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Escuchar cambios de estado de sync
  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status, pending) => {
      setSyncStatus(status);
      setPendingCount(pending);
    });
    return unsubscribe;
  }, []);

  // Cargar estadísticas desde IndexedDB local
  useEffect(() => {
    async function loadStats() {
      const [productos, clientes, pedidos, cobros] = await Promise.all([
        db.productos.count(),
        db.clientes.count(),
        db.pedidos.where('estado').anyOf(['confirmado', 'en_ruta']).count(),
        db.ventas_cobros.where('estado').equals('pendiente').count(),
      ]);

      setStats([
        { label: 'Productos',     value: productos, icon: Package,      color: 'text-brand-400' },
        { label: 'Clientes',      value: clientes,  icon: Users,        color: 'text-accent-400' },
        { label: 'Pedidos activos', value: pedidos, icon: ShoppingCart, color: 'text-success-400' },
        { label: 'Cobros pend.',  value: cobros,    icon: CreditCard,   color: 'text-danger-400' },
      ]);
    }

    loadStats().catch(console.error);
  }, [syncStatus]); // Re-cargar después de cada sync

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await runSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface-900 flex flex-col">
      {/* Header */}
      <header className="pt-safe bg-surface-850 border-b border-white/5 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Dashboard</h1>
            <p className="text-xs text-white/40 mt-0.5">Jornada de hoy</p>
          </div>
          <div className="flex items-center gap-3">
            <SyncIndicator status={syncStatus} pendingCount={pendingCount} />
            <button
              onClick={handleManualSync}
              disabled={syncing || !navigator.onLine}
              className="btn-ghost p-2 rounded-xl disabled:opacity-30"
              title="Sincronizar ahora"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {syncStatus === 'offline' || syncStatus === 'pending' ? (
        <div className="bg-surface-800 border-b border-white/5 px-4 py-2.5 flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-white/40 shrink-0" />
          <p className="text-xs text-white/50">
            {syncStatus === 'pending'
              ? `Sin conexión · ${pendingCount} operación${pendingCount !== 1 ? 'es' : ''} en espera`
              : 'Sin conexión · Modo offline activo'}
          </p>
        </div>
      ) : null}

      {/* Content */}
      <main className="flex-1 px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
            Estado local
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-white leading-none">{stat.value}</p>
                  <p className="text-xs text-white/40 mt-0.5 truncate">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sync Status Card */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
            Sincronización
          </h2>
          <div className="card">
            <div className="flex items-center gap-3">
              {syncStatus === 'online' && <Wifi className="w-5 h-5 text-success-400" />}
              {syncStatus === 'offline' && <WifiOff className="w-5 h-5 text-white/30" />}
              {syncStatus === 'syncing' && <RefreshCw className="w-5 h-5 text-brand-400 animate-spin" />}
              {syncStatus === 'pending' && <Clock className="w-5 h-5 text-accent-400" />}
              {syncStatus === 'conflict' && <AlertTriangle className="w-5 h-5 text-danger-400" />}
              <div>
                <p className="text-sm font-medium text-white capitalize">
                  {syncStatus === 'online'   && 'Conectado y sincronizado'}
                  {syncStatus === 'offline'  && 'Sin conexión'}
                  {syncStatus === 'syncing'  && 'Sincronizando...'}
                  {syncStatus === 'pending'  && `${pendingCount} operaciones en espera`}
                  {syncStatus === 'conflict' && 'Hay conflictos pendientes'}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {syncStatus === 'online'   && 'Los datos están actualizados'}
                  {syncStatus === 'offline'  && 'Puedes seguir trabajando normalmente'}
                  {syncStatus === 'syncing'  && 'Enviando operaciones pendientes...'}
                  {syncStatus === 'pending'  && 'Se enviarán al reconectar'}
                  {syncStatus === 'conflict' && 'Revisa el panel de administración'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Acceso rápido */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
            Acceso rápido
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Jornada', icon: '🗺️', desc: 'Ruta del día', path: '/jornada' },
              { label: 'Catálogo', icon: '📦', desc: 'Productos', path: '/catalogo' },
              { label: 'Clientes', icon: '👥', desc: 'Mis clientes', path: '/clientes' },
              // Cobros: No existe ruta propia aún (/cobros); temporalmente navega a /clientes pendiente de implementación de vista dedicada.
              { label: 'Cobros', icon: '💰', desc: 'Pendientes', path: '/clientes' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="card text-left hover:bg-white/5 transition-colors active:scale-95 cursor-pointer"
              >
                <span className="text-2xl">{item.icon}</span>
                <p className="text-sm font-semibold text-white mt-2">{item.label}</p>
                <p className="text-xs text-white/40">{item.desc}</p>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
