import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  DollarSign,
  Banknote,
  CreditCard,
  FileText,
  QrCode,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calendar,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import {
  api,
  getClientesSaldosPendientes,
  getVentasPendientesByCliente,
  ApiRequestError,
} from '@/lib/api';
import type { SaldoCliente, VentaPendiente } from '@/types';

type MetodoPagoCobro = 'efectivo' | 'transferencia' | 'cheque' | 'pago_online';

const METODOS_PAGO: Array<{
  id: MetodoPagoCobro;
  label: string;
  icon: typeof Banknote;
}> = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'transferencia', label: 'Transferencia', icon: CreditCard },
  { id: 'cheque', label: 'Cheque', icon: FileText },
  { id: 'pago_online', label: 'Pago Online', icon: QrCode },
];

export default function CuentasCorrientesPage() {
  const navigate = useNavigate();

  // Estados principales
  const [clientes, setClientes] = useState<SaldoCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados de expansión
  const [expandedClienteId, setExpandedClienteId] = useState<number | null>(null);
  const [ventasByCliente, setVentasByCliente] = useState<Record<number, VentaPendiente[]>>({});
  const [loadingVentas, setLoadingVentas] = useState<Record<number, boolean>>({});
  const [errorVentas, setErrorVentas] = useState<Record<number, string | null>>({});

  // Estados del formulario de cobro
  const [cobrandoVenta, setCobrandoVenta] = useState<VentaPendiente | null>(null);
  const [cobrandoClienteId, setCobrandoClienteId] = useState<number | null>(null);
  const [montoCobro, setMontoCobro] = useState<string>('');
  const [metodoCobro, setMetodoCobro] = useState<MetodoPagoCobro>('efectivo');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [enviandoCobro, setEnviandoCobro] = useState(false);
  const [errorCobro, setErrorCobro] = useState<string | null>(null);
  const [cobroExitosoMsg, setCobroExitosoMsg] = useState<string | null>(null);

  // 1. Cargar saldos de todos los clientes
  const loadClientesSaldos = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getClientesSaldosPendientes();
      const data = res?.data || [];
      // Filtrar únicamente los que tienen saldo pendiente > 0
      const conSaldo = data.filter((c) => (c.saldoPendienteTotal || 0) > 0);
      setClientes(conSaldo);
    } catch (err: unknown) {
      console.error('[CuentasCorrientes] Error al cargar saldos:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudieron cargar los saldos de clientes.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClientesSaldos();
  }, [loadClientesSaldos]);

  // 2. Cargar ventas de un cliente específico
  const loadVentasCliente = async (clienteId: number) => {
    setLoadingVentas((prev) => ({ ...prev, [clienteId]: true }));
    setErrorVentas((prev) => ({ ...prev, [clienteId]: null }));
    try {
      const res = await getVentasPendientesByCliente(clienteId);
      const data = res?.data || [];
      setVentasByCliente((prev) => ({ ...prev, [clienteId]: data }));
    } catch (err: unknown) {
      console.error(`[CuentasCorrientes] Error al cargar ventas cliente ${clienteId}:`, err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudieron cargar las ventas pendientes.';
      setErrorVentas((prev) => ({ ...prev, [clienteId]: msg }));
    } finally {
      setLoadingVentas((prev) => ({ ...prev, [clienteId]: false }));
    }
  };

  // Toggle expandir cliente
  const handleToggleCliente = (clienteId: number) => {
    if (expandedClienteId === clienteId) {
      setExpandedClienteId(null);
      setCobrandoVenta(null);
    } else {
      setExpandedClienteId(clienteId);
      setCobrandoVenta(null);
      setErrorCobro(null);
      setCobroExitosoMsg(null);
      if (!ventasByCliente[clienteId]) {
        loadVentasCliente(clienteId);
      }
    }
  };

  // Abrir formulario de cobro para una venta
  const handleAbrirCobro = (venta: VentaPendiente, clienteId: number) => {
    setCobrandoVenta(venta);
    setCobrandoClienteId(clienteId);
    setMontoCobro(String(venta.saldoRestante));
    setMetodoCobro('efectivo');
    setNumeroDocumento('');
    setErrorCobro(null);
    setCobroExitosoMsg(null);
  };

  const handleCancelarCobro = () => {
    setCobrandoVenta(null);
    setCobrandoClienteId(null);
    setErrorCobro(null);
  };

  // Confirmar cobro
  const handleConfirmarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cobrandoVenta || !cobrandoClienteId) return;

    const montoNum = Math.round(parseFloat(montoCobro));
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorCobro('Ingresa un monto válido mayor a 0.');
      return;
    }

    if (montoNum > cobrandoVenta.saldoRestante) {
      setErrorCobro(
        `El monto ($${montoNum.toLocaleString('es-CL')}) no puede exceder el saldo restante ($${cobrandoVenta.saldoRestante.toLocaleString('es-CL')}).`
      );
      return;
    }

    setEnviandoCobro(true);
    setErrorCobro(null);

    const payload = {
      idOrdenVenta: cobrandoVenta.id,
      monto: montoNum,
      metodo: metodoCobro,
      numeroDocumento: numeroDocumento.trim() ? numeroDocumento.trim() : null,
    };

    try {
      await api.post('/api/v1/sales/payments', payload);

      setCobroExitosoMsg(
        `Cobro de $${montoNum.toLocaleString('es-CL')} registrado exitosamente para la Venta #${cobrandoVenta.id}.`
      );
      setCobrandoVenta(null);
      setCobrandoClienteId(null);

      // 1. Refrescar ventas del cliente
      const resVentas = await getVentasPendientesByCliente(cobrandoClienteId);
      const updatedVentas = resVentas?.data || [];
      setVentasByCliente((prev) => ({ ...prev, [cobrandoClienteId]: updatedVentas }));

      // 2. Refrescar lista de clientes global
      const resClientes = await getClientesSaldosPendientes();
      const updatedClientes = (resClientes?.data || []).filter(
        (c) => (c.saldoPendienteTotal || 0) > 0
      );
      setClientes(updatedClientes);

      // Si el cliente ya no tiene ventas pendientes, colapsarlo
      if (updatedVentas.length === 0) {
        setExpandedClienteId(null);
      }
    } catch (err: unknown) {
      console.error('[CuentasCorrientes] Error al registrar cobro:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Error al registrar el cobro.';
      setErrorCobro(msg);
    } finally {
      setEnviandoCobro(false);
    }
  };

  const formatearFecha = (fechaStr: string) => {
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return fechaStr;
      return d.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return fechaStr;
    }
  };

  const totalDeudaGlobal = clientes.reduce(
    (acc, c) => acc + (c.saldoPendienteTotal || 0),
    0
  );

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
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white">Cuentas Corrientes</h1>
          </div>

          <div className="w-16 flex justify-end">
            <button
              onClick={loadClientesSaldos}
              title="Refrescar saldos"
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs">Cargando cuentas corrientes...</p>
          </div>
        ) : errorMsg ? (
          <div className="space-y-4 py-8">
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
            <button
              onClick={loadClientesSaldos}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl text-xs font-bold transition-all"
            >
              Reintentar
            </button>
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-zinc-100">Todos los clientes están al día</p>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              No se registran ventas con saldos pendientes de cobro en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen Superior */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Total Deuda en Calle
                </p>
                <p className="text-xl font-black text-amber-400 font-mono mt-0.5">
                  ${totalDeudaGlobal.toLocaleString('es-CL')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-zinc-300">
                  {clientes.length} {clientes.length === 1 ? 'cliente con deuda' : 'clientes con deuda'}
                </p>
              </div>
            </div>

            {/* Mensaje de Cobro Exitoso */}
            {cobroExitosoMsg && (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-start gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-300">
                  <p className="font-bold">¡Cobro Registrado!</p>
                  <p className="text-emerald-300/90 mt-0.5 leading-relaxed">{cobroExitosoMsg}</p>
                </div>
              </div>
            )}

            {/* Lista de Clientes con Deuda */}
            <div className="space-y-3">
              {clientes.map((c) => {
                const isExpanded = expandedClienteId === c.idCliente;
                const ventas = ventasByCliente[c.idCliente] || [];
                const isLoadingVentas = Boolean(loadingVentas[c.idCliente]);
                const errorVenta = errorVentas[c.idCliente];

                return (
                  <div
                    key={c.idCliente}
                    className={`border rounded-2xl transition-all overflow-hidden ${
                      isExpanded
                        ? 'bg-zinc-900/90 border-zinc-700 shadow-lg'
                        : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    {/* Header del Cliente */}
                    <div
                      onClick={() => handleToggleCliente(c.idCliente)}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0 text-emerald-400">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-zinc-100 truncate">
                            {c.razonSocial}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {c.totalVentasPendientes}{' '}
                            {c.totalVentasPendientes === 1
                              ? 'venta pendiente'
                              : 'ventas pendientes'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                            Saldo
                          </span>
                          <span className="text-sm font-black text-amber-400 font-mono">
                            ${c.saldoPendienteTotal.toLocaleString('es-CL')}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Detalle Desplegable de Ventas */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800 px-4 py-3.5 bg-zinc-950/60 space-y-3 animate-fade-in">
                        {isLoadingVentas ? (
                          <div className="flex items-center justify-center py-6 gap-2 text-zinc-500 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                            <span>Cargando ventas pendientes...</span>
                          </div>
                        ) : errorVenta ? (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center justify-between">
                            <span>{errorVenta}</span>
                            <button
                              onClick={() => loadVentasCliente(c.idCliente)}
                              className="text-xs font-bold underline ml-2"
                            >
                              Reintentar
                            </button>
                          </div>
                        ) : ventas.length === 0 ? (
                          <p className="text-xs text-zinc-500 py-3 text-center">
                            No se encontraron ventas pendientes para este cliente.
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Ventas por cobrar
                            </p>

                            {ventas.map((v) => {
                              const isCobrandoThis = cobrandoVenta?.id === v.id;
                              const isParcial = v.estadoCobro === 'cobrado_parcial';

                              return (
                                <div
                                  key={v.id}
                                  className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-black text-zinc-200 font-mono">
                                        Venta #{v.id}
                                      </span>
                                      <span
                                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                          isParcial
                                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                            : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                                        }`}
                                      >
                                        {isParcial ? 'Parcial' : 'Pendiente'}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatearFecha(v.fechaVenta)}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/80 p-2.5 rounded-lg">
                                    <div>
                                      <span className="text-[10px] text-zinc-500 block">Total</span>
                                      <span className="font-semibold text-zinc-300">
                                        ${v.montoTotal.toLocaleString('es-CL')}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-zinc-500 block">
                                        Saldo Restante
                                      </span>
                                      <span className="font-bold text-amber-400 font-mono">
                                        ${v.saldoRestante.toLocaleString('es-CL')}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Botón para Cobrar o Formulario Activo */}
                                  {isCobrandoThis ? (
                                    /* ── Formulario de Cobro Inline ── */
                                    <form
                                      onSubmit={handleConfirmarCobro}
                                      className="pt-2 border-t border-zinc-800 space-y-3 animate-fade-in"
                                    >
                                      {/* Monto */}
                                      <div>
                                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                                          Monto a Cobrar ($)
                                        </label>
                                        <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                                            $
                                          </span>
                                          <input
                                            type="number"
                                            inputMode="numeric"
                                            min="1"
                                            max={v.saldoRestante}
                                            value={montoCobro}
                                            onChange={(e) => setMontoCobro(e.target.value)}
                                            className="w-full pl-7 pr-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-lg text-sm font-bold text-white font-mono focus:outline-none transition-colors"
                                          />
                                        </div>
                                      </div>

                                      {/* Métodos de Pago */}
                                      <div>
                                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                                          Método de Pago
                                        </label>
                                        <div className="grid grid-cols-2 gap-1.5">
                                          {METODOS_PAGO.map((m) => {
                                            const Icon = m.icon;
                                            const isSelected = metodoCobro === m.id;
                                            return (
                                              <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => setMetodoCobro(m.id)}
                                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold transition-all ${
                                                  isSelected
                                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                                                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                                }`}
                                              >
                                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">{m.label}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Nº Comprobante opcional */}
                                      {(metodoCobro === 'transferencia' ||
                                        metodoCobro === 'cheque') && (
                                        <div>
                                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                                            Nº Comprobante / Cheque (Opcional)
                                          </label>
                                          <input
                                            type="text"
                                            value={numeroDocumento}
                                            onChange={(e) => setNumeroDocumento(e.target.value)}
                                            placeholder="Ej: Transf 12345"
                                            className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-lg text-xs text-zinc-200 focus:outline-none transition-colors"
                                          />
                                        </div>
                                      )}

                                      {/* Error de Cobro */}
                                      {errorCobro && (
                                        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
                                          {errorCobro}
                                        </div>
                                      )}

                                      {/* Acciones */}
                                      <div className="flex items-center gap-2 pt-1">
                                        <button
                                          type="submit"
                                          disabled={enviandoCobro}
                                          className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md disabled:opacity-50"
                                        >
                                          {enviandoCobro ? (
                                            <>
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              <span>Registrando...</span>
                                            </>
                                          ) : (
                                            <>
                                              <DollarSign className="w-3.5 h-3.5" />
                                              <span>Confirmar Cobro</span>
                                            </>
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleCancelarCobro}
                                          disabled={enviandoCobro}
                                          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition-colors"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirCobro(v, c.idCliente)}
                                      className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
                                    >
                                      <DollarSign className="w-3.5 h-3.5" />
                                      <span>Cobrar Venta #{v.id}</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
