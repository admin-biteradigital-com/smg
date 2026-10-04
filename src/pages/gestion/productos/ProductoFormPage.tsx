import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Package,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Boxes,
  Globe,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Store,
  Plus,
  Trash2,
  Camera,
  Barcode,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';
import BarcodeScannerModal, { isBarcodeScannerSupported } from '@/components/gestion/BarcodeScannerModal';
import {
  getUnidadesMedida,
  getProductoAdminById,
  createProducto,
  updateProducto,
  getProveedoresAdmin,
  asociarProveedorAProducto,
  desasociarProveedorDeProducto,
  ApiRequestError,
} from '@/lib/api';
import type { UnidadMedidaItem, ProveedorAdminItem, ProveedorProductoItem } from '@/types';
import { formatRut } from '@/lib/rut';

export default function ProductoFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  // Estados de datos y carga
  const [unidades, setUnidades] = useState<UnidadMedidaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Estados de feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [advertenciaMsg, setAdvertenciaMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);
  const [idProductoCreado, setIdProductoCreado] = useState<number | null>(null);

  // Proveedores (ADR-019)
  const [proveedoresAsociados, setProveedoresAsociados] = useState<ProveedorProductoItem[]>([]);
  const [todosProveedores, setTodosProveedores] = useState<ProveedorAdminItem[]>([]);
  const [selectedProveedorId, setSelectedProveedorId] = useState<string>('');
  const [asociando, setAsociando] = useState(false);
  const [desasociandoId, setDesasociandoId] = useState<number | null>(null);
  const [proveedorParaQuitar, setProveedorParaQuitar] = useState<ProveedorProductoItem | null>(null);
  const [proveedorErrorMsg, setProveedorErrorMsg] = useState<string | null>(null);
  const [proveedorExitoMsg, setProveedorExitoMsg] = useState<string | null>(null);

  // Detección de soporte nativo para BarcodeDetector
  // TODO: BarcodeDetector no funciona en iOS Safari — evaluar @zxing/browser si se necesita soporte cross-browser
  const hasBarcodeDetector = isBarcodeScannerSupported;
  const [scannerOpen, setScannerOpen] = useState(false);
  const [codigoParaConfirmar, setCodigoParaConfirmar] = useState<string | null>(null);

  // Campos: Identificación
  const [nombre, setNombre] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [idUnidadBase, setIdUnidadBase] = useState<string>('');
  const [descripcion, setDescripcion] = useState('');

  // Campos: Precios (CLP)
  const [precioUnitarioSugerido, setPrecioUnitarioSugerido] = useState<string>('');
  const [precioCosto, setPrecioCosto] = useState<string>('');
  const [precioPublico, setPrecioPublico] = useState<string>('');

  // Campos: Inventario
  const [stockSeguridadMinimo, setStockSeguridadMinimo] = useState<string>('');
  const [idUnidadVenta, setIdUnidadVenta] = useState<string>('');
  const [idUnidadCompra, setIdUnidadCompra] = useState<string>('');

  // Campos: Visibilidad
  const [activo, setActivo] = useState<number>(1);
  const [visiblePublico, setVisiblePublico] = useState<number>(0);

  // Carga inicial: unidades y catálogo de proveedores
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      setAdvertenciaMsg(null);
      try {
        const [resUnidades, resProv] = await Promise.all([
          getUnidadesMedida(),
          getProveedoresAdmin({ activo: true, pageSize: 500 }).catch((e) => {
            console.error('[ProductoFormPage] Error al cargar proveedores:', e);
            return { data: [] as ProveedorAdminItem[] };
          }),
        ]);
        const listaUnidades = resUnidades?.data || [];
        setUnidades(listaUnidades);
        setTodosProveedores(resProv?.data || []);

        // Si es creación y no hay unidad base seleccionada, seleccionamos la primera disponible
        if (!isEditing && listaUnidades.length > 0) {
          setIdUnidadBase(String(listaUnidades[0].id));
        }

        // Si es edición, cargar el producto
        if (isEditing && id) {
          const resProd = await getProductoAdminById(Number(id));

          if (resProd?.data) {
            const prod = resProd.data;
            setNombre(prod.nombre || '');
            setCodigoBarras(prod.codigoBarras || '');
            setIdUnidadBase(prod.idUnidadBase ? String(prod.idUnidadBase) : '');
            setDescripcion(prod.descripcion || '');

            setPrecioUnitarioSugerido(
              prod.precioUnitarioSugerido !== null && prod.precioUnitarioSugerido !== undefined
                ? String(prod.precioUnitarioSugerido)
                : ''
            );
            setPrecioCosto(
              prod.precioCosto !== null && prod.precioCosto !== undefined
                ? String(prod.precioCosto)
                : ''
            );
            setPrecioPublico(
              prod.precioPublico !== null && prod.precioPublico !== undefined
                ? String(prod.precioPublico)
                : ''
            );

            setStockSeguridadMinimo(
              prod.stockSeguridadMinimo !== null && prod.stockSeguridadMinimo !== undefined
                ? String(prod.stockSeguridadMinimo)
                : ''
            );
            setIdUnidadVenta(
              prod.idUnidadVenta ? String(prod.idUnidadVenta) : ''
            );
            setIdUnidadCompra(
              prod.idUnidadCompra ? String(prod.idUnidadCompra) : ''
            );

            setActivo(prod.activo ?? 1);
            setVisiblePublico(prod.visiblePublico ?? 0);
            setProveedoresAsociados(prod.proveedores || []);
          }
        }
      } catch (err: unknown) {
        console.error('[ProductoFormPage] Error al cargar datos iniciales:', err);
        const msg =
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'No se pudo cargar la información requerida.';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, isEditing]);

  // Proveedores disponibles: activos que aún no han sido asociados a este producto
  const proveedoresDisponibles = todosProveedores.filter(
    (tp) => !proveedoresAsociados.some((pa) => pa.id === tp.id)
  );

  const handleAsociarProveedor = async () => {
    if (!selectedProveedorId) return;
    const idProv = Number(selectedProveedorId);
    const provObj = todosProveedores.find((p) => p.id === idProv);
    if (!provObj) return;

    // En modo alta: queda solo en estado local hasta guardar el producto
    if (!isEditing) {
      setProveedoresAsociados((prev) => [
        ...prev,
        { id: provObj.id, nombre: provObj.nombre, rut: provObj.rut },
      ]);
      setSelectedProveedorId('');
      setProveedorErrorMsg(null);
      setProveedorExitoMsg(null);
      return;
    }

    // En modo edición: asociación inmediata en API (ADR-019)
    if (!id) return;
    setAsociando(true);
    setProveedorErrorMsg(null);
    setProveedorExitoMsg(null);

    try {
      await asociarProveedorAProducto(Number(id), idProv);
      setProveedoresAsociados((prev) => [
        ...prev,
        { id: provObj.id, nombre: provObj.nombre, rut: provObj.rut },
      ]);
      setSelectedProveedorId('');
      setProveedorExitoMsg(`Proveedor "${provObj.nombre}" asociado correctamente.`);
    } catch (err: unknown) {
      console.error('[ProductoFormPage] Error al asociar proveedor:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo asociar el proveedor.';
      setProveedorErrorMsg(msg);
    } finally {
      setAsociando(false);
    }
  };

  const handleQuitarProveedorClick = (p: ProveedorProductoItem) => {
    // En modo alta: remover directamente del estado local
    if (!isEditing) {
      setProveedoresAsociados((prev) => prev.filter((item) => item.id !== p.id));
      setProveedorParaQuitar(null);
      return;
    }
    // En modo edición: abrir confirmación en línea
    setProveedorParaQuitar(p);
    setProveedorErrorMsg(null);
    setProveedorExitoMsg(null);
  };

  const handleConfirmarQuitar = async (p: ProveedorProductoItem) => {
    if (!isEditing) {
      setProveedoresAsociados((prev) => prev.filter((item) => item.id !== p.id));
      setProveedorParaQuitar(null);
      return;
    }

    if (!id) return;
    setDesasociandoId(p.id);
    setProveedorErrorMsg(null);
    setProveedorExitoMsg(null);

    try {
      await desasociarProveedorDeProducto(Number(id), p.id);
      setProveedoresAsociados((prev) => prev.filter((item) => item.id !== p.id));
      setProveedorParaQuitar(null);
      setProveedorExitoMsg(`Asociación con "${p.nombre}" eliminada.`);
    } catch (err: unknown) {
      console.error('[ProductoFormPage] Error al desasociar proveedor:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo quitar la asociación.';
      setProveedorErrorMsg(msg);
    } finally {
      setDesasociandoId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);
    setAdvertenciaMsg(null);

    const cleanNombre = nombre.trim();
    if (!cleanNombre) {
      setErrorMsg('El nombre del producto es requerido.');
      return;
    }

    if (!idUnidadBase) {
      setErrorMsg('Debes seleccionar una unidad base.');
      return;
    }

    setGuardando(true);

    const parseIntegerOrNull = (val: string): number | null => {
      const trimmed = val.trim();
      if (!trimmed) return null;
      const parsed = Math.round(parseFloat(trimmed));
      return isNaN(parsed) ? null : parsed;
    };

    const payload = {
      nombre: cleanNombre,
      descripcion: descripcion.trim() || null,
      idUnidadBase: Number(idUnidadBase),
      idUnidadVenta: idUnidadVenta ? Number(idUnidadVenta) : null,
      idUnidadCompra: idUnidadCompra ? Number(idUnidadCompra) : null,
      codigoBarras: codigoBarras.trim() || null,
      precioUnitarioSugerido: parseIntegerOrNull(precioUnitarioSugerido),
      precioCosto: parseIntegerOrNull(precioCosto),
      precioPublico: parseIntegerOrNull(precioPublico),
      stockSeguridadMinimo: parseIntegerOrNull(stockSeguridadMinimo),
      activo,
      visiblePublico,
    };

    try {
      if (isEditing && id) {
        await updateProducto(Number(id), payload);
        setExitoMsg('Producto actualizado exitosamente.');
      } else {
        // Paso 1: Crear producto en el backend (sin proveedores)
        const res = await createProducto(payload);
        const nuevoId = res?.data?.id;

        if (!nuevoId) {
          setExitoMsg('Producto creado exitosamente.');
          setTimeout(() => {
            navigate('/gestion/productos');
          }, 1000);
          return;
        }

        // Paso 2: Si hay proveedores seleccionados en modo alta, asociarlos en secuencia
        if (proveedoresAsociados.length > 0) {
          const proveedoresFallidos: string[] = [];

          for (const prov of proveedoresAsociados) {
            try {
              await asociarProveedorAProducto(nuevoId, prov.id);
            } catch (provErr: unknown) {
              console.error(
                `[ProductoFormPage] Error al asociar proveedor "${prov.nombre}" (${prov.id}) al nuevo producto ${nuevoId}:`,
                provErr
              );
              proveedoresFallidos.push(prov.nombre);
            }
          }

          // Paso 3: Manejo de fallos parciales
          if (proveedoresFallidos.length > 0) {
            setIdProductoCreado(nuevoId);
            const listaNombres = proveedoresFallidos.join(', ');
            const esSingular = proveedoresFallidos.length === 1;
            const msgAdvertencia = `El producto se creó correctamente, pero no se pudo asociar a ${listaNombres}. Podés ${
              esSingular ? 'asociarlo' : 'asociarlos'
            } manualmente editando el producto.`;
            setAdvertenciaMsg(msgAdvertencia);
            return;
          }
        }

        // Éxito completo
        setExitoMsg('Producto creado exitosamente.');
        setTimeout(() => {
          navigate('/gestion/productos');
        }, 1000);
      }
    } catch (err: unknown) {
      console.error('[ProductoFormPage] Error al guardar producto:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo guardar el producto.';
      setErrorMsg(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header Fijo */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/gestion/productos')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-violet-400" />
            <h1 className="text-sm font-bold text-white">
              {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
            </h1>
          </div>

          <div className="w-16" />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-xs">Cargando producto...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mensajes de Alerta / Advertencia / Éxito */}
            {errorMsg && (
              <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-xs text-rose-400 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {advertenciaMsg && (
              <div className="flex items-start gap-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-200 font-medium animate-fade-in">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2.5">
                  <p className="leading-relaxed font-medium">{advertenciaMsg}</p>
                  {idProductoCreado && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/gestion/productos/${idProductoCreado}`)}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors shadow-sm"
                      >
                        Editar producto ahora
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/gestion/productos')}
                        className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl text-xs transition-colors"
                      >
                        Ir al catálogo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {exitoMsg && (
              <div className="flex items-start gap-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-300 font-medium animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{exitoMsg}</p>
              </div>
            )}

            {/* SECCIÓN 1: Identificación */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-violet-400" />
                  Identificación
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Nombre, código y unidad de medida principal.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Nombre del Producto <span className="text-violet-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Harina de Trigo Especial 1kg"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* Código de barras y Unidad Base */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-zinc-300">
                        Código de Barras <span className="text-zinc-500 font-normal">(Opcional)</span>
                      </label>
                      {hasBarcodeDetector && (
                        <button
                          type="button"
                          onClick={() => setScannerOpen(true)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-300 text-[11px] font-bold transition-all active:scale-95 shadow-sm"
                          title="Escanear código de barras con la cámara"
                        >
                          <Camera className="w-3.5 h-3.5 text-violet-400" />
                          <span>Escanear</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={codigoBarras}
                      onChange={(e) => setCodigoBarras(e.target.value)}
                      placeholder="Ej: 7801234567890"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Unidad Base <span className="text-violet-400">*</span>
                    </label>
                    <select
                      required
                      value={idUnidadBase}
                      onChange={(e) => setIdUnidadBase(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 focus:outline-none transition-colors"
                    >
                      <option value="" disabled>
                        Selecciona unidad...
                      </option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.abreviacion})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Descripción (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Descripción interna o características del producto..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: Precios */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-violet-400" />
                  Precios (CLP)
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Montos en pesos chilenos sin decimales.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Precio Venta Sugerido */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Precio de Venta Sugerido ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={precioUnitarioSugerido}
                    onChange={(e) => setPrecioUnitarioSugerido(e.target.value)}
                    placeholder="Ej: 1500"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                  />
                </div>

                {/* Precio Costo */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Precio de Costo ($)
                  </label>
                  <p className="text-[11px] text-zinc-500 mb-1.5">
                    Usado para calcular rentabilidad y márgenes de ganancia.
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={precioCosto}
                    onChange={(e) => setPrecioCosto(e.target.value)}
                    placeholder="Ej: 900"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                  />
                </div>

                {/* Precio Público Web */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Precio Público Web ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={precioPublico}
                    onChange={(e) => setPrecioPublico(e.target.value)}
                    placeholder="Ej: 1690"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: Inventario */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-violet-400" />
                  Inventario y Unidades
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Stock de seguridad y unidades auxiliares de venta/compra.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Stock de Seguridad */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Stock de Seguridad Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stockSeguridadMinimo}
                    onChange={(e) => setStockSeguridadMinimo(e.target.value)}
                    placeholder="Ej: 10"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                  />
                </div>

                {/* Unidad de Venta y Compra */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Unidad de Venta (Opcional)
                    </label>
                    <select
                      value={idUnidadVenta}
                      onChange={(e) => setIdUnidadVenta(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 focus:outline-none transition-colors"
                    >
                      <option value="">Igual a unidad base</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.abreviacion})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Unidad de Compra (Opcional)
                    </label>
                    <select
                      value={idUnidadCompra}
                      onChange={(e) => setIdUnidadCompra(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 focus:outline-none transition-colors"
                    >
                      <option value="">Igual a unidad base</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.abreviacion})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 4: Visibilidad y Estado */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-violet-400" />
                  Visibilidad y Estado
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Disponibilidad en Modo Jornada y catálogo web público.
                </p>
              </div>

              <div className="space-y-4">
                {/* Toggle Activo / Inactivo */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Estado del Producto
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActivo(1)}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        activo === 1
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <ToggleRight className="w-4 h-4 text-emerald-400" />
                      <span>Activo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivo(0)}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        activo === 0
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <ToggleLeft className="w-4 h-4 text-rose-400" />
                      <span>Inactivo</span>
                    </button>
                  </div>
                </div>

                {/* Toggle Visible en Web */}
                <div className="pt-3 border-t border-zinc-800/80">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Visibilidad en Catálogo Web
                  </label>
                  <p className="text-[11px] text-zinc-500 mb-2">
                    Requiere precio público configurado para ser exhibido a clientes finales.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setVisiblePublico(1)}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        visiblePublico === 1
                          ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span>Visible en Web</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisiblePublico(0)}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        visiblePublico === 0
                          ? 'bg-zinc-900 border-zinc-700 text-zinc-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>Oculto</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 5: Proveedores (ADR-019) */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-violet-400" />
                    Proveedores Asignados
                  </h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Empresas y distribuidores que suministran este producto.
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300">
                  {proveedoresAsociados.length}{' '}
                  {proveedoresAsociados.length === 1
                    ? isEditing
                      ? 'asociado'
                      : 'seleccionado'
                    : isEditing
                    ? 'asociados'
                    : 'seleccionados'}
                </span>
              </div>

              {/* Mensajes de Feedback de Proveedores (solo modo edición) */}
              {proveedorExitoMsg && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{proveedorExitoMsg}</span>
                </div>
              )}

              {proveedorErrorMsg && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{proveedorErrorMsg}</span>
                </div>
              )}

              {/* Formulario para Asociar / Seleccionar Proveedor */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-zinc-300">
                  {isEditing ? 'Asociar nuevo proveedor' : 'Seleccionar proveedor'}
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <select
                    value={selectedProveedorId}
                    onChange={(e) => {
                      setSelectedProveedorId(e.target.value);
                      setProveedorErrorMsg(null);
                    }}
                    disabled={asociando || proveedoresDisponibles.length === 0}
                    className="w-full sm:flex-1 px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 focus:outline-none transition-colors disabled:opacity-50"
                  >
                    {proveedoresDisponibles.length === 0 ? (
                      <option value="">
                        {todosProveedores.length === 0
                          ? 'No hay proveedores activos registrados'
                          : 'Todos los proveedores activos ya están asociados'}
                      </option>
                    ) : (
                      <>
                        <option value="">-- Seleccionar proveedor activo --</option>
                        {proveedoresDisponibles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({formatRut(p.rut)})
                          </option>
                        ))}
                      </>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={handleAsociarProveedor}
                    disabled={!selectedProveedorId || asociando}
                    className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm"
                  >
                    {asociando ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Asociando...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isEditing ? 'Asociar' : 'Agregar'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Lista de Proveedores Asociados / Seleccionados */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {isEditing
                    ? `Proveedores vinculados (${proveedoresAsociados.length})`
                    : `Proveedores seleccionados (${proveedoresAsociados.length})`}
                </div>

                {proveedoresAsociados.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed border-zinc-800 text-center bg-zinc-950/30">
                    <p className="text-xs text-zinc-400">
                      {isEditing
                        ? 'Este producto no tiene proveedores asociados.'
                        : 'Aún no has seleccionado proveedores para este producto.'}
                    </p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      {isEditing
                        ? 'Selecciona un proveedor de la lista superior para vincularlo.'
                        : 'Selecciona proveedores arriba para asociarlos automáticamente al crear el producto.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {proveedoresAsociados.map((prov) => {
                      const isConfirming = proveedorParaQuitar?.id === prov.id;
                      const isRemoving = desasociandoId === prov.id;

                      return (
                        <div
                          key={prov.id}
                          className={`p-3 rounded-2xl border transition-all ${
                            isConfirming
                              ? 'bg-rose-950/20 border-rose-500/40 ring-1 ring-rose-500/30'
                              : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {isConfirming ? (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div>
                                <span className="text-xs font-semibold text-rose-300">
                                  ¿Quitar asociación con este proveedor?
                                </span>
                                <p className="text-[11px] text-zinc-400 font-medium">
                                  {prov.nombre} ({formatRut(prov.rut)})
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmarQuitar(prov)}
                                  disabled={isRemoving}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm"
                                >
                                  {isRemoving ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Quitando...</span>
                                    </>
                                  ) : (
                                    <span>Confirmar</span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setProveedorParaQuitar(null)}
                                  disabled={isRemoving}
                                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg text-xs transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-zinc-200 truncate">
                                  {prov.nombre}
                                </div>
                                <div className="text-[11px] text-zinc-400 font-mono">
                                  {formatRut(prov.rut)}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleQuitarProveedorClick(prov)}
                                className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition-all"
                                title={
                                  isEditing
                                    ? 'Quitar proveedor de este producto'
                                    : 'Quitar de la selección'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Quitar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Footer Fijo con Botón Guardar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/gestion/productos')}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  Cancelar
                </button>

                {idProductoCreado ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/gestion/productos/${idProductoCreado}`)}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs flex items-center gap-2"
                  >
                    <span>Ir a editar producto</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={guardando}
                    className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs flex items-center gap-2"
                  >
                    {guardando ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
        {/* Modal de Escáner de Código de Barras (Cámara en vivo / Foto) */}
        <BarcodeScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(codigo) => {
            setCodigoParaConfirmar(codigo);
          }}
        />

        {/* Modal de Confirmación Explícita de Código Escaneado */}
        {codigoParaConfirmar && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
              onClick={() => setCodigoParaConfirmar(null)}
            />
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-slide-up sm:animate-fade-in text-zinc-100 flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      Verificá que el código capturado sea el correcto
                    </h2>
                    <p className="text-[11px] text-zinc-400">
                      Confirmá antes de insertarlo en el formulario del producto.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCodigoParaConfirmar(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
                  title="Cerrar verificación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center space-y-2 shadow-inner">
                <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  <span>Código Detectado</span>
                </div>
                <p className="text-2xl font-mono font-bold tracking-widest text-violet-300 select-all py-1">
                  {codigoParaConfirmar}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCodigoParaConfirmar(null);
                    setScannerOpen(true);
                  }}
                  className="w-full sm:flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Volver a intentar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCodigoBarras(codigoParaConfirmar);
                    setCodigoParaConfirmar(null);
                    setErrorMsg(null);
                  }}
                  className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar y usar este código</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
