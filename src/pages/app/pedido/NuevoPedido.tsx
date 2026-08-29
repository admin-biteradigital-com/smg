import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCircle2,
  ChevronRight,
  ShoppingBag,
  Plus,
  FileText,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useBorradorPedido } from '@/hooks/useBorradorPedido';
import { LineaPedidoCard } from '@/components/pedido/LineaPedidoCard';

// ─── Página NuevoPedido ───────────────────────────────────────────────────────

export default function NuevoPedidoPage() {
  const navigate = useNavigate();
  const {
    borrador,
    totalPedido,
    puedeConfirmar,
    cantidadLineas,
    actualizarCantidad,
    eliminarLinea,
    setNotas,
    limpiarPedido,
  } = useBorradorPedido();

  const [confirmandoLimpiar, setConfirmandoLimpiar] = useState(false);

  const handleLimpiar = async () => {
    if (!confirmandoLimpiar) {
      setConfirmandoLimpiar(true);
      setTimeout(() => setConfirmandoLimpiar(false), 3000);
      return;
    }
    await limpiarPedido();
    setConfirmandoLimpiar(false);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] pb-32">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-100">Nuevo Pedido</h2>
          <p className="text-[10px] text-zinc-500">
            {cantidadLineas === 0
              ? 'Sin artículos agregados'
              : `${cantidadLineas} artículo${cantidadLineas !== 1 ? 's' : ''} en borrador`}
          </p>
        </div>

        {/* Botón de limpiar borrador */}
        {(borrador.cliente !== null || cantidadLineas > 0) && (
          <button
            onClick={handleLimpiar}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
              confirmandoLimpiar
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {confirmandoLimpiar ? '¿Confirmar?' : 'Limpiar'}
          </button>
        )}
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* ── Sección Cliente ─────────────────────────────────────── */}
        <section className="space-y-2">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Cliente
          </p>

          {borrador.cliente ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center shrink-0">
                <UserCircle2 className="w-5 h-5 text-brand-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-100 truncate">
                  {borrador.cliente.razonSocial}
                </p>
                <p className="text-xs text-zinc-500 font-mono">{borrador.cliente.rut}</p>
              </div>
              <button
                onClick={() => navigate('/pedidos/nuevo/cliente')}
                className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-xl transition-all"
                title="Cambiar cliente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/pedidos/nuevo/cliente')}
              className="w-full bg-zinc-900 border border-dashed border-zinc-700 hover:border-brand-600/60 rounded-2xl p-5 flex items-center justify-between gap-3 transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 group-hover:bg-brand-600/20 flex items-center justify-center transition-colors">
                  <UserCircle2 className="w-5 h-5 text-zinc-600 group-hover:text-brand-400 transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-zinc-300">Seleccionar cliente</p>
                  <p className="text-xs text-zinc-600">Toca para buscar un cliente</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-400 transition-colors" />
            </button>
          )}
        </section>

        {/* ── Sección Artículos ────────────────────────────────────── */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Artículos
            </p>
            <button
              onClick={() => navigate('/pedidos/nuevo/items')}
              className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
          </div>

          {borrador.lineas.length === 0 ? (
            <button
              onClick={() => navigate('/pedidos/nuevo/items')}
              className="w-full bg-zinc-900 border border-dashed border-zinc-700 hover:border-brand-600/60 rounded-2xl p-5 flex items-center justify-between gap-3 transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 group-hover:bg-brand-600/20 flex items-center justify-center transition-colors">
                  <ShoppingBag className="w-5 h-5 text-zinc-600 group-hover:text-brand-400 transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-zinc-300">Agregar productos</p>
                  <p className="text-xs text-zinc-600">Toca para abrir el catálogo</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-400 transition-colors" />
            </button>
          ) : (
            <div className="space-y-2.5">
              {borrador.lineas.map((linea) => (
                <LineaPedidoCard
                  key={linea.id_producto}
                  linea={linea}
                  onCantidadChange={(_id, c) => actualizarCantidad(_id, c)}
                  onEliminar={eliminarLinea}
                />
              ))}

              {/* Botón agregar más */}
              <button
                onClick={() => navigate('/pedidos/nuevo/items')}
                className="w-full py-3 border border-dashed border-zinc-700 hover:border-brand-600/60 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-zinc-500 hover:text-brand-400 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar más productos
              </button>
            </div>
          )}
        </section>

        {/* ── Sección Notas ────────────────────────────────────────── */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Notas (opcional)
            </p>
          </div>
          <textarea
            value={borrador.notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Instrucciones de entrega, observaciones del pedido..."
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-brand-600 rounded-2xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-brand-600/50 transition-all"
          />
        </section>

        {/* Advertencia si falta algo */}
        {!puedeConfirmar && (borrador.cliente !== null || cantidadLineas > 0) && (
          <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400">
              {borrador.cliente === null
                ? 'Selecciona un cliente para continuar.'
                : 'Agrega al menos un artículo para confirmar el pedido.'}
            </p>
          </div>
        )}
      </div>

      {/* Footer fijo: Total + Confirmar */}
      {puedeConfirmar && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-2">
          <div className="max-w-lg mx-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-400">Total</p>
              <p className="text-xl font-black text-white">
                ${totalPedido.toLocaleString('es-CL')}
              </p>
            </div>
            <button
              onClick={() => navigate('/pedidos/nuevo/confirmar')}
              className="w-full py-3.5 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
            >
              Confirmar pedido →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
