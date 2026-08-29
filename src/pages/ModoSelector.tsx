import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Building2, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useJornada } from '@/contexts/JornadaContext';
import { useAuth } from '@/contexts/AuthContext';
import { getEmpresaPerfil } from '@/lib/api';
import type { EmpresaPerfil } from '@/types';

// ─── ModoSelectorPage ─────────────────────────────────────────────────────────
// Pantalla raíz post-login (reemplaza DashboardPage en /).
// Presenta dos modos: Iniciar/Continuar Jornada y Gestionar Empresa.
// Bloquea "Iniciar Jornada" si la empresa no está en estado 'activa' (ADR-014).

export default function ModoSelectorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { jornada, loading } = useJornada();

  const [empresa, setEmpresa] = useState<EmpresaPerfil | null>(null);

  useEffect(() => {
    async function loadEmpresa() {
      try {
        const res = await getEmpresaPerfil();
        if (res?.data) {
          setEmpresa(res.data);
        }
      } catch (err) {
        console.error('[ModoSelector] Error al consultar perfil de empresa:', err);
        // Si la llamada falla, no bloquear — el backend tiene el guard real
      }
    }
    loadEmpresa();
  }, []);

  const isEmpresaBloqueada = Boolean(
    empresa && empresa.estadoOperacion !== 'activa' && !jornada
  );

  return (
    <div className="min-h-dvh bg-zinc-950 flex flex-col items-center justify-center px-6 py-12">
      {/* Logo / Brand */}
      <div className="mb-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center shadow-xl shadow-brand-500/20 mb-4">
          <span className="text-2xl font-black text-white">S</span>
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">SIGLO</h1>
        <p className="text-xs text-zinc-400 mt-1">
          {user?.email?.split('@')[0] ?? 'Operador'} · <span className="capitalize">{user?.rol ?? 'vendedor'}</span>
        </p>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 text-zinc-400 py-8">
          <Loader2 className="w-7 h-7 animate-spin text-brand-400" />
          <p className="text-xs">Verificando estado de jornada...</p>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-4">
          {/* Banner de jornada activa */}
          {jornada && (
            <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-3.5 text-emerald-400 mb-2 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Tienes una jornada activa</p>
                <p className="text-emerald-400/80 mt-0.5">
                  Jornada #{jornada.id} abierta desde {
                    (() => {
                      try {
                        const d = new Date(jornada.horaApertura);
                        return isNaN(d.getTime())
                          ? jornada.horaApertura
                          : d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' hrs';
                      } catch {
                        return jornada.horaApertura;
                      }
                    })()
                  }
                </p>
              </div>
            </div>
          )}

          {/* Botón Jornada (primario) */}
          <div className="space-y-2">
            <button
              onClick={() => !isEmpresaBloqueada && navigate(jornada ? '/jornada/ruta' : '/jornada')}
              disabled={isEmpresaBloqueada}
              className={`w-full p-5 rounded-3xl flex items-center gap-4 shadow-xl transition-all ${
                isEmpresaBloqueada
                  ? 'bg-zinc-900/40 border border-zinc-800/80 opacity-60 cursor-not-allowed'
                  : 'bg-gradient-to-br from-zinc-900 to-zinc-950 border border-brand-500/30 hover:border-brand-500/50 active:scale-[0.98] group'
              }`}
            >
              <div
                className={`p-3.5 border rounded-2xl shrink-0 transition-transform ${
                  isEmpresaBloqueada
                    ? 'bg-zinc-800/50 border-zinc-700/40 text-zinc-500'
                    : 'bg-brand-500/10 border-brand-500/20 text-brand-400 group-hover:scale-110'
                }`}
              >
                <Truck className="w-7 h-7" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className={`text-base font-black ${isEmpresaBloqueada ? 'text-zinc-400' : 'text-white'}`}>
                  {jornada ? 'Continuar Jornada' : 'Iniciar Jornada'}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {jornada
                    ? 'Volver a la ruta activa'
                    : 'Asignar vehículo e iniciar ruta'}
                </p>
              </div>
              <ChevronRight
                className={`w-5 h-5 shrink-0 ${
                  isEmpresaBloqueada ? 'text-zinc-700' : 'text-zinc-500 group-hover:text-brand-400 transition-colors'
                }`}
              />
            </button>

            {/* Mensaje explicativo cuando la empresa no está configurada */}
            {isEmpresaBloqueada && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-3.5 py-2.5 text-amber-400 text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-tight">
                  Completa la configuración de tu empresa antes de iniciar jornadas.
                </p>
              </div>
            )}
          </div>

          {/* Botón Gestión (secundario) */}
          <button
            onClick={() => navigate('/gestion')}
            className="w-full p-5 bg-zinc-900/60 border border-zinc-800 rounded-3xl flex items-center gap-4 hover:bg-zinc-900 hover:border-zinc-700 transition-all active:scale-[0.98] group"
          >
            <div className="p-3.5 bg-zinc-800 border border-zinc-700/60 text-zinc-300 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-base font-bold text-zinc-200">Gestionar Empresa</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Clientes, catálogo y más
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
}

