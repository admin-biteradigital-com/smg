import { Wifi, WifiOff, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import type { SyncStatus } from '@/types';

// ─── SyncIndicator ────────────────────────────────────────────────────────────
// Componente compacto que muestra el estado de conexión y sincronización.
// Se coloca en el header de la app (visible siempre en ruta).

interface SyncIndicatorProps {
  status: SyncStatus;
  pendingCount?: number;
  className?: string;
}

const STATUS_CONFIG: Record<
  SyncStatus,
  { icon: React.ComponentType<{ className?: string }>; label: string; className: string }
> = {
  online:   { icon: Wifi,          label: 'Online',       className: 'badge-online' },
  offline:  { icon: WifiOff,       label: 'Offline',      className: 'badge-offline' },
  syncing:  { icon: RefreshCw,     label: 'Sincronizando', className: 'badge-syncing' },
  pending:  { icon: Clock,         label: 'En espera',    className: 'badge-pending' },
  conflict: { icon: AlertTriangle, label: 'Conflicto',    className: 'badge-conflict' },
};

export function SyncIndicator({ status, pendingCount = 0, className = '' }: SyncIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span className={`${config.className} ${className}`} aria-live="polite" aria-label={config.label}>
      <Icon
        className={`w-3.5 h-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`}
      />
      <span className="hidden xs:inline">
        {status === 'pending' && pendingCount > 0
          ? `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}`
          : config.label}
      </span>
    </span>
  );
}
