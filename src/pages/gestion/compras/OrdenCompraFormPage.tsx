import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ShoppingCart,
  Plus,
  Trash2,
  Barcode,
  Search,
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle,
  Building2,
  Package,
  AlertTriangle,
  X,
} from 'lucide-react';
import BarcodeScannerModal from '@/components/gestion/BarcodeScannerModal';
import {
  getProveedoresAdmin,
  getProductosAdmin,
  getOrdenCompraById,
  createOrdenCompra,
  updateOrdenCompra,
  ApiRequestError,
} from '@/lib/api';
import {
  formatCLP,
  sugerirFechaEntregaEstimada,
  validarCondicionPago,
} from '@/lib/compras';
import type {
  ProveedorAdminItem,
  ProductoAdminItem,
  OrdenCompraCondicionPago,
  CreateOrdenCompraPayload,
  UpdateOrdenCompraPayload,
} from '@/types';

interface LineaFormItem {
  id_producto: number;
  nombre: string;
  codigo?: string | null;
  cantidad: number;
  precio_unitario_acordado: number;
}

export default function OrdenCompraFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const esEdicion = Boolean(id);
  const ordenId = Number(id);

  // Estados de datos maestros
  const [proveedores, setProveedores] = useState<ProveedorAdminItem[]>([]);
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoAdminItem[]>([]);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  // Formulario Cabecera
  const [idProveedor, setIdProveedor] = useState<number | ''>('');
  const [condicionPago, setCondicionPago] = useState<OrdenCompraCondicionPago>('contado');
  const [fechaVencimientoPago, setFechaVencimientoPago] = useState<string>('');
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState<string>(
    sugerirFechaEntregaEstimada()
  );
  const [notas, setNotas] = useState<string>('');

  // Formulario Líneas
  const [lineas, setLineas] = useState<LineaFormItem[]>([]);

  // Filtro de productos por proveedor
  const [soloProductosProveedor, setSoloProductosProveedor] = useState<boolean>(true);
  const [cargandoProductos, setCargandoProductos] = useState<boolean>(false);
  const [busquedaProducto, setBusquedaProducto] = useState<string>('');
  const [selectorAbierto, setSelectorAbierto] = useState<boolean>(false);

  // Modal confirmación cambio de proveedor
  const [modalCambioProveedor, setModalCambioProveedor] = useState<{
    nuevoProveedorId: number;
  } | null>(null);

  // Escáner de código de barras
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedMatch, setScannedMatch] = useState<ProductoAdminItem | null>(null);
  const [scannedNotFoundCode, setScannedNotFoundCode] = useState<string | null>(null);

  // 1. Cargar proveedores y datos de orden si es edición
  useEffect(() => {
    async function initData() {
      setLoadingInicial(true);
      setErrorGlobal(null);
      try {
        // Cargar proveedores activos
        const provRes = await getProveedoresAdmin({ activo: true });
        const provList = provRes?.data || [];
        setProveedores(provList);

        // Si es edición, cargar orden existente
        if (esEdicion) {
          if (isNaN(ordenId) || ordenId <= 0) {
            setErrorGlobal('ID de orden de compra inválido.');
            setLoadingInicial(false);
            return;
          }

          const ordenRes = await getOrdenCompraById(ordenId);
          const ordenData = ordenRes?.data;

          if (!ordenData) {
            setErrorGlobal('No se encontró la orden de compra solicitada.');
            setLoadingInicial(false);
            return;
          }

          if (ordenData.estado !== 'borrador') {
            setErrorGlobal(
              `Solo se pueden editar órdenes en estado 'borrador'. Esta orden está '${ordenData.estado}'.`
            );
            setLoadingInicial(false);
            return;
          }

          // Poblar estado
          setIdProveedor(ordenData.id_proveedor);
          setCondicionPago(
            (ordenData.condicion_pago as OrdenCompraCondicionPago) || 'contado'
          );
          setFechaVencimientoPago(ordenData.fecha_vencimiento_pago?.split('T')[0] || '');
          setFechaEntregaEstimada(
            ordenData.fecha_entrega_estimada?.split('T')[0] || sugerirFechaEntregaEstimada()
          );
          setNotas(ordenData.notas || '');

          if (ordenData.lineas && ordenData.lineas.length > 0) {
            setLineas(
              ordenData.lineas.map((l) => ({
                id_producto: l.id_producto,
                nombre: l.producto_nombre || `Producto #${l.id_producto}`,
                codigo: l.producto_codigo,
                cantidad: l.cantidad,
                precio_unitario_acordado: l.precio_unitario_acordado,
              }))
            );
          }
        }
      } catch (err: unknown) {
        console.error('[OrdenCompraFormPage] Error en carga inicial:', err);
        const msg =
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Error al inicializar el formulario.';
        setErrorGlobal(msg);
      } finally {
        setLoadingInicial(false);
      }
    }

    initData();
  }, [esEdicion, ordenId]);

  // 2. Cargar productos según proveedor seleccionado y filtro toggle
  const loadProductos = useCallback(async (proveedorId?: number, soloProveedor = true) => {
    setCargandoProductos(true);
    try {
      if (soloProveedor && proveedorId) {
        const res = await getProductosAdmin({ activo: 1, id_proveedor: proveedorId });
        setProductosDisponibles(res?.data || []);
      } else {
        const res = await getProductosAdmin(1);
        setProductosDisponibles(res?.data || []);
      }
    } catch (err) {
      console.error('[OrdenCompraFormPage] Error al cargar productos:', err);
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  useEffect(() => {
    if (typeof idProveedor === 'number' && idProveedor > 0) {
      loadProductos(idProveedor, soloProductosProveedor);
    } else {
      loadProductos(undefined, false);
    }
  }, [idProveedor, soloProductosProveedor, loadProductos]);

  // Manejo de cambio de proveedor
  const handleProveedorChange = (nuevoIdStr: string) => {
    const nuevoId = nuevoIdStr ? Number(nuevoIdStr) : '';

    if (lineas.length > 0 && nuevoId !== idProveedor && typeof nuevoId === 'number') {
      // Guardar el intento y abrir modal de advertencia
      setModalCambioProveedor({ nuevoProveedorId: nuevoId });
    } else {
      setIdProveedor(nuevoId);
    }
  };

  const confirmarCambioProveedor = async () => {
    if (!modalCambioProveedor) return;
    const nuevoId = modalCambioProveedor.nuevoProveedorId;

    try {
      // Obtener productos asociados al nuevo proveedor
      const res = await getProductosAdmin({ activo: 1, id_proveedor: nuevoId });
      const nuevosProds = res?.data || [];
      const idsValidos = new Set(nuevosProds.map((p) => p.id));

      // Filtrar líneas que pertenezcan al nuevo proveedor
      const lineasFiltradas = lineas.filter((l) => idsValidos.has(l.id_producto));
      setLineas(lineasFiltradas);
      setProductosDisponibles(nuevosProds);
      setIdProveedor(nuevoId);
    } catch (err) {
      console.error('[OrdenCompraFormPage] Error al cambiar proveedor:', err);
    } finally {
      setModalCambioProveedor(null);
    }
  };

  const cancelarCambioProveedor = () => {
    setModalCambioProveedor(null);
  };

  // Agregar producto a líneas
  const agregarProductoALineas = (prod: ProductoAdminItem) => {
    // Validar duplicado
    if (lineas.some((l) => l.id_producto === prod.id)) {
      setErrorGlobal(`El producto "${prod.nombre}" ya está agregado a la orden.`);
      setSelectorAbierto(false);
      return;
    }

    const precioSugerido =
      prod.precioCosto && prod.precioCosto > 0
        ? prod.precioCosto
        : prod.precioUnitarioSugerido && prod.precioUnitarioSugerido > 0
        ? prod.precioUnitarioSugerido
        : 0;

    const nuevaLinea: LineaFormItem = {
      id_producto: prod.id,
      nombre: prod.nombre,
      codigo: prod.codigoBarras,
      cantidad: 1,
      precio_unitario_acordado: Math.round(precioSugerido),
    };

    setLineas((prev) => [...prev, nuevaLinea]);
    setErrorGlobal(null);
    setSelectorAbierto(false);
    setBusquedaProducto('');
  };

  // Escaneo de código de barras
  const handleBarcodeScanned = (codigo: string) => {
    const clean = codigo.trim();
    const match = productosDisponibles.find(
      (p) => p.codigoBarras && p.codigoBarras.trim() === clean
    );

    if (match) {
      setScannedMatch(match);
      setScannedNotFoundCode(null);
    } else {
      setScannedNotFoundCode(clean);
      setScannedMatch(null);
    }
  };

  // Actualizar cantidad o precio de una línea
  const actualizarLinea = (
    index: number,
    campo: 'cantidad' | 'precio_unitario_acordado',
    valorStr: string
  ) => {
    const valor = parseInt(valorStr, 10);
    setLineas((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [campo]: isNaN(valor) ? 0 : Math.max(0, valor),
      };
      return copy;
    });
  };

  // Quitar línea
  const quitarLinea = (index: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  };

  // Cálculos de subtotales y total referencial en cliente
  const totalCalculado = useMemo(() => {
    return lineas.reduce((acc, l) => acc + (l.cantidad * l.precio_unitario_acordado), 0);
  }, [lineas]);

  // Productos filtrados para el selector
  const productosFiltradosSelector = useMemo(() => {
    const term = busquedaProducto.trim().toLowerCase();
    if (!term) return productosDisponibles.slice(0, 30);
    return productosDisponibles.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(term))
    );
  }, [productosDisponibles, busquedaProducto]);

  // Envío del Formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal(null);

    if (!idProveedor || typeof idProveedor !== 'number') {
      setErrorGlobal('Debes seleccionar un proveedor.');
      return;
    }

    // Validación de condición de pago
    const validacionCondicion = validarCondicionPago(
      condicionPago,
      condicionPago === 'credito' ? fechaVencimientoPago : null
    );
    if (!validacionCondicion.valido) {
      setErrorGlobal(validacionCondicion.error || 'Condición de pago inválida.');
      return;
    }

    // Validación de líneas
    if (lineas.length === 0) {
      setErrorGlobal('Debes incluir al menos una línea en la orden de compra.');
      return;
    }

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];
      if (linea.cantidad <= 0) {
        setErrorGlobal(`La cantidad para "${linea.nombre}" debe ser mayor a 0.`);
        return;
      }
      if (linea.precio_unitario_acordado <= 0) {
        setErrorGlobal(`El precio unitario para "${linea.nombre}" debe ser mayor a 0.`);
        return;
      }
    }

    setGuardando(true);
    try {
      const lineasPayload = lineas.map((l) => ({
        id_producto: l.id_producto,
        cantidad: l.cantidad,
        precio_unitario_acordado: l.precio_unitario_acordado,
      }));

      if (esEdicion) {
        const payload: UpdateOrdenCompraPayload = {
          id_proveedor: idProveedor,
          fecha_entrega_estimada: fechaEntregaEstimada || null,
          condicion_pago: condicionPago,
          fecha_vencimiento_pago:
            condicionPago === 'credito' && fechaVencimientoPago ? fechaVencimientoPago : null,
          notas: notas.trim() || null,
          lineas: lineasPayload,
        };

        const res = await updateOrdenCompra(ordenId, payload);
        const savedId = res?.data?.id || ordenId;
        navigate(`/gestion/compras/${savedId}`);
      } else {
        const payload: CreateOrdenCompraPayload = {
          id_proveedor: idProveedor,
          fecha_entrega_estimada: fechaEntregaEstimada || null,
          condicion_pago: condicionPago,
          fecha_vencimiento_pago:
            condicionPago === 'credito' && fechaVencimientoPago ? fechaVencimientoPago : null,
          notas: notas.trim() || null,
          lineas: lineasPayload,
        };

        const res = await createOrdenCompra(payload);
        const newId = res?.data?.id;
        navigate(`/gestion/compras/${newId}`);
      }
    } catch (err: unknown) {
      console.error('[OrdenCompraFormPage] Error al guardar:', err);
      if (err instanceof ApiRequestError) {
        if (err.code === 'INVALID_ORDER_STATE') {
          setErrorGlobal('La orden cambió de estado y ya no se puede editar.');
          return;
        }
        if (err.code === 'INVALID_INPUT' && err.details) {
          setErrorGlobal(`Error en los datos ingresados: ${JSON.stringify(err.details)}`);
          return;
        }
        setErrorGlobal(err.message || 'Error al guardar la orden.');
        return;
      }
      if (err instanceof Error) {
        setErrorGlobal(err.message);
        return;
      }
      setErrorGlobal('Ocurrió un error inesperado al guardar la orden.');
    } finally {
      setGuardando(false);
    }
  };

  if (loadingInicial) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
        <p className="text-xs text-zinc-400 font-medium">
          {esEdicion ? 'Cargando orden para editar...' : 'Preparando nueva orden de compra...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header Fijo */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(esEdicion ? `/gestion/compras/${ordenId}` : '/gestion/compras')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-rose-400" />
            <h1 className="text-sm font-bold text-white">
              {esEdicion ? `Editar Orden #${ordenId}` : 'Nueva Orden de Compra'}
            </h1>
          </div>

          <div className="w-16 flex justify-end">
            <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              Borrador
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4">
        {/* Banner de Error Global */}
        {errorGlobal && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-rose-300 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorGlobal}</span>
            </div>
            <button
              onClick={() => setErrorGlobal(null)}
              className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Datos de la Cabecera */}
          <section className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-lg">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Proveedor y Condiciones</span>
            </h2>

            <div className="space-y-3.5">
              {/* Proveedor */}
              <div>
                <label htmlFor="id-proveedor" className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Proveedor *
                </label>
                <select
                  id="id-proveedor"
                  required
                  value={idProveedor}
                  onChange={(e) => handleProveedorChange(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="">Selecciona un proveedor activo...</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.rut ? `(${p.rut})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condición de Pago y Vencimiento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="condicion-pago" className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Condición de Pago *
                  </label>
                  <select
                    id="condicion-pago"
                    value={condicionPago}
                    onChange={(e) => {
                      const nuevaCond = e.target.value as OrdenCompraCondicionPago;
                      setCondicionPago(nuevaCond);
                      if (nuevaCond === 'contado') {
                        setFechaVencimientoPago('');
                      }
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="contado">Contado</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>

                {condicionPago === 'credito' && (
                  <div className="animate-fade-in">
                    <label htmlFor="fecha-vencimiento" className="block text-[11px] font-medium text-amber-400 mb-1">
                      Fecha Vencimiento Pago *
                    </label>
                    <input
                      id="fecha-vencimiento"
                      type="date"
                      required={condicionPago === 'credito'}
                      value={fechaVencimientoPago}
                      onChange={(e) => setFechaVencimientoPago(e.target.value)}
                      className="w-full bg-zinc-800 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Fecha Entrega Estimada */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="fecha-entrega" className="block text-[11px] font-medium text-zinc-400">
                    Fecha de Entrega Estimada
                  </label>
                  <span className="text-[10px] text-zinc-500">Sugerida: hoy + 4 días hábiles</span>
                </div>
                <input
                  id="fecha-entrega"
                  type="date"
                  value={fechaEntregaEstimada}
                  onChange={(e) => setFechaEntregaEstimada(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Notas */}
              <div>
                <label htmlFor="notas-orden" className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Notas u Observaciones (opcional)
                </label>
                <textarea
                  id="notas-orden"
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Instrucciones para el proveedor, referencias o comentarios..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </section>

          {/* 2. Líneas de la Orden */}
          <section className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-rose-400" />
                  <span>Productos y Líneas ({lineas.length})</span>
                </h2>
                <p className="text-[11px] text-zinc-500">Mínimo 1 producto requerido</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                >
                  <Camera className="w-3.5 h-3.5 text-rose-400" />
                  <span>Escanear</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectorAbierto((prev) => !prev)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Producto</span>
                </button>
              </div>
            </div>

            {/* Panel Selector de Producto desplegable */}
            {selectorAbierto && (
              <div className="bg-zinc-950/80 border border-zinc-700/80 rounded-2xl p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Catálogo de Productos</span>

                  {/* Toggle para filtrar solo productos de este proveedor */}
                  {idProveedor ? (
                    <label className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={soloProductosProveedor}
                        onChange={(e) => setSoloProductosProveedor(e.target.checked)}
                        className="rounded bg-zinc-800 border-zinc-700 text-rose-500 focus:ring-0 w-3.5 h-3.5"
                      />
                      <span>Solo productos de este proveedor</span>
                    </label>
                  ) : (
                    <span className="text-[10px] text-zinc-500 italic">
                      Selecciona un proveedor para ver sus productos específicos
                    </span>
                  )}
                </div>

                {/* Input de Búsqueda */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    value={busquedaProducto}
                    onChange={(e) => setBusquedaProducto(e.target.value)}
                    placeholder="Buscar por nombre o código de barras..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Lista de productos para seleccionar */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 divide-y divide-zinc-800/60 pr-1">
                  {cargandoProductos ? (
                    <div className="py-6 flex items-center justify-center text-zinc-500 text-xs gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                      <span>Cargando productos...</span>
                    </div>
                  ) : productosFiltradosSelector.length === 0 ? (
                    <div className="py-6 text-center text-zinc-500 text-xs">
                      No se encontraron productos coincidentes.
                      {soloProductosProveedor && idProveedor && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setSoloProductosProveedor(false)}
                            className="text-rose-400 underline text-xs"
                          >
                            Ver todos los productos del catálogo
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    productosFiltradosSelector.map((prod) => {
                      const yaAgregado = lineas.some((l) => l.id_producto === prod.id);
                      const precioCosto = prod.precioCosto || prod.precioUnitarioSugerido || 0;

                      return (
                        <div
                          key={prod.id}
                          className="pt-1.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-200 truncate">{prod.nombre}</p>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                              {prod.codigoBarras && <span>Cod: {prod.codigoBarras}</span>}
                              <span>Costo ref: {formatCLP(precioCosto)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={yaAgregado}
                            onClick={() => agregarProductoALineas(prod)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                              yaAgregado
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : 'bg-rose-600 hover:bg-rose-500 text-white active:scale-95 shadow'
                            }`}
                          >
                            {yaAgregado ? 'Agregado' : 'Seleccionar'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Listado de Líneas Agregadas */}
            <div className="space-y-3">
              {lineas.length === 0 ? (
                <div className="py-8 text-center bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl p-4 text-xs text-zinc-500">
                  No hay productos en la orden. Presiona <strong>Agregar Producto</strong> o{' '}
                  <strong>Escanear</strong> para comenzar.
                </div>
              ) : (
                lineas.map((linea, index) => {
                  const subtotal = linea.cantidad * linea.precio_unitario_acordado;

                  return (
                    <div
                      key={linea.id_producto}
                      className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-3.5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{linea.nombre}</p>
                          {linea.codigo && (
                            <p className="text-[10px] text-zinc-400 font-mono">
                              Cod: {linea.codigo}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => quitarLinea(index)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors shrink-0"
                          title="Quitar de la orden"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 items-center text-xs">
                        {/* Cantidad */}
                        <div>
                          <label className="block text-[10px] text-zinc-400 mb-0.5">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={linea.cantidad || ''}
                            onChange={(e) =>
                              actualizarLinea(index, 'cantidad', e.target.value)
                            }
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        {/* Precio Unitario Acordado */}
                        <div>
                          <label className="block text-[10px] text-zinc-400 mb-0.5">
                            Precio unitario
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={linea.precio_unitario_acordado || ''}
                            onChange={(e) =>
                              actualizarLinea(index, 'precio_unitario_acordado', e.target.value)
                            }
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white text-right font-bold focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        {/* Subtotal */}
                        <div className="text-right">
                          <span className="block text-[10px] text-zinc-400 mb-0.5">Subtotal</span>
                          <span className="font-extrabold text-rose-400 text-sm">
                            {formatCLP(subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total Referencial Calculado */}
            {lineas.length > 0 && (
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">
                  Total Estimado ({lineas.length} productos):
                </span>
                <span className="text-lg font-black text-white">{formatCLP(totalCalculado)}</span>
              </div>
            )}
          </section>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={guardando}
              onClick={() =>
                navigate(esEdicion ? `/gestion/compras/${ordenId}` : '/gestion/compras')
              }
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 inline-flex items-center gap-2 shadow-lg active:scale-95"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>{esEdicion ? 'Actualizar Orden' : 'Guardar Orden (Borrador)'}</span>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* MODAL: Confirmación de cambio de proveedor con líneas cargadas */}
      {modalCambioProveedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={cancelarCambioProveedor} />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl text-zinc-100 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h4 className="text-base font-bold text-white">¿Cambiar de proveedor?</h4>
              <p className="text-xs text-zinc-400">
                Tienes <strong>{lineas.length}</strong> línea(s) cargada(s). Al cambiar de proveedor,
                se descartarán los productos que no pertenezcan al nuevo proveedor.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={cancelarCambioProveedor}
                className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all"
              >
                Mantener actual
              </button>
              <button
                type="button"
                onClick={confirmarCambioProveedor}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Cambiar y filtrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Escáner de Código de Barras */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Escanear Producto"
        subtitle="Buscar en catálogo de compra"
      />

      {/* MODAL: Coincidencia de Escaneo Encontrada */}
      {scannedMatch && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setScannedMatch(null)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-slide-up sm:animate-fade-in text-zinc-100 flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Producto Encontrado</h3>
                  <p className="text-[11px] text-zinc-400">Escáner de código de barras</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScannedMatch(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 space-y-2">
              <p className="font-bold text-white text-sm">{scannedMatch.nombre}</p>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1 font-mono">
                  <Barcode className="w-3.5 h-3.5" />
                  {scannedMatch.codigoBarras}
                </span>
                <span>·</span>
                <span>
                  Costo: {formatCLP(scannedMatch.precioCosto || scannedMatch.precioUnitarioSugerido || 0)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScannedMatch(null)}
                className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={() => {
                  agregarProductoALineas(scannedMatch);
                  setScannedMatch(null);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar a la Orden</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Coincidencia No Encontrada al Escanear */}
      {scannedNotFoundCode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setScannedNotFoundCode(null)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-slide-up sm:animate-fade-in text-zinc-100 flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    No se encontró ningún producto con ese código
                  </h3>
                  <p className="text-[11px] text-zinc-400">Catálogo de productos activos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScannedNotFoundCode(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              El código escaneado <code className="font-mono text-zinc-200 bg-zinc-800 px-1.5 py-0.5 rounded">{scannedNotFoundCode}</code> no coincide con ningún producto activo en la selección actual.
            </p>

            <button
              type="button"
              onClick={() => setScannedNotFoundCode(null)}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
