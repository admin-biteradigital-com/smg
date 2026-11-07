import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Building2,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Plus,
  Star,
  Edit2,
  Power,
  CreditCard,
  Phone,
  Mail,
  X,
  AlertTriangle,
  Copy,
  Receipt,
} from 'lucide-react';
import SelectorComuna from '@/components/gestion/SelectorComuna';
import {
  getClienteById,
  createCliente,
  updateCliente,
  createSucursal,
  updateSucursal,
  ApiRequestError,
} from '@/lib/api';
import { validateRut, formatRut, cleanRut } from '@/lib/rut';
import type {
  ClienteAdminDetalle,
  SucursalAdminItem,
  SegmentoCliente,
  CreateClientePayload,
  UpdateClientePayload,
  CreateSucursalPayload,
  UpdateSucursalPayload,
} from '@/types';

const SEGMENTOS_OPTIONS: Array<{ value: SegmentoCliente | ''; label: string }> = [
  { value: '', label: 'Sin especificar' },
  { value: 'pequeño', label: 'Pequeño' },
  { value: 'mediano', label: 'Mediano' },
  { value: 'grande', label: 'Grande' },
  { value: 'mayorista', label: 'Mayorista' },
];

/**
 * Textos descriptivos en español para los datos fiscales faltantes que devuelve SIGLO.
 */
export const TEXTOS_DATOS_FISCALES_FALTANTES: Record<string, string> = {
  giro: "Giro comercial (falta registrar o está 'Pendiente de confirmar')",
  sucursales_sin_comuna: 'Una o más sucursales activas no tienen comuna asignada',
  domicilio_tributario: 'Falta domicilio tributario (dirección y comuna) en el cliente o en sus sucursales',
};

export default function ClienteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const clienteId = id ? Number(id) : null;

  // Estados de carga y feedback
  const [loading, setLoading] = useState(isEditing);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Datos de Cliente
  const [razonSocial, setRazonSocial] = useState('');
  const [rut, setRut] = useState('');
  const [nombreFantasia, setNombreFantasia] = useState('');
  const [giro, setGiro] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');

  const VALOR_GIRO_PENDIENTE = 'Pendiente de confirmar';
  const esGiroPendiente = giro.trim() === VALOR_GIRO_PENDIENTE;
  const [clienteEmail, setClienteEmail] = useState('');
  const [segmento, setSegmento] = useState<SegmentoCliente | ''>('');
  const [limiteCredito, setLimiteCredito] = useState<string>('0');
  const [plazoCreditoDias, setPlazoCreditoDias] = useState<string>('0');
  const [cicloReabastecimientoDias, setCicloReabastecimientoDias] = useState<string>('');
  const [activo, setActivo] = useState<boolean>(true);

  // Domicilio Tributario (Datos Fiscales Cliente)
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [clienteComuna, setClienteComuna] = useState('');
  const [clienteCiudad, setClienteCiudad] = useState('');
  const [clienteCasillaIntercambio, setClienteCasillaIntercambio] = useState('');
  const [datosFiscalesFaltantes, setDatosFiscalesFaltantes] = useState<string[]>([]);

  // Sucursales existentes (modo edición)
  const [sucursales, setSucursales] = useState<SucursalAdminItem[]>([]);

  // Sucursal Principal Inicial (solo modo creación)
  const [sucursalNombre, setSucursalNombre] = useState('Casa Matriz');
  const [sucursalDireccion, setSucursalDireccion] = useState('');
  const [sucursalComuna, setSucursalComuna] = useState('');
  const [sucursalCiudad, setSucursalCiudad] = useState('');
  const [sucursalRegion, setSucursalRegion] = useState('Los Lagos');
  const [sucursalTelefono, setSucursalTelefono] = useState('');
  const [sucursalEmail, setSucursalEmail] = useState('');
  const [sucursalObservaciones, setSucursalObservaciones] = useState('');

  // Estados para Modal / Formulario Inline de Sucursales (modo edición)
  const [mostrarFormSucursal, setMostrarFormSucursal] = useState(false);
  const [editandoSucursalId, setEditandoSucursalId] = useState<number | null>(null);
  const [formSucursalNombre, setFormSucursalNombre] = useState('');
  const [formSucursalDireccion, setFormSucursalDireccion] = useState('');
  const [formSucursalComuna, setFormSucursalComuna] = useState('');
  const [formSucursalCiudad, setFormSucursalCiudad] = useState('');
  const [formSucursalRegion, setFormSucursalRegion] = useState('Los Lagos');
  const [formSucursalTelefono, setFormSucursalTelefono] = useState('');
  const [formSucursalEmail, setFormSucursalEmail] = useState('');
  const [formSucursalEsPrincipal, setFormSucursalEsPrincipal] = useState(false);
  const [formSucursalObservaciones, setFormSucursalObservaciones] = useState('');
  const [guardandoSucursal, setGuardandoSucursal] = useState(false);
  const [errorSucursal, setErrorSucursal] = useState<string | null>(null);

  // 1. Cargar datos del cliente en modo edición
  const loadClienteData = async () => {
    if (!clienteId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getClienteById(clienteId);
      if (res?.data) {
        const cli: ClienteAdminDetalle = res.data;
        setRazonSocial(cli.razonSocial || '');
        setRut(cli.rut || '');
        setNombreFantasia(cli.nombreFantasia || '');
        setGiro(cli.giro || '');
        setClienteTelefono(cli.telefono || '');
        setClienteEmail(cli.email || '');
        setSegmento(cli.segmento || '');
        setLimiteCredito(String(cli.limiteCredito ?? 0));
        setPlazoCreditoDias(String(cli.plazoCreditoDias ?? 0));
        setCicloReabastecimientoDias(
          cli.cicloReabastecimientoDias !== null && cli.cicloReabastecimientoDias !== undefined
            ? String(cli.cicloReabastecimientoDias)
            : ''
        );
        setActivo(cli.activo);
        setClienteDireccion(cli.direccion || '');
        setClienteComuna(cli.comuna || '');
        setClienteCiudad(cli.ciudad || '');
        setClienteCasillaIntercambio(cli.casillaIntercambio || '');
        setDatosFiscalesFaltantes(cli.datosFiscalesFaltantes || []);
        setSucursales(cli.sucursales || []);
      }
    } catch (err: unknown) {
      console.error('[ClienteFormPage] Error al cargar cliente:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo cargar la información del cliente.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEditing) {
      loadClienteData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing]);

  // Validaciones y feedback visual de RUT
  const rutLimpio = cleanRut(rut);
  const rutValido = rutLimpio.length >= 8 ? validateRut(rutLimpio) : null;

  const handleRutBlur = () => {
    if (rut.trim()) {
      const formated = formatRut(rut);
      if (formated) setRut(formated);
    }
  };

  // Función para copiar domicilio tributario desde la sucursal principal
  const handleCopiarDomicilioSucursalPrincipal = () => {
    if (isEditing) {
      const principal = sucursales.find((s) => s.esPrincipal) || sucursales[0];
      if (principal) {
        if (principal.direccion) setClienteDireccion(principal.direccion);
        if (principal.comuna) setClienteComuna(principal.comuna);
        if (principal.ciudad) setClienteCiudad(principal.ciudad);
        setExitoMsg('Domicilio tributario copiado desde la sucursal principal.');
      } else {
        setErrorMsg('No hay sucursales registradas para copiar el domicilio tributario.');
      }
    } else {
      if (sucursalDireccion) setClienteDireccion(sucursalDireccion);
      if (sucursalComuna) setClienteComuna(sucursalComuna);
      if (sucursalCiudad) setClienteCiudad(sucursalCiudad);
      setExitoMsg('Domicilio tributario copiado desde la sucursal principal inicial.');
    }
  };

  // 2. Guardar Cliente (Crear / Actualizar)
  const handleSubmitCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    const cleanRazonSocial = razonSocial.trim();
    const cleanRutVal = rut.trim();
    const cleanGiro = giro.trim();

    if (!cleanRazonSocial) {
      setErrorMsg('La razón social es requerida.');
      return;
    }

    if (!cleanRutVal) {
      setErrorMsg('El RUT es requerido.');
      return;
    }

    if (!cleanGiro) {
      setErrorMsg('El giro del cliente es requerido.');
      return;
    }

    // Validaciones de domicilio tributario
    if (clienteDireccion.trim().length > 70) {
      setErrorMsg('La dirección del domicilio tributario no puede superar 70 caracteres.');
      return;
    }
    if (clienteCiudad.trim().length > 20) {
      setErrorMsg('La ciudad del domicilio tributario no puede superar 20 caracteres.');
      return;
    }
    if (clienteCasillaIntercambio.trim().length > 80) {
      setErrorMsg('La casilla de intercambio no puede superar 80 caracteres.');
      return;
    }
    if (clienteCasillaIntercambio.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clienteCasillaIntercambio.trim())) {
        setErrorMsg('El formato de la casilla de intercambio no es válido.');
        return;
      }
    }

    const limiteNum = Math.max(0, parseInt(limiteCredito.trim() || '0', 10) || 0);
    const plazoNum = Math.max(0, parseInt(plazoCreditoDias.trim() || '0', 10) || 0);
    const cicloNum = cicloReabastecimientoDias.trim()
      ? parseInt(cicloReabastecimientoDias.trim(), 10)
      : null;

    setGuardandoCliente(true);

    try {
      const domicilioPayload = {
        direccion: clienteDireccion.trim() || null,
        comuna: clienteComuna.trim() || null,
        ciudad: clienteCiudad.trim() || null,
        casillaIntercambio: clienteCasillaIntercambio.trim() || null,
      };

      if (isEditing && clienteId) {
        const payload: UpdateClientePayload = {
          razonSocial: cleanRazonSocial,
          rut: cleanRutVal,
          nombreFantasia: nombreFantasia.trim() || null,
          giro: cleanGiro,
          telefono: clienteTelefono.trim() || null,
          email: clienteEmail.trim() || null,
          segmento: segmento || null,
          limiteCredito: limiteNum,
          plazoCreditoDias: plazoNum,
          cicloReabastecimientoDias: cicloNum,
          activo,
          ...domicilioPayload,
        };

        await updateCliente(clienteId, payload);
        setExitoMsg('Cliente actualizado exitosamente.');
      } else {
        // Validación de sucursal principal inicial
        if (
          !sucursalNombre.trim() ||
          !sucursalDireccion.trim() ||
          !sucursalComuna.trim() ||
          !sucursalCiudad.trim() ||
          !sucursalRegion.trim()
        ) {
          setErrorMsg(
            'Debes completar los datos obligatorios (*) de la sucursal principal inicial (incluida la comuna).'
          );
          setGuardandoCliente(false);
          return;
        }

        if (sucursalDireccion.trim().length > 70) {
          setErrorMsg('La dirección de la sucursal no puede superar 70 caracteres.');
          setGuardandoCliente(false);
          return;
        }

        if (sucursalCiudad.trim().length > 20) {
          setErrorMsg('La ciudad de la sucursal no puede superar 20 caracteres.');
          setGuardandoCliente(false);
          return;
        }

        const payload: CreateClientePayload = {
          razonSocial: cleanRazonSocial,
          rut: cleanRutVal,
          nombreFantasia: nombreFantasia.trim() || null,
          giro: cleanGiro,
          telefono: clienteTelefono.trim() || null,
          email: clienteEmail.trim() || null,
          segmento: segmento || null,
          limiteCredito: limiteNum,
          plazoCreditoDias: plazoNum,
          cicloReabastecimientoDias: cicloNum,
          ...domicilioPayload,
          sucursalPrincipal: {
            nombre: sucursalNombre.trim(),
            direccion: sucursalDireccion.trim(),
            comuna: sucursalComuna.trim(),
            ciudad: sucursalCiudad.trim(),
            region: sucursalRegion.trim(),
            telefono: sucursalTelefono.trim() || null,
            email: sucursalEmail.trim() || null,
            observaciones: sucursalObservaciones.trim() || null,
          },
        };

        const res = await createCliente(payload);
        setExitoMsg('Cliente y sucursal principal creados exitosamente.');

        if (res?.data?.id) {
          setTimeout(() => {
            navigate(`/gestion/clientes/${res.data.id}/editar`);
          }, 1000);
        }
      }
    } catch (err: unknown) {
      console.error('[ClienteFormPage] Error al guardar cliente:', err);
      let msg = 'Error al guardar el cliente.';
      if (err instanceof ApiRequestError) {
        if (err.code === 'COMUNA_INVALIDA') {
          msg = 'La comuna ingresada no es válida según el catálogo oficial.';
        } else if (err.code === 'REGION_NO_COINCIDE') {
          msg = 'La región seleccionada no coincide con la comuna.';
        } else {
          msg = err.message;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErrorMsg(msg);
    } finally {
      setGuardandoCliente(false);
    }
  };

  // 3. Manejo de Sucursales (Modo Edición)
  const abrirNuevaSucursal = () => {
    setEditandoSucursalId(null);
    setFormSucursalNombre('');
    setFormSucursalDireccion('');
    setFormSucursalComuna('');
    setFormSucursalCiudad(sucursalCiudad || '');
    setFormSucursalRegion(sucursalRegion || 'Los Lagos');
    setFormSucursalTelefono('');
    setFormSucursalEmail('');
    setFormSucursalEsPrincipal(false);
    setFormSucursalObservaciones('');
    setErrorSucursal(null);
    setMostrarFormSucursal(true);
  };

  const abrirEditarSucursal = (s: SucursalAdminItem) => {
    setEditandoSucursalId(s.id);
    setFormSucursalNombre(s.nombre || '');
    setFormSucursalDireccion(s.direccion || '');
    setFormSucursalComuna(s.comuna || '');
    setFormSucursalCiudad(s.ciudad || '');
    setFormSucursalRegion(s.region || 'Los Lagos');
    setFormSucursalTelefono(s.telefono || '');
    setFormSucursalEmail(s.email || '');
    setFormSucursalEsPrincipal(s.esPrincipal);
    setFormSucursalObservaciones(s.observaciones || '');
    setErrorSucursal(null);
    setMostrarFormSucursal(true);
  };

  const handleGuardarSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) return;

    if (
      !formSucursalNombre.trim() ||
      !formSucursalDireccion.trim() ||
      !formSucursalComuna.trim() ||
      !formSucursalCiudad.trim() ||
      !formSucursalRegion.trim()
    ) {
      setErrorSucursal('Completa todos los campos obligatorios (*) de la sucursal, incluida la comuna.');
      return;
    }

    if (formSucursalDireccion.trim().length > 70) {
      setErrorSucursal('La dirección de la sucursal no puede superar 70 caracteres.');
      return;
    }

    if (formSucursalCiudad.trim().length > 20) {
      setErrorSucursal('La ciudad de la sucursal no puede superar 20 caracteres.');
      return;
    }

    setGuardandoSucursal(true);
    setErrorSucursal(null);

    try {
      if (editandoSucursalId) {
        const payload: UpdateSucursalPayload = {
          nombre: formSucursalNombre.trim(),
          direccion: formSucursalDireccion.trim(),
          comuna: formSucursalComuna.trim() || null,
          ciudad: formSucursalCiudad.trim(),
          region: formSucursalRegion.trim(),
          telefono: formSucursalTelefono.trim() || null,
          email: formSucursalEmail.trim() || null,
          esPrincipal: formSucursalEsPrincipal,
          observaciones: formSucursalObservaciones.trim() || null,
        };

        await updateSucursal(clienteId, editandoSucursalId, payload);
        setExitoMsg('Sucursal actualizada exitosamente.');
      } else {
        const payload: CreateSucursalPayload = {
          nombre: formSucursalNombre.trim(),
          direccion: formSucursalDireccion.trim(),
          comuna: formSucursalComuna.trim(),
          ciudad: formSucursalCiudad.trim(),
          region: formSucursalRegion.trim(),
          telefono: formSucursalTelefono.trim() || null,
          email: formSucursalEmail.trim() || null,
          esPrincipal: formSucursalEsPrincipal,
          observaciones: formSucursalObservaciones.trim() || null,
        };

        await createSucursal(clienteId, payload);
        setExitoMsg('Nueva sucursal creada exitosamente.');
      }

      setMostrarFormSucursal(false);
      await loadClienteData();
    } catch (err: unknown) {
      console.error('[ClienteFormPage] Error al guardar sucursal:', err);
      let msg = 'Error al guardar la sucursal.';
      if (err instanceof ApiRequestError) {
        if (err.code === 'COMUNA_INVALIDA') {
          msg = 'La comuna ingresada no es válida según el catálogo oficial.';
        } else if (err.code === 'REGION_NO_COINCIDE') {
          msg = 'La región no coincide con la comuna seleccionada.';
        } else {
          msg = err.message;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErrorSucursal(msg);
    } finally {
      setGuardandoSucursal(false);
    }
  };

  const handleEstablecerPrincipal = async (sucursal: SucursalAdminItem) => {
    if (!clienteId || sucursal.esPrincipal) return;
    setErrorMsg(null);
    try {
      await updateSucursal(clienteId, sucursal.id, { esPrincipal: true });
      setExitoMsg(`"${sucursal.nombre}" designada como sucursal principal.`);
      await loadClienteData();
    } catch (err: unknown) {
      console.error('[ClienteFormPage] Error al designar principal:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Error al designar sucursal principal.';
      setErrorMsg(msg);
    }
  };

  const handleToggleActivaSucursal = async (sucursal: SucursalAdminItem) => {
    if (!clienteId) return;
    setErrorMsg(null);
    try {
      await updateSucursal(clienteId, sucursal.id, { activa: !sucursal.activa });
      setExitoMsg(
        `Sucursal "${sucursal.nombre}" ${
          sucursal.activa ? 'desactivada' : 'activada'
        } exitosamente.`
      );
      await loadClienteData();
    } catch (err: unknown) {
      console.error('[ClienteFormPage] Error al cambiar estado sucursal:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Error al cambiar estado de la sucursal.';
      setErrorMsg(msg);
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header Fijo */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/gestion/clientes')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <h1 className="text-sm font-bold text-white">
              {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h1>
          </div>

          <div className="w-16" />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs">Cargando datos del cliente...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmitCliente} className="space-y-6">
            {/* Mensajes de Feedback Global */}
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

            {/* Aviso de Datos Fiscales Faltantes (SIGLO) */}
            {isEditing && datosFiscalesFaltantes.length > 0 && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 animate-fade-in space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-amber-300">
                      Datos fiscales incompletos para facturación electrónica (SII)
                    </p>
                    <p className="text-zinc-300 leading-relaxed text-[11px]">
                      Para emitir facturas electrónicas a este cliente sin rechazos del SII, completa los siguientes datos:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-amber-200/90 pt-1 text-[11px]">
                      {datosFiscalesFaltantes.map((f) => (
                        <li key={f}>{TEXTOS_DATOS_FISCALES_FALTANTES[f] || f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* SECCIÓN 1: Identificación y Datos Generales */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Identificación de la Empresa
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Razón social, RUT chileno y clasificación de cliente.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Razón Social */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Razón Social <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    placeholder="Ej: Comercial y Distribuidora Los Lagos SpA"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* RUT con Feedback */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      RUT <span className="text-blue-400">*</span>
                    </label>
                    {rutValido !== null && (
                      <span
                        className={`text-[10px] font-bold flex items-center gap-1 ${
                          rutValido ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {rutValido ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> RUT válido
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" /> Formato / DV inválido
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    onBlur={handleRutBlur}
                    placeholder="Ej: 77.689.935-6 o 77689935-6"
                    className={`w-full px-3.5 py-2.5 bg-zinc-950 border rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono ${
                      rutValido === false
                        ? 'border-amber-500/60 focus:border-amber-500'
                        : 'border-zinc-800 focus:border-blue-500'
                    }`}
                  />
                </div>

                {/* Segmento */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Segmento de Cliente
                  </label>
                  <select
                    value={segmento}
                    onChange={(e) => setSegmento(e.target.value as SegmentoCliente | '')}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 focus:outline-none transition-colors"
                  >
                    {SEGMENTOS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* SECCIÓN 1B: Contacto General del Cliente */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-violet-400" />
                  Contacto General del Cliente
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Datos de contacto de la empresa. Se distinguen del contacto específico de cada sucursal.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Nombre Fantasía */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Nombre de Fantasía
                  </label>
                  <input
                    type="text"
                    value={nombreFantasia}
                    onChange={(e) => setNombreFantasia(e.target.value)}
                    placeholder="Ej: Minimarket Don Pedro"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Nombre comercial con el que se conoce al cliente (opcional).</p>
                </div>

                {/* Giro */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Giro <span className="text-blue-400">*</span>
                    </label>
                    {esGiroPendiente && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-2.5 h-2.5" /> Dato provisorio
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={giro}
                    onChange={(e) => setGiro(e.target.value)}
                    placeholder="Ej: Venta al por menor de alimentos y bebidas"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs placeholder-zinc-600 focus:outline-none transition-colors border ${
                      esGiroPendiente
                        ? 'bg-amber-950/20 border-amber-500/60 text-amber-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-violet-500'
                    }`}
                  />
                  {esGiroPendiente ? (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-400 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Este dato es provisorio, confirmalo con el giro tributario real.</span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Actividad económica del cliente — requerido para facturación electrónica.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Teléfono del Cliente */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      placeholder="Ej: +56 9 1234 5678"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Email del Cliente */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={clienteEmail}
                      onChange={(e) => setClienteEmail(e.target.value)}
                      placeholder="Ej: contacto@empresa.cl"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 1C: Domicilio Tributario (Facturación Electrónica) */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-blue-400" />
                    Domicilio Tributario
                  </h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Dirección fiscal del cliente para facturación electrónica (DTE).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopiarDomicilioSucursalPrincipal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-xs font-bold transition-all active:scale-95 shrink-0 self-start sm:self-auto shadow-sm"
                  title="Copiar dirección, comuna y ciudad desde la sucursal principal"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar de la sucursal principal</span>
                </button>
              </div>

              <div className="space-y-3.5">
                {/* Dirección */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Dirección Tributaria
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {clienteDireccion.length}/70
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={70}
                    value={clienteDireccion}
                    onChange={(e) => setClienteDireccion(e.target.value)}
                    placeholder="Ej: Av. Diego Portales 1234"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* Comuna y Ciudad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <SelectorComuna
                    label="Comuna Tributaria"
                    value={clienteComuna}
                    placeholder="Buscar comuna..."
                    onChange={(comunaNom) => setClienteComuna(comunaNom)}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-zinc-300">
                        Ciudad
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {clienteCiudad.length}/20
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={20}
                      value={clienteCiudad}
                      onChange={(e) => setClienteCiudad(e.target.value)}
                      placeholder="Ej: Puerto Montt"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Casilla de Intercambio DTE */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Casilla de Intercambio (DTE) <span className="text-zinc-500 font-normal">(Opcional)</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {clienteCasillaIntercambio.length}/80
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      maxLength={80}
                      value={clienteCasillaIntercambio}
                      onChange={(e) => setClienteCasillaIntercambio(e.target.value)}
                      placeholder="dte@cliente.cl"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Casilla de correo del cliente para recepción automática de facturas electrónicas.
                  </p>
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: Condiciones Comerciales y Crédito */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  Condiciones Comerciales y Crédito
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Límite de crédito en pesos, plazo de pago y ciclo sugerido de visitas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Plazo de Crédito (Días) */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Plazo de Crédito (Días)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={plazoCreditoDias}
                      onChange={(e) => setPlazoCreditoDias(e.target.value)}
                      placeholder="0 = Contado"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">0 para pago contado</p>
                </div>

                {/* Límite de Crédito ($) */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Límite de Crédito ($)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={limiteCredito}
                      onChange={(e) => setLimiteCredito(e.target.value)}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">Monto máximo autorizado</p>
                </div>

                {/* Ciclo de Reabastecimiento */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Ciclo Reabastecimiento
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cicloReabastecimientoDias}
                    onChange={(e) => setCicloReabastecimientoDias(e.target.value)}
                    placeholder="Ej: 7 días"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Frecuencia de visita sugerida</p>
                </div>
              </div>

              {/* Estado Activo (solo en edición) */}
              {isEditing && (
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-zinc-200">
                      Estado del Cliente
                    </label>
                    <p className="text-[11px] text-zinc-400">
                      Desactivar el cliente ocultará sus sucursales de las rutas de venta activas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivo(!activo)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      activo
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {activo ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              )}
            </section>

            {/* SECCIÓN 3A: Sucursal Principal Inicial (SOLO MODO CREACIÓN) */}
            {!isEditing && (
              <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4 animate-fade-in">
                <div className="border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <h2 className="text-sm font-bold text-white">
                      Sucursal Principal Inicial
                    </h2>
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-md">
                      Requerida
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Todo cliente nuevo debe registrarse con al menos una sucursal principal.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Nombre de Sucursal <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={sucursalNombre}
                      onChange={(e) => setSucursalNombre(e.target.value)}
                      placeholder="Ej: Casa Matriz / Local Centro"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-zinc-300">
                        Dirección <span className="text-blue-400">*</span>
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {sucursalDireccion.length}/70
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={70}
                      value={sucursalDireccion}
                      onChange={(e) => setSucursalDireccion(e.target.value)}
                      placeholder="Ej: Av. Diego Portales 1234"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Comuna y Región */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <SelectorComuna
                      label="Comuna"
                      required
                      value={sucursalComuna}
                      placeholder="Buscar comuna..."
                      onChange={(nuevaComuna, nuevaRegion) => {
                        setSucursalComuna(nuevaComuna);
                        setSucursalRegion(nuevaRegion);
                      }}
                    />

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Región <span className="text-zinc-500 font-normal">(Derivada)</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={sucursalRegion}
                        placeholder="Se autocompleta con la comuna"
                        className="w-full px-3.5 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Ciudad */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-zinc-300">
                        Ciudad <span className="text-blue-400">*</span>
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {sucursalCiudad.length}/20
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={20}
                      value={sucursalCiudad}
                      onChange={(e) => setSucursalCiudad(e.target.value)}
                      placeholder="Ej: Puerto Montt"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Teléfono de esta Sucursal
                      </label>
                      <input
                        type="tel"
                        value={sucursalTelefono}
                        onChange={(e) => setSucursalTelefono(e.target.value)}
                        placeholder="Ej: +56 9 1234 5678"
                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Email de esta Sucursal
                      </label>
                      <input
                        type="email"
                        value={sucursalEmail}
                        onChange={(e) => setSucursalEmail(e.target.value)}
                        placeholder="Ej: contacto@cliente.cl"
                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Observaciones / Referencias de Entrega
                    </label>
                    <textarea
                      rows={2}
                      value={sucursalObservaciones}
                      onChange={(e) => setSucursalObservaciones(e.target.value)}
                      placeholder="Ej: Portón verde frente a la plaza, horario de recepción 9 a 13 hrs."
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors resize-none"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* SECCIÓN 3B: Gestión de Sucursales Múltiples (SOLO MODO EDICIÓN) */}
            {isEditing && (
              <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      Sucursales del Cliente ({sucursales.length})
                    </h2>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Gestión de locales, puntos de entrega y designación de sucursal principal.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={abrirNuevaSucursal}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Sucursal</span>
                  </button>
                </div>

                {/* Sub-formulario Desplegable para Crear/Editar Sucursal */}
                {mostrarFormSucursal && (
                  <div className="bg-zinc-950 border border-blue-500/30 rounded-2xl p-4 space-y-3.5 animate-fade-in shadow-lg">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                      <p className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        {editandoSucursalId ? 'Editar Sucursal' : 'Nueva Sucursal'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setMostrarFormSucursal(false)}
                        className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {errorSucursal && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400">
                        {errorSucursal}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                          Nombre de Sucursal <span className="text-blue-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formSucursalNombre}
                          onChange={(e) => setFormSucursalNombre(e.target.value)}
                          placeholder="Ej: Sucursal Costanera"
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-zinc-300">
                            Dirección <span className="text-blue-400">*</span>
                          </label>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {formSucursalDireccion.length}/70
                          </span>
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={70}
                          value={formSucursalDireccion}
                          onChange={(e) => setFormSucursalDireccion(e.target.value)}
                          placeholder="Ej: Av. Juan Soler Manfredini 456"
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 focus:outline-none"
                        />
                      </div>

                      {/* Comuna y Región */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <SelectorComuna
                          label="Comuna"
                          required
                          value={formSucursalComuna}
                          placeholder="Buscar comuna..."
                          onChange={(nuevaComuna, nuevaRegion) => {
                            setFormSucursalComuna(nuevaComuna);
                            setFormSucursalRegion(nuevaRegion);
                          }}
                        />

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                            Región <span className="text-zinc-500 font-normal">(Derivada)</span>
                          </label>
                          <input
                            type="text"
                            disabled
                            value={formSucursalRegion}
                            placeholder="Se autocompleta con la comuna"
                            className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl text-xs text-zinc-400 focus:outline-none cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* Ciudad con manejo de sobre-largo (> 20 chars sin bloquear) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-zinc-300">
                            Ciudad <span className="text-blue-400">*</span>
                          </label>
                          <span
                            className={`text-[10px] font-mono ${
                              formSucursalCiudad.length > 20
                                ? 'text-rose-400 font-bold'
                                : 'text-zinc-500'
                            }`}
                          >
                            {formSucursalCiudad.length}/20
                          </span>
                        </div>
                        <input
                          type="text"
                          required
                          value={formSucursalCiudad}
                          onChange={(e) => setFormSucursalCiudad(e.target.value)}
                          placeholder="Ej: Puerto Varas"
                          className={`w-full px-3 py-2 bg-zinc-900 border rounded-xl text-xs text-zinc-100 focus:outline-none ${
                            formSucursalCiudad.length > 20
                              ? 'border-rose-500/80 focus:border-rose-400'
                              : 'border-zinc-800 focus:border-blue-500'
                          }`}
                        />
                        {formSucursalCiudad.length > 20 && (
                          <p className="text-[11px] text-rose-400 mt-1 leading-tight">
                            La ciudad supera los 20 caracteres ({formSucursalCiudad.length}/20). Ajusta el texto (ej: "Hornopirén" con comuna "Hualaihué") para poder guardar.
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                            Teléfono de esta Sucursal
                          </label>
                          <input
                            type="tel"
                            value={formSucursalTelefono}
                            onChange={(e) => setFormSucursalTelefono(e.target.value)}
                            placeholder="Ej: +56 9 8765 4321"
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                            Email de esta Sucursal
                          </label>
                          <input
                            type="email"
                            value={formSucursalEmail}
                            onChange={(e) => setFormSucursalEmail(e.target.value)}
                            placeholder="Ej: sucursal@cliente.cl"
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="checkEsPrincipal"
                          checked={formSucursalEsPrincipal}
                          onChange={(e) => setFormSucursalEsPrincipal(e.target.checked)}
                          className="rounded bg-zinc-900 border-zinc-700 text-blue-600 focus:ring-0 w-4 h-4"
                        />
                        <label
                          htmlFor="checkEsPrincipal"
                          className="text-xs text-zinc-300 font-semibold cursor-pointer select-none"
                        >
                          Designar como Sucursal Principal
                        </label>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                          Observaciones
                        </label>
                        <input
                          type="text"
                          value={formSucursalObservaciones}
                          onChange={(e) => setFormSucursalObservaciones(e.target.value)}
                          placeholder="Ej: Acceso por portón trasero"
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-zinc-100 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setMostrarFormSucursal(false)}
                          disabled={guardandoSucursal}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleGuardarSucursal}
                          disabled={guardandoSucursal}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                        >
                          {guardandoSucursal ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Guardando...</span>
                            </>
                          ) : (
                            <span>{editandoSucursalId ? 'Actualizar' : 'Crear'} Sucursal</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Listado de Sucursales */}
                {sucursales.length === 0 ? (
                  <div className="p-6 text-center bg-zinc-950/60 border border-zinc-800 rounded-2xl text-zinc-500 text-xs">
                    No se registran sucursales para este cliente.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sucursales.map((s) => (
                      <div
                        key={s.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          s.esPrincipal
                            ? 'bg-blue-950/20 border-blue-500/40 shadow-sm'
                            : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Fila 1: Título, Código y Badges */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-bold text-zinc-100 truncate">
                                {s.nombre}
                              </span>
                              <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                                {s.codigo}
                              </span>
                              {s.esPrincipal && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                  <Star className="w-3 h-3 fill-amber-300 shrink-0" />
                                  Principal
                                </span>
                              )}
                              {s.activa ? (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                  Activa
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md">
                                  Inactiva
                                </span>
                              )}
                            </div>

                            {/* Fila 2: Dirección y Comuna */}
                            <p className="text-xs text-zinc-300 flex items-center gap-1 mt-1 flex-wrap">
                              <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                              <span>
                                {s.direccion}
                                {s.comuna ? `, ${s.comuna}` : ''}
                                {s.ciudad && s.ciudad !== s.comuna ? ` (${s.ciudad})` : ''}
                                {s.region ? ` · ${s.region}` : ''}
                              </span>
                              {!s.comuna && (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded ml-1">
                                  Sin comuna
                                </span>
                              )}
                            </p>

                            {/* Contacto / Observaciones */}
                            {(s.telefono || s.email || s.observaciones) && (
                              <div className="mt-2 text-[11px] text-zinc-400 space-y-0.5">
                                {s.telefono && (
                                  <span className="inline-flex items-center gap-1 mr-3">
                                    <Phone className="w-3 h-3 text-zinc-500" />
                                    {s.telefono}
                                  </span>
                                )}
                                {s.email && (
                                  <span className="inline-flex items-center gap-1 mr-3">
                                    <Mail className="w-3 h-3 text-zinc-500" />
                                    {s.email}
                                  </span>
                                )}
                                {s.observaciones && (
                                  <p className="italic text-zinc-500 text-[10px] mt-0.5">
                                    Obs: {s.observaciones}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Acciones de la Sucursal */}
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                            {!s.esPrincipal && (
                              <button
                                type="button"
                                onClick={() => handleEstablecerPrincipal(s)}
                                title="Establecer como Sucursal Principal"
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Star className="w-3 h-3" />
                                <span className="hidden sm:inline">Hacer Principal</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => abrirEditarSucursal(s)}
                              title="Editar Sucursal"
                              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActivaSucursal(s)}
                              title={s.activa ? 'Desactivar Sucursal' : 'Activar Sucursal'}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                s.activa
                                  ? 'bg-zinc-900 hover:bg-rose-950/30 border-zinc-800 text-zinc-400 hover:text-rose-400'
                                  : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Footer Fijo con Botón Guardar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/gestion/clientes')}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardandoCliente}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs flex items-center gap-2"
                >
                  {guardandoCliente ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
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
