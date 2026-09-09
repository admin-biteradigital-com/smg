import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Store,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  User,
  Power,
} from 'lucide-react';
import {
  getProveedorById,
  createProveedor,
  updateProveedor,
  ApiRequestError,
} from '@/lib/api';
import { validateRut, formatRut, cleanRut } from '@/lib/rut';
import type {
  ProveedorAdminItem,
  CreateProveedorPayload,
  UpdateProveedorPayload,
} from '@/types';

export default function ProveedorFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const proveedorId = id ? Number(id) : null;

  // Estados de carga y feedback
  const [loading, setLoading] = useState(isEditing);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Campos de Proveedor
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [activo, setActivo] = useState(true);

  // 1. Cargar datos del proveedor en modo edición
  const loadProveedorData = async () => {
    if (!proveedorId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getProveedorById(proveedorId);
      if (res?.data) {
        const prov: ProveedorAdminItem = res.data;
        setNombre(prov.nombre || '');
        setRut(prov.rut || '');
        setContacto(prov.contacto || '');
        setTelefono(prov.telefono || '');
        setEmail(prov.email || '');
        setDireccion(prov.direccion || '');
        setActivo(prov.activo);
      }
    } catch (err: unknown) {
      console.error('[ProveedorFormPage] Error al cargar proveedor:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo cargar la información del proveedor.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEditing) {
      loadProveedorData();
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

  // 2. Guardar Proveedor (Crear / Actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    const cleanNombre = nombre.trim();
    const cleanRutVal = rut.trim();

    if (!cleanNombre) {
      setErrorMsg('El nombre o razón social es requerido.');
      return;
    }

    if (!cleanRutVal) {
      setErrorMsg('El RUT es requerido.');
      return;
    }

    if (rutValido === false) {
      setErrorMsg('El RUT ingresado no es válido según el algoritmo Módulo 11.');
      return;
    }

    setGuardando(true);

    try {
      if (isEditing && proveedorId) {
        const payload: UpdateProveedorPayload = {
          nombre: cleanNombre,
          rut: cleanRutVal,
          contacto: contacto.trim() || null,
          telefono: telefono.trim() || null,
          email: email.trim() || null,
          direccion: direccion.trim() || null,
          activo,
        };

        await updateProveedor(proveedorId, payload);
        setExitoMsg('Proveedor actualizado exitosamente.');
      } else {
        const payload: CreateProveedorPayload = {
          nombre: cleanNombre,
          rut: cleanRutVal,
          contacto: contacto.trim() || null,
          telefono: telefono.trim() || null,
          email: email.trim() || null,
          direccion: direccion.trim() || null,
        };

        const res = await createProveedor(payload);
        setExitoMsg('Proveedor registrado exitosamente.');

        if (res?.data?.id) {
          setTimeout(() => {
            navigate(`/gestion/proveedores/${res.data.id}/editar`);
          }, 1000);
        }
      }
    } catch (err: unknown) {
      console.error('[ProveedorFormPage] Error al guardar proveedor:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Error al guardar el proveedor.';
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
            onClick={() => navigate('/gestion/proveedores')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white">
              {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h1>
          </div>

          <div className="w-16" />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs">Cargando datos del proveedor...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mensajes de Feedback Global */}
            {errorMsg && (
              <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 text-xs text-rose-400 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed flex-1">{errorMsg}</p>
              </div>
            )}

            {exitoMsg && (
              <div className="flex items-start gap-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-300 font-medium animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed flex-1">{exitoMsg}</p>
              </div>
            )}

            {/* SECCIÓN 1: Identificación Principal */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-400" />
                  Identificación del Proveedor
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Razón social o nombre comercial y RUT chileno validado.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Nombre / Razón Social */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Nombre o Razón Social <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Distribuidora Mayorista del Sur SpA"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* RUT con Feedback en vivo */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      RUT <span className="text-emerald-400">*</span>
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
                        : 'border-zinc-800 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: Contacto y Ubicación */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  Contacto y Ubicación
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Datos de contacto del ejecutivo comercial y dirección de despacho/retiro.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Persona de Contacto */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Ej: Carlos Silva (Ejecutivo de Cuentas)"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Teléfono
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="+56 9 1234 5678"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ventas@proveedor.cl"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Dirección o Bodega
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Ej: Av. Panamericana Sur km 1020, Puerto Montt"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: Estado (solo en modo edición) */}
            {isEditing && (
              <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-zinc-200">
                      Estado del Proveedor
                    </label>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Desactivar el proveedor impedirá seleccionarlo en futuras compras.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivo(!activo)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      activo
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{activo ? 'Activo' : 'Inactivo'}</span>
                  </button>
                </div>
              </section>
            )}

            {/* Footer Fijo con Botón Guardar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-4 py-3">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/gestion/proveedores')}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs flex items-center gap-2"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isEditing ? 'Guardar Cambios' : 'Crear Proveedor'}</span>
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
