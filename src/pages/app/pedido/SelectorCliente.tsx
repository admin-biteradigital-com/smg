import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserCheck, UserX, WifiOff, ChevronRight, X } from 'lucide-react';
import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { usePedidoActivo } from '@/store/pedidoActivo';
import type { Cliente } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ─── Tarjeta de Cliente ───────────────────────────────────────────────────────

function ClienteCard({
  cliente,
  onSelect,
}: {
  cliente: Cliente;
  onSelect: (c: Cliente) => void;
}) {
  return (
    <button
      onClick={() => onSelect(cliente)}
      className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.98]"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center shrink-0">
        <UserCheck className="w-5 h-5 text-brand-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-zinc-100 truncate">{cliente.razonSocial}</p>
        {cliente.nombreFantasia && cliente.nombreFantasia !== cliente.razonSocial && (
          <p className="text-xs text-zinc-500 truncate">{cliente.nombreFantasia}</p>
        )}
        <p className="text-xs text-zinc-500 font-mono mt-0.5">{cliente.rut}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
    </button>
  );
}

// ─── Página SelectorCliente ───────────────────────────────────────────────────

export default function SelectorClientePage() {
  const navigate = useNavigate();
  const { setCliente } = usePedidoActivo();

  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscadoOffline, setBuscadoOffline] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (q.trim().length < 2) {
        setResultados([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setBuscando(true);
        setBuscadoOffline(false);

        try {
          if (navigator.onLine) {
            // Modo online: buscar en la API
            const data = await api.get<{ clientes: Cliente[] }>(
              `/api/v1/clients?search=${encodeURIComponent(q.trim())}`,
            );
            setResultados(data.clientes ?? []);
          } else {
            throw new Error('offline');
          }
        } catch {
          // Modo offline o error de red: buscar en IndexedDB local
          setBuscadoOffline(true);
          const qNorm = normalizar(q.trim());
          const todos = await db.clientes
            .filter(
              (c) =>
                normalizar(c.razonSocial).includes(qNorm) ||
                (c.rut ?? '').includes(q.trim()) ||
                normalizar(c.nombreFantasia ?? '').includes(qNorm),
            )
            .limit(30)
            .toArray();
          setResultados(todos);
        } finally {
          setBuscando(false);
        }
      }, 300);
    },
    [],
  );

  const handleSelect = (cliente: Cliente) => {
    setCliente(cliente);
    navigate('/pedidos/nuevo', { replace: true });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-100">Seleccionar Cliente</h2>
          <button
            onClick={() => navigate('/pedidos/nuevo', { replace: true })}
            className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="search"
            autoFocus
            inputMode="search"
            placeholder="Nombre, fantasía o RUT..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              buscar(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-brand-600 rounded-2xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-600/50 transition-all"
          />
        </div>

        {/* Indicador offline */}
        {buscadoOffline && (
          <div className="flex items-center gap-2 text-[10px] text-amber-400 font-semibold">
            <WifiOff className="w-3 h-3" />
            Resultados desde base de datos local
          </div>
        )}
      </div>

      {/* Resultados */}
      <div className="flex-1 px-4 py-4 space-y-2.5">
        {buscando ? (
          // Skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 animate-pulse"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : resultados.length > 0 ? (
          resultados.map((c) => (
            <ClienteCard key={c.id} cliente={c} onSelect={handleSelect} />
          ))
        ) : query.length >= 2 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mb-3">
              <UserX className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-sm font-bold text-zinc-300 mb-1">Sin resultados</p>
            <p className="text-xs text-zinc-500">
              No se encontraron clientes para "{query}".
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-8 h-8 text-zinc-700 mb-3" />
            <p className="text-xs text-zinc-500">
              Escribe al menos 2 caracteres para buscar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
