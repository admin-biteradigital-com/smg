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
} from 'lucide-react';
import { getEmpresaPerfil, updateEmpresaPerfil, ApiRequestError } from '@/lib/api';
import type { EmpresaPerfil, UpdateEmpresaPayload } from '@/types';

const REGIONES_CHILE = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana de Santiago',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
];

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

  // Campos del formulario
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [rutEmpresa, setRutEmpresa] = useState('');
  const [giro, setGiro] = useState('');
  const [direccion, setDireccion] = useState('');
  const [comuna, setComuna] = useState('');
  const [region, setRegion] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
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

  // 2. Manejador de Guardar
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);
    setActivacionExitosa(false);

    // Validación de email
    if (emailContacto.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailContacto.trim())) {
        setErrorMsg('El formato del email de contacto no es válido.');
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
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudieron guardar los cambios. Intenta de nuevo.';
      setErrorMsg(msg);
    } finally {
      setGuardando(false);
    }
  };

  const estadoOperacion = empresa?.estadoOperacion ?? 'configurando';

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

          <div className="w-16 flex justify-end">
            {/* Espaciador para centrar título */}
          </div>
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

            {/* SECCIÓN 1: Identidad Legal (SII) */}
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
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Giro Comercial <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={giro}
                      onChange={(e) => setGiro(e.target.value)}
                      placeholder="Ej: Venta mayorista de alimentos"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Dirección Casa Matriz <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej: Av. Providencia 1234, Of. 501"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* Comuna y Región */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Comuna <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={comuna}
                      onChange={(e) => setComuna(e.target.value)}
                      placeholder="Ej: Providencia"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Región <span className="text-amber-400">*</span>
                    </label>
                    <select
                      required
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 focus:outline-none transition-colors"
                    >
                      <option value="" disabled>
                        Selecciona una región...
                      </option>
                      {REGIONES_CHILE.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Email de Contacto */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Email de Contacto Fiscal <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={emailContacto}
                      onChange={(e) => setEmailContacto(e.target.value)}
                      placeholder="facturacion@tuempresa.cl"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-brand-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: Información Adicional */}
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
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Ciudad
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
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
