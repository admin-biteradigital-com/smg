import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  ShieldAlert,
  Plus,
  X,
  Receipt,
  Copy,
} from 'lucide-react';
import { getEmpresaPerfil, updateEmpresaPerfil, ApiRequestError } from '@/lib/api';
import type { EmpresaPerfil, UpdateEmpresaPayload } from '@/types';
import SelectorComuna from '@/components/gestion/SelectorComuna';

/**
 * Nombres legibles en español para los códigos de faltantes de facturación electrónica (SII).
 */
export const NOMBRES_FALTANTES_DTE: Record<string, string> = {
  RUT: 'RUT de la empresa',
  razon_social: 'Razón Social',
  giro: 'Giro Comercial',
  actecos: 'Códigos de actividad económica (ACTECO)',
  cdgSiiSucur: 'Código de sucursal SII',
  direccion: 'Dirección casa matriz',
  comuna: 'Comuna',
  unidadSii: 'Unidad regional del SII',
  nroResolucion: 'N° de resolución',
  fechaResolucion: 'Fecha de resolución',
  casillaIntercambio: 'Casilla de intercambio (DTE)',
};

export default function EmpresaPage() {
  const navigate = useNavigate();

  // Estados de datos
  const [empresa, setEmpresa] = useState<EmpresaPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Estados de feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);
  const [activacionExitosa, setActivacionExitosa] = useState(false);

  // Campos del formulario: Identidad legal
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [rutEmpresa, setRutEmpresa] = useState('');
  const [giro, setGiro] = useState('');
  const [direccion, setDireccion] = useState('');
  const [comuna, setComuna] = useState('');
  const [region, setRegion] = useState('');
  const [emailContacto, setEmailContacto] = useState('');

  // Campos del formulario: Facturación Electrónica (SII / DTE)
  const [actecos, setActecos] = useState<number[]>([]);
  const [inputActeco, setInputActeco] = useState('');
  const [errorActeco, setErrorActeco] = useState<string | null>(null);
  const [cdgSiiSucur, setCdgSiiSucur] = useState('');
  const [unidadSii, setUnidadSii] = useState('');
  const [nroResolucion, setNroResolucion] = useState('');
  const [fechaResolucion, setFechaResolucion] = useState('');
  const [casillaIntercambio, setCasillaIntercambio] = useState('');

  // Campos del formulario: Información Adicional (Opcional)
  const [ciudad, setCiudad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dominioWeb, setDominioWeb] = useState('');

  // 1. Cargar datos del perfil de empresa al montar
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await getEmpresaPerfil();
        if (res?.data) {
          const d = res.data;
          setEmpresa(d);
          setNombreEmpresa(d.nombreEmpresa || '');
          setRutEmpresa(d.rutEmpresa || '');
          setGiro(d.giro || '');
          setDireccion(d.direccion || '');
          setComuna(d.comuna || '');
          setRegion(d.region || '');
          setEmailContacto(d.emailContacto || '');
          setCiudad(d.ciudad || '');
          setTelefono(d.telefono || '');
          setDominioWeb(d.dominioWeb || '');

          // Campos fiscales DTE
          setActecos(Array.isArray(d.actecos) ? d.actecos : []);
          setCdgSiiSucur(
            d.cdgSiiSucur !== null && d.cdgSiiSucur !== undefined
              ? String(d.cdgSiiSucur)
              : ''
          );
          setUnidadSii(d.unidadSii || '');
          setNroResolucion(
            d.nroResolucion !== null && d.nroResolucion !== undefined
              ? String(d.nroResolucion)
              : ''
          );
          setFechaResolucion(d.fechaResolucion || '');
          setCasillaIntercambio(d.casillaIntercambio || '');
        }
      } catch (err: unknown) {
        console.error('[EmpresaPage] Error al cargar empresa:', err);
        const msg =
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'No se pudo cargar la información de la empresa.';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Manejo de ACTECOS
  const handleAddActeco = () => {
    setErrorActeco(null);
    const parsed = parseInt(inputActeco.trim(), 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 999999) {
      setErrorActeco('El código ACTECO debe ser un número entero entre 1 y 999999.');
      return;
    }
    if (actecos.includes(parsed)) {
      setErrorActeco('Este código ACTECO ya fue agregado.');
      return;
    }
    if (actecos.length >= 4) {
      setErrorActeco('Se permite un máximo de 4 códigos ACTECO.');
      return;
    }
    setActecos([...actecos, parsed]);
    setInputActeco('');
  };

  const handleRemoveActeco = (code: number) => {
    setActecos(actecos.filter((c) => c !== code));
  };

  // 2. Manejador de Guardar
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);
    setActivacionExitosa(false);

    // Validación de límites de largo
    if (giro.trim().length > 80) {
      setErrorMsg('El giro comercial no puede superar los 80 caracteres.');
      return;
    }
    if (direccion.trim().length > 70) {
      setErrorMsg('La dirección no puede superar los 70 caracteres.');
      return;
    }
    if (ciudad.trim().length > 20) {
      setErrorMsg('La ciudad no puede superar los 20 caracteres.');
      return;
    }
    if (emailContacto.trim().length > 80) {
      setErrorMsg('El correo del emisor no puede superar los 80 caracteres.');
      return;
    }
    if (unidadSii.trim().length > 40) {
      setErrorMsg('La unidad regional del SII no puede superar los 40 caracteres.');
      return;
    }
    if (casillaIntercambio.trim().length > 80) {
      setErrorMsg('La casilla de intercambio no puede superar los 80 caracteres.');
      return;
    }

    // Validación de formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailContacto.trim() && !emailRegex.test(emailContacto.trim())) {
      setErrorMsg('El formato del correo del emisor no es válido.');
      return;
    }
    if (casillaIntercambio.trim() && !emailRegex.test(casillaIntercambio.trim())) {
      setErrorMsg('El formato de la casilla de intercambio no es válido.');
      return;
    }

    // Validación de fecha resolución si se ingresó
    if (fechaResolucion.trim()) {
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!fechaRegex.test(fechaResolucion.trim())) {
        setErrorMsg('La fecha de resolución debe tener formato AAAA-MM-DD.');
        return;
      }
    }

    setGuardando(true);

    const payload: UpdateEmpresaPayload = {
      nombreEmpresa: nombreEmpresa.trim() || undefined,
      rutEmpresa: rutEmpresa.trim() || null,
      giro: giro.trim() || null,
      direccion: direccion.trim() || null,
      comuna: comuna.trim() || null,
      region: region.trim() || null,
      emailContacto: emailContacto.trim() || null,
      ciudad: ciudad.trim() || null,
      telefono: telefono.trim() || null,
      dominioWeb: dominioWeb.trim() || null,
      actecos: actecos.length > 0 ? actecos : null,
      cdgSiiSucur: cdgSiiSucur.trim() ? parseInt(cdgSiiSucur.trim(), 10) : null,
      unidadSii: unidadSii.trim() || null,
      nroResolucion: nroResolucion.trim() ? parseInt(nroResolucion.trim(), 10) : null,
      fechaResolucion: fechaResolucion.trim() || null,
      casillaIntercambio: casillaIntercambio.trim() || null,
    };

    try {
      const estadoAnterior = empresa?.estadoOperacion;
      const res = await updateEmpresaPerfil(payload);

      if (res?.data) {
        const updated = res.data;
        setEmpresa(updated);

        // Si se activó en esta actualización
        if (updated.estadoOperacion === 'activa' && estadoAnterior === 'configurando') {
          setActivacionExitosa(true);
          setExitoMsg('¡Empresa configurada! Ya puedes iniciar jornadas.');
        } else if (updated.estadoOperacion === 'activa') {
          setExitoMsg('Datos de la empresa actualizados exitosamente.');
        } else {
          // Aún en 'configurando'
          const faltantes: string[] = [];
          if (!updated.nombreEmpresa) faltantes.push('Razón Social');
          if (!updated.rutEmpresa) faltantes.push('RUT');
          if (!updated.giro) faltantes.push('Giro');
          if (!updated.direccion) faltantes.push('Dirección');
          if (!updated.comuna) faltantes.push('Comuna');
          if (!updated.region) faltantes.push('Región');
          if (!updated.emailContacto) faltantes.push('Email de Contacto');

          setExitoMsg(
            faltantes.length > 0
              ? `Datos guardados. Campos mínimos pendientes para activar: ${faltantes.join(', ')}.`
              : 'Datos guardados exitosamente.'
          );
        }
      }
    } catch (err: unknown) {
      console.error('[EmpresaPage] Error al actualizar empresa:', err);
      let msg = 'No se pudieron guardar los cambios. Intenta de nuevo.';
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
      setGuardando(false);
    }
  };

  const estadoOperacion = empresa?.estadoOperacion ?? 'configurando';
  const facturacionDte = empresa?.facturacionElectronica;

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
            <Building2 className="w-4 h-4 text-brand-400" />
            <h1 className="text-sm font-bold text-white">Perfil de Empresa</h1>
          </div>

          <div className="w-16 flex justify-end" />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <p className="text-xs">Cargando datos de la empresa...</p>
          </div>
        ) : (
          <form onSubmit={handleGuardar} className="space-y-6">
            {/* Banner de Estado Operacional */}
            <section className="rounded-2xl border p-4 transition-all">
              {estadoOperacion === 'activa' ? (
                <div className="flex items-start gap-3 text-emerald-400">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-sm text-emerald-300">Empresa Activa</p>
                    <p className="text-emerald-400/80 mt-0.5 leading-relaxed">
                      Tu empresa cuenta con todos los datos fiscales requeridos para la emisión de ventas y operación en ruta.
                    </p>
                  </div>
                </div>
              ) : estadoOperacion === 'suspendida' ? (
                <div className="flex items-start gap-3 text-rose-400">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-sm text-rose-300">Empresa Suspendida</p>
                    <p className="text-rose-400/80 mt-0.5 leading-relaxed">
                      La operación se encuentra suspendida temporalmente. Contacta a soporte para reactivarla.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-amber-400">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-sm text-amber-300">Configuración Pendiente</p>
                    <p className="text-amber-400/90 mt-0.5 leading-relaxed">
                      Completa los campos obligatorios marcados con asterisco (*) para habilitar la operación de jornadas.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Aviso de Faltantes para Facturación Electrónica DTE */}
            {facturacionDte && !facturacionDte.completo && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 animate-fade-in space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-amber-300">
                      Datos pendientes para facturación electrónica (SII)
                    </p>
                    <p className="text-zinc-300 leading-relaxed text-[11px]">
                      Para habilitar la emisión oficial de facturas y boletas electrónicas ante el SII, completa los siguientes datos en esta pantalla:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-amber-200/90 pt-1 text-[11px]">
                      {facturacionDte.faltantes.map((f) => (
                        <li key={f}>{NOMBRES_FALTANTES_DTE[f] || f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {facturacionDte?.completo && (
              <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium text-[11px]">
                  Facturación electrónica (SII) completa: todos los datos del emisor requeridos para DTE están registrados.
                </span>
              </section>
            )}

            {/* Mensajes de Alerta / Éxito */}
            {errorMsg && (
              <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-xs text-rose-400 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {exitoMsg && (
              <div
                className={`flex items-start gap-2.5 rounded-2xl p-4 text-xs animate-fade-in ${
                  activacionExitosa
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium'
                    : 'bg-zinc-900 border border-zinc-700 text-zinc-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{exitoMsg}</p>
              </div>
            )}

            {/* SECCIÓN 1: Identidad Legal (Campos Mínimos SII) */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-400" />
                  Identidad Legal (Campos Mínimos SII)
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Información fiscal requerida para emisión de documentos tributarios y apertura de jornadas.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Razón Social */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Razón Social <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nombreEmpresa}
                    onChange={(e) => setNombreEmpresa(e.target.value)}
                    placeholder="Ej: Distribuidora Los Andes SpA"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* RUT y Giro */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      RUT Empresa <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={rutEmpresa}
                      onChange={(e) => setRutEmpresa(e.target.value)}
                      placeholder="Ej: 76.123.456-7"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-zinc-300">
                        Giro Comercial <span className="text-amber-400">*</span>
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {giro.length}/80
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={giro}
                      onChange={(e) => setGiro(e.target.value)}
                      placeholder="Ej: Venta mayorista de alimentos"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Dirección Casa Matriz <span className="text-amber-400">*</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {direccion.length}/70
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={70}
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej: Av. Providencia 1234, Of. 501"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* Comuna (Selector oficial) y Región (Derivada) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <SelectorComuna
                    label="Comuna"
                    required
                    value={comuna}
                    placeholder="Buscar comuna..."
                    onChange={(nuevaComuna, nuevaRegion) => {
                      setComuna(nuevaComuna);
                      setRegion(nuevaRegion);
                    }}
                  />

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Región <span className="text-zinc-500 font-normal">(Derivada)</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={region}
                      placeholder="Se autocompleta con la comuna"
                      className="w-full px-3.5 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Correo del Emisor (emailContacto) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Correo del emisor (se imprime en la factura){' '}
                      <span className="text-amber-400">*</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {emailContacto.length}/80
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      maxLength={80}
                      value={emailContacto}
                      onChange={(e) => setEmailContacto(e.target.value)}
                      placeholder="facturacion@tuempresa.cl"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Correo oficial de contacto del contribuyente registrado en el encabezado de las facturas (CorreoEmisor).
                  </p>
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: Facturación Electrónica (SII) */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-brand-400" />
                  Facturación Electrónica (SII)
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Parámetros técnicos de autorización ante el Servicio de Impuestos Internos para el motor DTE.
                </p>
              </div>

              <div className="space-y-4">
                {/* Códigos ACTECO */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Actividad Económica (ACTECO){' '}
                    <span className="text-zinc-500 font-normal">
                      (1 a 4 códigos numéricos)
                    </span>
                  </label>

                  {/* Chips de ACTECOS cargados */}
                  {actecos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {actecos.map((code) => (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-mono text-zinc-200"
                        >
                          <span>{code}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveActeco(code)}
                            className="text-zinc-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                            title="Quitar código"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="999999"
                      disabled={actecos.length >= 4}
                      value={inputActeco}
                      onChange={(e) => {
                        setInputActeco(e.target.value);
                        setErrorActeco(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddActeco();
                        }
                      }}
                      placeholder={
                        actecos.length >= 4
                          ? 'Máximo de 4 códigos alcanzado'
                          : 'Ej: 471990'
                      }
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={actecos.length >= 4 || !inputActeco.trim()}
                      onClick={handleAddActeco}
                      className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 disabled:opacity-50 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar</span>
                    </button>
                  </div>
                  {errorActeco && (
                    <p className="text-[11px] text-rose-400 mt-1">{errorActeco}</p>
                  )}
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Código de actividad económica según la clasificación oficial del SII. Puedes registrar hasta 4 códigos.
                  </p>
                </div>

                {/* Código de Sucursal SII y Unidad Regional SII */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Código Sucursal SII (CdgSIISucur)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="999999999"
                      value={cdgSiiSucur}
                      onChange={(e) => setCdgSiiSucur(e.target.value)}
                      placeholder="Ej: 0 o código numérico"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Código numérico asignado por el SII para la sucursal emisora (0 para casa matriz si no tiene otro).
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-zinc-300">
                        Unidad Regional del SII
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {unidadSii.length}/40
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={40}
                      value={unidadSii}
                      onChange={(e) => setUnidadSii(e.target.value)}
                      placeholder="Ej: PUERTO MONTT"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Ej: PUERTO MONTT (el PDF agrega automáticamente "S.I.I. - ").
                    </p>
                  </div>
                </div>

                {/* N° y Fecha de Resolución */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      N° Resolución SII
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={nroResolucion}
                      onChange={(e) => setNroResolucion(e.target.value)}
                      placeholder="Ej: 80 (o 0 si está en certificación)"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Número de la resolución exenta que autoriza al contribuyente como emisor electrónico.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Fecha de Resolución
                    </label>
                    <input
                      type="date"
                      value={fechaResolucion}
                      onChange={(e) => setFechaResolucion(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 focus:outline-none transition-colors"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Fecha de emisión de la resolución del SII (AAAA-MM-DD).
                    </p>
                  </div>
                </div>

                {/* Casilla de Intercambio (DTE) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Casilla de Intercambio (DTE)
                    </label>
                    <div className="flex items-center gap-2">
                      {!casillaIntercambio && emailContacto && (
                        <button
                          type="button"
                          onClick={() => setCasillaIntercambio(emailContacto)}
                          className="text-[10px] text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar correo del emisor</span>
                        </button>
                      )}
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {casillaIntercambio.length}/80
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      maxLength={80}
                      value={casillaIntercambio}
                      onChange={(e) => setCasillaIntercambio(e.target.value)}
                      placeholder="intercambio@tuempresa.cl"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Casilla de correo para intercambio automático de DTEs y acuses de recibo entre contribuyentes.
                  </p>
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: Información Adicional */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-zinc-400" />
                  Información Adicional (Opcional)
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Datos de contacto comercial y canales digitales.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Ciudad */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Ciudad
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {ciudad.length}/20
                    </span>
                  </div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={20}
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Ej: Santiago"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Teléfono de Contacto
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej: +56 9 1234 5678"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Sitio Web */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Sitio Web / Dominio
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={dominioWeb}
                      onChange={(e) => setDominioWeb(e.target.value)}
                      placeholder="Ej: https://tuempresa.cl"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Footer Fijo con Botón Guardar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/gestion')}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs flex items-center gap-2"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar Cambios
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
