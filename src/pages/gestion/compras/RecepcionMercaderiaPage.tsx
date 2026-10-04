import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  PackageCheck,
  Package,
  Barcode,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Building2,
  Layers,
  ShieldAlert,
  X,
} from 'lucide-react';
import BarcodeScannerModal, { isBarcodeScannerSupported } from '@/components/gestion/BarcodeScannerModal';
import {
  getOrdenCompraById,
  getProductosAdmin,
  registrarRecepcion,
  ApiRequestError,
} from '@/lib/api';
import {
  armarPayloadRecepcion,
  calcularDiferenciasRecepcion,
  validarFormularioRecepcion,
  esVencimientoPasado,
  traducirErrorRecepcion,
  type FilaLoteRecepcion,
  type CalculoDiferenciasRecepcion,
} from '@/lib/recepciones';
import { formatFecha, getHoyString } from '@/lib/compras';
import type { OrdenCompraDetalle, ProductoAdminItem } from '@/types';

export default function RecepcionMercaderiaPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const ordenId = Number(id);

  // Estados de datos
  const [orden, setOrden] = useState<OrdenCompraDetalle | null>(null);
  const [productosMap, setProductosMap] = useState<Map<number, ProductoAdminItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Formulario de recepción
  const [nroGuiaRemision, setNroGuiaRemision] = useState('');
  const [filas, setFilas] = useState<FilaLoteRecepcion[]>([]);
  const [checkboxDiferenciaConfirmado, setCheckboxDiferenciaConfirmado] = useState(false);

  // Validación y errores
  const [erroresGenerales, setErroresGenerales] = useState<string[]>([]);
  const [erroresPorFila, setErroresPorFila] = useState<
    Record<string, { cantidad?: string; numeroLote?: string; fechaVencimiento?: string }>
  >({});

  // Modal de confirmación final
  const [modalConfirmarOpen, setModalConfirmarOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<{
    titulo: string;
    descripcion: string;
    detallesCampos?: string[];
    yaRecibida?: boolean;
  } | null>(null);

  // Escaneo de código de barras
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mensajeEscaneo, setMensajeEscaneo] = useState<{
    tipo: 'exito' | 'error';
    texto: string;
  } | null>(null);
  const [highlightProductoId, setHighlightProductoId] = useState<number | null>(null);

  const hoyStr = useMemo(() => getHoyString(), []);

  // ─── Carga Inicial de Datos ───────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (isNaN(ordenId) || ordenId <= 0) {
      setErrorCarga('ID de orden de compra inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorCarga(null);

    try {
      // Cargar orden y productos en paralelo
      const [resOrden, resProds] = await Promise.all([
        getOrdenCompraById(ordenId),
        getProductosAdmin().catch(() => ({ data: [] })),
      ]);

      if (!resOrden?.data) {
        setErrorCarga('No se encontró la orden de compra solicitada.');
        return;
      }

      const ord = resOrden.data;
      setOrden(ord);

      // Mapear productos
      const pMap = new Map<number, ProductoAdminItem>();
      if (resProds?.data) {
        for (const p of resProds.data) {
          pMap.set(p.id, p);
        }
      }
      setProductosMap(pMap);

      // Si la orden está confirmada, precargar las filas del formulario
      if (ord.estado === 'confirmada' && ord.lineas) {
        const filasIniciales: FilaLoteRecepcion[] = ord.lineas.map((linea, index) => {
          const prodInfo = pMap.get(linea.id_producto);
          const unidad =
            linea.unidad_compra ||
            linea.nombre_unidad_compra ||
            linea.unidad_medida ||
            prodInfo?.nombreUnidadBase ||
            'unidad de compra';

          return {
            idFila: `row-${linea.id_producto}-${index}-${Date.now()}`,
            idProducto: linea.id_producto,
            nombreProducto: linea.producto_nombre || prodInfo?.nombre || `Producto #${linea.id_producto}`,
            codigoProducto: linea.producto_codigo || prodInfo?.codigoBarras,
            unidadCompra: unidad,
            cantidadPedida: linea.cantidad,
            cantidadRecibida: linea.cantidad,
            numeroLote: '',
            fechaVencimiento: '',
          };
        });

        setFilas(filasIniciales);
      }
    } catch (err: unknown) {
      console.error('[RecepcionMercaderiaPage] Error al cargar orden:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Error al conectar con el servidor.';
      setErrorCarga(msg);
    } finally {
      setLoading(false);
    }
  }, [ordenId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Cálculos Reactivos de Diferencias ────────────────────────────────────────

  const calculoDiferencias: CalculoDiferenciasRecepcion = useMemo(() => {
    if (!orden?.lineas) {
      return {
        hayDiferencias: false,
        productosConDiferencia: [],
        productosNoRecibidos: [],
        resumenPorProducto: {},
        totalItemsValidos: 0,
        totalCantidadRecibida: 0,
      };
    }
    return calcularDiferenciasRecepcion(orden.lineas, filas);
  }, [orden?.lineas, filas]);

  // ─── Manejo de Filas y Lotes ──────────────────────────────────────────────────

  const handleUpdateFila = (
    idFila: string,
    campo: 'cantidadRecibida' | 'numeroLote' | 'fechaVencimiento',
    valor: string
  ) => {
    setFilas((prev) =>
      prev.map((f) => (f.idFila === idFila ? { ...f, [campo]: valor } : f))
    );

    // Limpiar error específico de la fila
    setErroresPorFila((prev) => {
      if (!prev[idFila]) return prev;
      const copia = { ...prev };
      const errorKey = campo === 'cantidadRecibida' ? 'cantidad' : campo;
      delete copia[idFila][errorKey];
      if (Object.keys(copia[idFila]).length === 0) {
        delete copia[idFila];
      }
      return copia;
    });
  };

  const handleDividirLote = (idProducto: number) => {
    // Buscar la primera fila de este producto para tomar sus metadatos
    const filaBase = filas.find((f) => f.idProducto === idProducto);
    if (!filaBase) return;

    const nuevaFila: FilaLoteRecepcion = {
      idFila: `row-${idProducto}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      idProducto: filaBase.idProducto,
      nombreProducto: filaBase.nombreProducto,
      codigoProducto: filaBase.codigoProducto,
      unidadCompra: filaBase.unidadCompra,
      cantidadPedida: filaBase.cantidadPedida,
      cantidadRecibida: '',
      numeroLote: '',
      fechaVencimiento: '',
    };

    setFilas((prev) => [...prev, nuevaFila]);
  };

  const handleEliminarFila = (idFila: string) => {
    setFilas((prev) => prev.filter((f) => f.idFila !== idFila));
    setErroresPorFila((prev) => {
      const copia = { ...prev };
      delete copia[idFila];
      return copia;
    });
  };

  // ─── Escaneo de Código de Barras ──────────────────────────────────────────────

  const handleBarcodeScanned = (codigo: string) => {
    if (!codigo || !codigo.trim()) return;
    const cleanCode = codigo.trim().toLowerCase();

    // Buscar si algún producto de la orden coincide
    const lineaCoincidente = orden?.lineas?.find((l) => {
      const codLinea = l.producto_codigo?.toLowerCase();
      const prodInfo = productosMap.get(l.id_producto);
      const codProd = prodInfo?.codigoBarras?.toLowerCase();
      return codLinea === cleanCode || codProd === cleanCode;
    });

    if (!lineaCoincidente) {
      setMensajeEscaneo({
        tipo: 'error',
        texto: `El código "${codigo}" no corresponde a ningún producto de esta orden de compra.`,
      });
      return;
    }

    // Coincidencia encontrada
    const prodId = lineaCoincidente.id_producto;
    setHighlightProductoId(prodId);
    setMensajeEscaneo({
      tipo: 'exito',
      texto: `Producto identificado: ${
        lineaCoincidente.producto_nombre || `Producto #${prodId}`
      }`,
    });

    // Scroll y foco hacia la tarjeta del producto
    const elemento = document.getElementById(`producto-card-${prodId}`);
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const primerInput = elemento.querySelector('input') as HTMLInputElement | null;
      if (primerInput) {
        setTimeout(() => primerInput.focus(), 300);
      }
    }

    // Quitar highlight después de 3 segundos
    setTimeout(() => {
      setHighlightProductoId(null);
    }, 3000);
  };

  // ─── Validación y Apertura de Resumen ─────────────────────────────────────────

  const handleAbrirConfirmacion = () => {
    const validacion = validarFormularioRecepcion({
      filas,
      hayDiferencias: calculoDiferencias.hayDiferencias,
      checkboxDiferenciaConfirmado,
    });

    setErroresGenerales(validacion.erroresGenerales);
    setErroresPorFila(validacion.erroresPorFila);

    if (!validacion.valido) {
      // Scroll al primer error o arriba
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrorEnvio(null);
    setModalConfirmarOpen(true);
  };

  // ─── Envío Final con Manejo de Errores y Verificación de Estado ───────────────

  const handleConfirmarRecepcion = async () => {
    if (!orden) return;

    setEnviando(true);
    setErrorEnvio(null);

    const payload = armarPayloadRecepcion({
      idOrdenCompra: orden.id,
      nroGuiaRemision,
      filas,
    });

    try {
      await registrarRecepcion(payload);

      // Éxito: volver al detalle de la orden con mensaje
      navigate(`/gestion/compras/${orden.id}`, {
        replace: true,
        state: {
          exitoMsg:
            'Mercadería recibida exitosamente. El stock fue ingresado a depósito y la orden fue marcada como recibida.',
          recienRecibida: true,
        },
      });
    } catch (err: unknown) {
      console.error('[RecepcionMercaderiaPage] Error al registrar recepción:', err);

      // Cerrar modal de confirmación para que el usuario vea el diagnóstico
      setModalConfirmarOpen(false);

      const trad = traducirErrorRecepcion(err);

      // REGLA CRÍTICA: Ante error genérico o de red, recargar la orden antes de ofrecer reintentar
      if (!trad.esErrorConversion && !trad.esErrorEstado) {
        try {
          const checkOrden = await getOrdenCompraById(orden.id);
          if (checkOrden?.data?.estado === 'recibida') {
            setErrorEnvio({
              titulo: 'La recepción ya fue registrada en el servidor',
              descripcion:
                'Ocurrió un error en la respuesta del servidor, pero al verificar el estado de la orden se comprobó que ya figura como RECIBIDA en el sistema. Para evitar duplicar inventario, no vuelva a enviar este formulario.',
              yaRecibida: true,
            });
            return;
          }
        } catch {
          // Si la recarga falló, mostrar el error original
        }
      }

      setErrorEnvio({
        titulo: trad.titulo,
        descripcion: trad.descripcion,
        detallesCampos: trad.detallesCampos,
        yaRecibida: false,
      });

      // Scroll arriba para ver el error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setEnviando(false);
    }
  };

  // ─── Agrupación de Filas por Producto ─────────────────────────────────────────

  const filasAgrupadasPorProducto = useMemo(() => {
    const mapa = new Map<number, FilaLoteRecepcion[]>();
    for (const fila of filas) {
      const arr = mapa.get(fila.idProducto) || [];
      arr.push(fila);
      mapa.set(fila.idProducto, arr);
    }
    return mapa;
  }, [filas]);

  // ─── Render: Loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-dvh bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-xs text-zinc-500 font-medium">Cargando orden de compra #{ordenId}...</p>
      </div>
    );
  }

  // ─── Render: Error de Carga / Orden No Encontrada ──────────────────────────────

  if (errorCarga || !orden) {
    return (
      <div className="min-h-dvh bg-zinc-950 flex flex-col">
        <header className="sticky top-0 z-30 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={() => navigate('/gestion/compras')}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-white">Recepción de Mercadería</h1>
            <div className="w-8" />
          </div>
        </header>

        <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-3xl max-w-sm w-full space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h2 className="text-sm font-bold text-white">No se pudo cargar la orden</h2>
            <p className="text-xs text-zinc-400">{errorCarga || 'Orden no encontrada.'}</p>
            <button
              onClick={() => navigate('/gestion/compras')}
              className="w-full mt-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Volver a Órdenes de Compra
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ─── Render: Orden en Estado Distinto de 'confirmada' ──────────────────────────

  if (orden.estado !== 'confirmada') {
    const estadosMensajes: Record<string, { titulo: string; desc: string; color: string }> = {
      borrador: {
        titulo: 'Orden en Borrador',
        desc: 'Esta orden se encuentra en borrador. Debe confirmarse antes de poder registrar recepciones de mercadería.',
        color: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      },
      recibida: {
        titulo: 'Orden ya Recibida',
        desc: 'Esta orden ya fue recibida en su totalidad. El stock ya fue impactado en el depósito y no admite nuevas recepciones.',
        color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      },
      cancelada: {
        titulo: 'Orden Cancelada',
        desc: 'Esta orden fue cancelada y se encuentra cerrada. No es posible registrar recepciones.',
        color: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
      },
    };

    const info = estadosMensajes[orden.estado] || {
      titulo: `Estado "${orden.estado}" no válido`,
      desc: 'Solo se pueden recibir órdenes en estado "confirmada".',
      color: 'border-zinc-700 bg-zinc-900 text-zinc-300',
    };

    return (
      <div className="min-h-dvh bg-zinc-950 flex flex-col">
        <header className="sticky top-0 z-30 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={() => navigate(`/gestion/compras/${orden.id}`)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-white">Recepción de Mercadería #{orden.id}</h1>
            <div className="w-8" />
          </div>
        </header>

        <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col items-center justify-center text-center">
          <div className={`p-6 border rounded-3xl w-full space-y-4 shadow-xl ${info.color}`}>
            <ShieldAlert className="w-12 h-12 mx-auto opacity-90" />
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-white">{info.titulo}</h2>
              <p className="text-xs text-zinc-300 leading-relaxed">{info.desc}</p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate(`/gestion/compras/${orden.id}`)}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Volver al Detalle de la Orden
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── Render Principal: Formulario de Recepción ────────────────────────────────

  return (
    <div className="min-h-dvh bg-zinc-950 flex flex-col text-white pb-24">
      {/* Header Sticky */}
      <header className="sticky top-0 z-30 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/gestion/compras/${orden.id}`)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              title="Volver al detalle"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Recibir Mercadería #{orden.id}</span>
              </h1>
              <p className="text-[11px] text-zinc-400 truncate max-w-[200px] sm:max-w-md">
                {orden.proveedor_nombre || 'Proveedor no especificado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isBarcodeScannerSupported && (
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                title="Escanear código de barras"
              >
                <Barcode className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">Escanear</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadData}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              title="Refrescar datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4">
        {/* Banner de Mensaje de Escaneo */}
        {mensajeEscaneo && (
          <div
            className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs animate-fade-in ${
              mensajeEscaneo.tipo === 'exito'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {mensajeEscaneo.tipo === 'exito' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{mensajeEscaneo.texto}</span>
            </div>
            <button
              onClick={() => setMensajeEscaneo(null)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Banner de Error de Envío */}
        {errorEnvio && (
          <div className="p-4 bg-rose-500/15 border border-rose-500/40 rounded-3xl space-y-2 text-xs text-rose-200 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <h3 className="font-bold text-rose-300 text-sm">{errorEnvio.titulo}</h3>
                <p className="leading-relaxed">{errorEnvio.descripcion}</p>
                {errorEnvio.detallesCampos && errorEnvio.detallesCampos.length > 0 && (
                  <ul className="list-disc pl-4 space-y-0.5 text-zinc-300 pt-1">
                    {errorEnvio.detallesCampos.map((det, idx) => (
                      <li key={idx} className="font-mono text-[11px]">
                        {det}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {errorEnvio.yaRecibida && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/gestion/compras/${orden.id}`)}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-md"
                >
                  Ir al Detalle de la Orden
                </button>
              </div>
            )}
          </div>
        )}

        {/* Errores Generales de Validación */}
        {erroresGenerales.length > 0 && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-1.5 text-xs text-rose-300">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Por favor corrija los siguientes puntos antes de continuar:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-zinc-300">
              {erroresGenerales.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 1. Datos Generales de la Recepción */}
        <section className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Información de Orden
              </span>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-400" />
                <span>{orden.proveedor_nombre}</span>
              </h2>
              {orden.proveedor_rut && (
                <p className="text-xs text-zinc-400">RUT: {orden.proveedor_rut}</p>
              )}
            </div>

            <div className="text-left sm:text-right text-xs space-y-0.5">
              <span className="text-zinc-400 block text-[11px]">Entrega Estimada</span>
              <span className="font-semibold text-zinc-200">
                {orden.fecha_entrega_estimada ? formatFecha(orden.fecha_entrega_estimada) : 'Sin fecha'}
              </span>
            </div>
          </div>

          {/* Campo: Guía de Remisión (Opcional) */}
          <div className="space-y-1">
            <label htmlFor="nroGuiaRemision" className="block text-xs font-bold text-zinc-300">
              Número de Guía de Remisión <span className="text-zinc-500 font-normal">(Opcional)</span>
            </label>
            <input
              id="nroGuiaRemision"
              type="text"
              value={nroGuiaRemision}
              onChange={(e) => setNroGuiaRemision(e.target.value)}
              placeholder="Ej: GR-2026-9901"
              className="w-full bg-zinc-950/70 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all"
            />
            <p className="text-[11px] text-zinc-500">
              Si el transportista o proveedor entregó una guía física o electrónica, regístrela aquí para auditoría.
            </p>
          </div>
        </section>

        {/* 2. Productos y Lotes a Recibir */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-rose-400" />
                <span>Productos a Recibir ({orden.lineas?.length || 0})</span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Ingrese lote y vencimiento por cada producto. Puede dividir en varios lotes si llegó mezclado.
              </p>
            </div>
          </div>

          {/* Lista de Tarjetas de Productos */}
          {orden.lineas?.map((linea) => {
            const prodId = linea.id_producto;
            const filasDelProducto = filasAgrupadasPorProducto.get(prodId) || [];
            const dif = calculoDiferencias.resumenPorProducto[prodId];
            const isHighlighted = highlightProductoId === prodId;

            return (
              <div
                key={prodId}
                id={`producto-card-${prodId}`}
                className={`bg-zinc-900/80 border rounded-3xl p-5 space-y-4 shadow-lg transition-all ${
                  isHighlighted
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-zinc-900'
                    : 'border-zinc-800'
                }`}
              >
                {/* Cabecera del Producto */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-extrabold text-white">
                      {linea.producto_nombre || `Producto #${prodId}`}
                    </h4>
                    {linea.producto_codigo && (
                      <p className="text-[11px] text-zinc-400 font-mono">
                        SKU / Código: {linea.producto_codigo}
                      </p>
                    )}
                  </div>

                  {/* Resumen de cantidades de este producto */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="bg-zinc-950/70 border border-zinc-800/80 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] text-zinc-400 block uppercase font-medium">
                        Pedido Original
                      </span>
                      <span className="font-extrabold text-white">
                        {linea.cantidad} {filasDelProducto[0]?.unidadCompra || 'unidades'}
                      </span>
                    </div>

                    <div
                      className={`border px-3 py-1.5 rounded-xl ${
                        dif?.noRecibido
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : dif?.tieneDiferencia
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      <span className="text-[10px] block uppercase font-medium opacity-80">
                        Total Recibiendo
                      </span>
                      <span className="font-black">
                        {dif?.cantidadRecibida || 0} {filasDelProducto[0]?.unidadCompra || 'unidades'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aviso si la suma difiere o es 0 */}
                {dif?.tieneDiferencia && (
                  <div
                    className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 ${
                      dif.noRecibido
                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {dif.noRecibido
                        ? `Línea sin cantidad: este producto no entrará al stock.`
                        : `Diferencia de cantidad: Pedido ${dif.cantidadPedida}, recibido ${dif.cantidadRecibida} (${
                            dif.diferencia > 0 ? `+${dif.diferencia}` : dif.diferencia
                          }).`}
                    </span>
                  </div>
                )}

                {/* Filas de Lotes para este Producto */}
                <div className="space-y-3">
                  {filasDelProducto.map((fila, idx) => {
                    const errFila = erroresPorFila[fila.idFila] || {};
                    const esVencido = esVencimientoPasado(fila.fechaVencimiento, hoyStr);

                    return (
                      <div
                        key={fila.idFila}
                        className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Lote #{idx + 1}</span>
                          </span>

                          {filasDelProducto.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleEliminarFila(fila.idFila)}
                              className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px]"
                              title="Eliminar este lote"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Quitar lote</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Cantidad recibida en este lote */}
                          <div>
                            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                              Cant. Recibida ({fila.unidadCompra || 'unidad de compra'}) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={fila.cantidadRecibida}
                              onChange={(e) =>
                                handleUpdateFila(fila.idFila, 'cantidadRecibida', e.target.value)
                              }
                              placeholder="0"
                              className={`w-full bg-zinc-900 border rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none transition-colors ${
                                errFila.cantidad
                                  ? 'border-rose-500 focus:border-rose-400'
                                  : 'border-zinc-700 focus:border-emerald-500'
                              }`}
                            />
                            {errFila.cantidad && (
                              <p className="text-[10px] text-rose-400 mt-1">{errFila.cantidad}</p>
                            )}
                          </div>

                          {/* Número de Lote */}
                          <div>
                            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                              N° de Lote *
                            </label>
                            <input
                              type="text"
                              value={fila.numeroLote}
                              onChange={(e) =>
                                handleUpdateFila(fila.idFila, 'numeroLote', e.target.value)
                              }
                              placeholder="Ej: LOT-2026-A1"
                              className={`w-full bg-zinc-900 border rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none transition-colors font-mono ${
                                errFila.numeroLote
                                  ? 'border-rose-500 focus:border-rose-400'
                                  : 'border-zinc-700 focus:border-emerald-500'
                              }`}
                            />
                            {errFila.numeroLote && (
                              <p className="text-[10px] text-rose-400 mt-1">{errFila.numeroLote}</p>
                            )}
                          </div>

                          {/* Fecha de Vencimiento */}
                          <div>
                            <label className="block text-[11px] font-medium text-zinc-400 mb-1 flex items-center justify-between">
                              <span>Vencimiento *</span>
                              {esVencido && (
                                <span className="text-[10px] text-rose-400 font-bold">
                                  ¡Vencido / Hoy!
                                </span>
                              )}
                            </label>
                            <div className="relative">
                              <input
                                type="date"
                                value={fila.fechaVencimiento}
                                onChange={(e) =>
                                  handleUpdateFila(fila.idFila, 'fechaVencimiento', e.target.value)
                                }
                                className={`w-full bg-zinc-900 border rounded-xl px-3 py-2 text-xs text-white outline-none transition-colors ${
                                  errFila.fechaVencimiento
                                    ? 'border-rose-500 focus:border-rose-400'
                                    : esVencido
                                    ? 'border-rose-500/80 text-rose-200'
                                    : 'border-zinc-700 focus:border-emerald-500'
                                }`}
                              />
                            </div>
                            {errFila.fechaVencimiento && (
                              <p className="text-[10px] text-rose-400 mt-1">
                                {errFila.fechaVencimiento}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón: Dividir en otro lote */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleDividirLote(prodId)}
                    className="px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-600 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Dividir en otro lote</span>
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* 3. Checkbox de Confirmación si hay Diferencias */}
        {calculoDiferencias.hayDiferencias && (
          <section className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 sm:p-5 space-y-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-300">
                  Discrepancias detectadas con la orden original
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Las cantidades que está por ingresar difieren de lo solicitado en la orden de compra.
                  Al registrar esta recepción, la orden se marcará como <strong>recibida</strong> de forma definitiva y no se podrán registrar entregas adicionales para el saldo faltante.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 bg-zinc-950/60 border border-amber-500/20 rounded-2xl cursor-pointer hover:bg-zinc-950/80 transition-colors">
              <input
                type="checkbox"
                checked={checkboxDiferenciaConfirmado}
                onChange={(e) => setCheckboxDiferenciaConfirmado(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-700"
              />
              <span className="text-xs text-zinc-200 select-none">
                La cantidad difiere de lo pedido; entiendo que la orden se cierra igual y no se puede recibir el resto.
              </span>
            </label>
          </section>
        )}

        {/* 4. Botón de Acción Principal */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAbrirConfirmacion}
            disabled={enviando}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <PackageCheck className="w-5 h-5" />
            <span>Revisar y Confirmar Recepción</span>
          </button>
        </div>
      </main>

      {/* ─── Modal Resumen de Confirmación Final (Irreversible) ────────────────── */}
      {modalConfirmarOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            {/* Header del Modal */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-black text-white">Confirmar Recepción de Mercadería</h3>
                  <p className="text-[11px] text-zinc-400">Orden #{orden.id} · {orden.proveedor_nombre}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalConfirmarOpen(false)}
                disabled={enviando}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido con scroll */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Info de Guía */}
              {nroGuiaRemision && (
                <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl flex items-center justify-between">
                  <span className="text-zinc-400">Guía de Remisión:</span>
                  <span className="font-mono font-bold text-white">{nroGuiaRemision}</span>
                </div>
              )}

              {/* Lista de lotes que entrarán al stock */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Stock a Ingresar a Depósito ({calculoDiferencias.totalItemsValidos} {calculoDiferencias.totalItemsValidos === 1 ? 'lote' : 'lotes'}):
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {filas
                    .filter((f) => Number(f.cantidadRecibida) > 0)
                    .map((f, idx) => (
                      <div
                        key={idx}
                        className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-zinc-200">{f.nombreProducto}</p>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <span className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-300">
                              Lote: {f.numeroLote}
                            </span>
                            <span>Vence: {formatFecha(f.fechaVencimiento)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-emerald-400 text-sm">
                            +{f.cantidadRecibida}
                          </span>
                          <span className="block text-[10px] text-zinc-400">
                            {f.unidadCompra || 'unidad de compra'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Productos Omitidos / No Recibidos */}
              {calculoDiferencias.productosNoRecibidos.length > 0 && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
                  <span className="font-bold text-rose-300 text-[11px] block">
                    Productos no recibidos (no ingresarán al stock):
                  </span>
                  <ul className="list-disc pl-4 text-[11px] text-zinc-300 space-y-0.5">
                    {calculoDiferencias.productosNoRecibidos.map((p) => (
                      <li key={p.idProducto}>
                        {p.nombreProducto} (Pedido original: {p.cantidadPedida})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advertencia de Irreversibilidad */}
              <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-2xl space-y-1.5 text-amber-200 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Operación Irreversible</span>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-300">
                  Al confirmar, los lotes ingresarán inmediatamente al inventario del depósito y la orden pasará a estado <strong>recibida</strong>. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            {/* Footer de Acciones del Modal */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalConfirmarOpen(false)}
                disabled={enviando}
                className="w-full sm:w-auto px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-colors"
              >
                Volver a editar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRecepcion}
                disabled={enviando}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Ingresando stock...</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    <span>Confirmar e ingresar al stock</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal de Escaneo de Códigos de Barras ──────────────────────────────── */}
      {scannerOpen && (
        <BarcodeScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleBarcodeScanned}
          title="Escanear Producto de la Orden"
          subtitle="Apunta la cámara al código de barras del producto"
        />
      )}
    </div>
  );
}
