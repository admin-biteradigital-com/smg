import { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { onSyncStatusChange, getCurrentSyncStatus, runSync } from '@/lib/sync';
import type { SyncStatus } from '@/types';

const CATALOG_SYNC_KEY = 'siglo_last_catalog_sync';

export default function SyncStatusPage() {
  const [status, setStatus] = useState<SyncStatus>(getCurrentSyncStatus);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const refreshLastSync = useCallback(() => {
    const raw = localStorage.getItem(CATALOG_SYNC_KEY);
    if (raw) {
      const ts = parseInt(raw, 10);
      if (!isNaN(ts)) setLastSync(new Date(ts));
    }
  }, []);

  useEffect(() => {
    refreshLastSync();
    const unsubscribe = onSyncStatusChange((s, p) => {
      setStatus(s);
      setPending(p);
      refreshLastSync();
    });
    return unsubscribe;
  }, [refreshLastSync]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await runSync();
      refreshLastSync();
    } finally {
      setSyncing(false);
    }
  };

  const lastSyncLabel = lastSync
    ? lastSync.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Nunca';

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-white">Sincronización</h2>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-zinc-800 border border-zinc-700/60 rounded-xl text-zinc-300">
            {status === 'online' && <Wifi className="w-6 h-6 text-emerald-400" />}
            {status === 'offline' && <WifiOff className="w-6 h-6 text-zinc-500" />}
            {status === 'syncing' && <RefreshCw className="w-6 h-6 text-brand-400 animate-spin" />}
            {status === 'conflict' && <AlertTriangle className="w-6 h-6 text-rose-400" />}
          </div>
          <div>
            <p className="text-sm font-bold text-white capitalize">{status}</p>
            <p className="text-xs text-zinc-400 mt-0.5">Estado actual de la conexión</p>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">{pending}</p>
            <p className="text-xs text-zinc-400 mt-0.5">Operaciones pendientes en cola</p>
          </div>
          
          <button
            onClick={handleSync}
            disabled={syncing || !navigator.onLine}
            className="btn-primary py-2 px-4 text-xs disabled:opacity-50"
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>
        </div>

        <div className="border-t border-zinc-800/60 pt-3 flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>Última sincronización: <strong className="text-zinc-300 font-medium">{lastSyncLabel}</strong></span>
        </div>
      </div>
    </div>
  );
}
