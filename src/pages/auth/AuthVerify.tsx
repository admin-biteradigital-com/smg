import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, type AuthUser } from '@/contexts/AuthContext';

export default function AuthVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const verifyStarted = useRef(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Token de acceso ausente o no válido.');
      return;
    }

    // Evitar doble invocación en React StrictMode
    if (verifyStarted.current) return;
    verifyStarted.current = true;

    async function verifyToken() {
      try {
        // 1. Verificar token contra backend
        await api.get(`/api/v1/auth/verify?token=${encodeURIComponent(token!)}`);
        
        // 2. Hidratar usuario inmediatamente tras verificar exitosamente
        const meRes = await api.get<{ data: AuthUser }>('/api/v1/auth/me');
        if (meRes?.data) {
          setUser(meRes.data);
        }
        
        setStatus('success');
        
        // Redirigir al dashboard tras una breve pausa para mostrar el éxito en la UI
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message || 'El enlace de acceso ha expirado o ya fue utilizado.');
      }
    }

    verifyToken();
  }, [token, navigate, setUser]);

  return (
    <div className="min-h-dvh bg-surface-950 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden select-none">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-brand-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-accent-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm z-10 animate-slide-up">
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 shadow-2xl text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-2" />
              <h2 className="text-lg font-bold text-white">Verificando acceso</h2>
              <p className="text-xs text-zinc-400 max-w-xs">
                Estamos validando tu enlace de acceso seguro. Esto tomará sólo unos segundos.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 animate-pulse">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">¡Acceso Verificado!</h2>
              <p className="text-xs text-zinc-400">
                Sesión iniciada con éxito. Redirigiendo a tu panel de control...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
                <ShieldAlert className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Error de Acceso</h2>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                {errorMessage}
              </p>
              <Link
                to="/login"
                className="w-full py-3 px-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-700 text-zinc-300 rounded-2xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
              >
                Volver a intentar
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
