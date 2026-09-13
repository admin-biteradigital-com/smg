import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Package,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  Boxes,
  Globe,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Store,
  Plus,
  Trash2,
} from 'lucide-react';
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
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Proveedores (ADR-019, solo modo edición)
  const [proveedoresAsociados, setProveedoresAsociados] = useState<ProveedorProductoItem[]>([]);
  const [todosProveedores, setTodosProveedores] = useState<ProveedorAdminItem[]>([]);
  const [selectedProveedorId, setSelectedProveedorId] = useState<string>('');
  const [asociando, setAsociando] = useState(false);
  const [desasociandoId, setDesasociandoId] = useState<number | null>(null);
  const [proveedorParaQuitar, setProveedorParaQuitar] = useState<ProveedorProductoItem | null>(null);
  const [proveedorErrorMsg, setProveedorErrorMsg] = useState<string | null>(null);
  const [proveedorExitoMsg, setProveedorExitoMsg] = useState<string | null>(null);

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

  // Carga inicial: unidades y datos de edición si corresponde
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const resUnidades = await getUnidadesMedida();
        const listaUnidades = resUnidades?.data || [];
        setUnidades(listaUnidades);

        // Si es creación y no hay unidad base seleccionada, seleccionamos la primera disponible
        if (!isEditing && listaUnidades.length > 0) {
          setIdUnidadBase(String(listaUnidades[0].id));
        }

        // Si es edición, cargar el producto y proveedores activos
        if (isEditing && id) {
          // Se utiliza pageSize: 500 para evitar paginación compleja en este selector,
          // dado que una distribuidora como SMG maneja un catálogo acotado de proveedores.
          // 500 otorga un margen holgado sin riesgo de cortes silenciosos a mediano plazo.
          const [resProd, resProv] = await Promise.all([
            getProductoAdminById(Number(id)),
            getProveedoresAdmin({ activo: true, pageSize: 500 }).catch((e) => {
              console.error('[ProductoFormPage] Error al cargar proveedores:', e);
              return { data: [] as ProveedorAdminItem[] };
            }),
          ]);

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

          setTodosProveedores(resProv?.data || []);
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
    if (!selectedProveedorId || !id) return;
    const idProv = Number(selectedProveedorId);
    const provObj = todosProveedores.find((p) => p.id === idProv);
    if (!provObj) return;

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

  const handleConfirmarQuitar = async (p: ProveedorProductoItem) => {
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
        const res = await createProducto(payload);
        setExitoMsg('Producto creado exitosamente.');
        if (res?.data?.id) {
          setTimeout(() => {
            navigate('/gestion/productos');
          }, 1000);
        }
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
            {/* Mensajes de Alerta / Éxito */}
            {errorMsg && (
              <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-xs text-rose-400 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
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
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Código de Barras (Opcional)
                    </label>
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

            {/* SECCIÓN 5: Proveedores (ADR-019 - Solo visible en modo edición) */}
            {isEditing && (
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
                    {proveedoresAsociados.length} {proveedoresAsociados.length === 1 ? 'asociado' : 'asociados'}
                  </span>
                </div>

                {/* Mensajes de Feedback de Proveedores */}
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

                {/* Formulario para Asociar Proveedor */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Asociar nuevo proveedor
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
                          <span>Asociar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Lista de Proveedores Asociados */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Proveedores vinculados ({proveedoresAsociados.length})
                  </div>

                  {proveedoresAsociados.length === 0 ? (
                    <div className="p-4 rounded-2xl border border-dashed border-zinc-800 text-center bg-zinc-950/30">
                      <p className="text-xs text-zinc-400">
                        Este producto no tiene proveedores asociados.
                      </p>
                      <p className="text-[11px] text-zinc-600 mt-0.5">
                        Selecciona un proveedor de la lista superior para vincularlo.
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
                                  onClick={() => {
                                    setProveedorParaQuitar(prov);
                                    setProveedorErrorMsg(null);
                                    setProveedorExitoMsg(null);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition-all"
                                  title="Quitar proveedor de este producto"
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
            )}

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
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
