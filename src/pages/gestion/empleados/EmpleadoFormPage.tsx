import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Users,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  UserCheck,
  UserX,
} from 'lucide-react';
import { getEmpleadoById, createEmpleado, updateEmpleado, ApiRequestError } from '@/lib/api';

const CARGOS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'chofer', label: 'Chofer' },
  { value: 'peon', label: 'Peón' },
  { value: 'deposito', label: 'Depósito' },
  { value: 'otro', label: 'Otro' },
] as const;

export default function EmpleadoFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  // Estados de datos
  const [loading, setLoading] = useState(isEditing);
  const [guardando, setGuardando] = useState(false);

  // Estados de feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Campos
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [rut, setRut] = useState('');
  const [cargo, setCargo] = useState<string>('vendedor');
  const [fechaContratacion, setFechaContratacion] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [activo, setActivo] = useState<number>(1);

  // Cargar en modo edición
  useEffect(() => {
    if (!isEditing || !id) return;

    async function loadEmpleado() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await getEmpleadoById(Number(id));
        if (res?.data) {
          const emp = res.data;
          setNombres(emp.nombres || '');
          setApellidos(emp.apellidos || '');
          setRut(emp.rut || '');
          setCargo(emp.cargo || 'vendedor');
          setFechaContratacion(
            emp.fechaContratacion ? emp.fechaContratacion.split('T')[0] : ''
          );
          setTelefono(emp.telefono || '');
          setEmail(emp.email || '');
          // fechaNacimiento si viene en backend
          const anyEmp = emp as unknown as { fechaNacimiento?: string };
          setFechaNacimiento(
            anyEmp.fechaNacimiento ? anyEmp.fechaNacimiento.split('T')[0] : ''
          );
          setActivo(emp.activo ?? 1);
        }
      } catch (err: unknown) {
        console.error('[EmpleadoFormPage] Error al cargar empleado:', err);
        const msg =
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'No se pudo cargar la información del empleado.';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    }

    loadEmpleado();
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    // Validaciones básicas
    if (!nombres.trim() || !apellidos.trim() || !rut.trim() || !cargo || !fechaContratacion) {
      setErrorMsg('Por favor completa todos los campos requeridos (*).');
      return;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setErrorMsg('El formato del email no es válido.');
        return;
      }
    }

    setGuardando(true);

    try {
      if (isEditing && id) {
        const payload = {
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          rut: rut.trim(),
          cargo,
          fechaContratacion,
          telefono: telefono.trim() || null,
          email: email.trim() || null,
          fechaNacimiento: fechaNacimiento.trim() || null,
          activo,
        };
        await updateEmpleado(Number(id), payload);
        setExitoMsg('Empleado actualizado exitosamente.');
      } else {
        const payload = {
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          rut: rut.trim(),
          cargo,
          fechaContratacion,
          telefono: telefono.trim() || null,
          email: email.trim() || null,
          fechaNacimiento: fechaNacimiento.trim() || null,
        };
        const res = await createEmpleado(payload);
        setExitoMsg('Empleado creado exitosamente.');
        if (res?.data?.id) {
          // Redirigir a edición o lista tras 1s
          setTimeout(() => {
            navigate('/gestion/empleados');
          }, 1000);
        }
      }
    } catch (err: unknown) {
      console.error('[EmpleadoFormPage] Error al guardar empleado:', err);
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'No se pudo guardar el empleado.';
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
            onClick={() => navigate('/gestion/empleados')}
            className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h1 className="text-sm font-bold text-white">
              {isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}
            </h1>
          </div>

          <div className="w-16" />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            <p className="text-xs">Cargando empleado...</p>
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

            {/* SECCIÓN 1: Datos Personales */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Información Personal
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Datos de identificación del empleado.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Nombres y Apellidos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Nombres <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                      placeholder="Ej: Carlos Andrés"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Apellidos <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      placeholder="Ej: Silva Rojas"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* RUT */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    RUT <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    placeholder="Ej: 12.345.678-9"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                  />
                </div>

                {/* Fecha de Nacimiento */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Fecha de Nacimiento (Opcional)
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={fechaNacimiento}
                      onChange={(e) => setFechaNacimiento(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: Cargo y Contrato */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  Cargo y Función
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Rol asignado dentro de la empresa y fecha de ingreso.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Cargo */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Cargo <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    required
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl text-xs text-zinc-100 focus:outline-none transition-colors"
                  >
                    {CARGOS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha Contratación */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Fecha de Contratación <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      required
                      value={fechaContratacion}
                      onChange={(e) => setFechaContratacion(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Toggle Activo / Inactivo (solo en edición) */}
                {isEditing && (
                  <div className="pt-2 border-t border-zinc-800/80">
                    <label className="block text-xs font-semibold text-zinc-300 mb-2">
                      Estado del Empleado
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
                        <UserCheck className="w-4 h-4" />
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
                        <UserX className="w-4 h-4" />
                        <span>Inactivo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* SECCIÓN 3: Contacto */}
            <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  Datos de Contacto (Opcional)
                </h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Teléfono móvil y correo electrónico para comunicación interna.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej: +56 9 8765 4321"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ej: empleado@tuempresa.cl"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
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
                  onClick={() => navigate('/gestion/empleados')}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs flex items-center gap-2"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isEditing ? 'Guardar Cambios' : 'Crear Empleado'}
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
