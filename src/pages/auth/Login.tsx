import { useState } from 'react';
import { Mail, Send, ArrowLeft, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { api } from '@/lib/api';

const emailSchema = z.string().email('Ingresa un correo electrónico válido');

type LoginStep = 'email' | 'success';

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar email con Zod
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Llamar al endpoint nativo de Better Auth para magic link
      const res: any = await api.post('/api/auth/sign-in/magic-link', {
        email,
        callbackURL: `${window.location.origin}/`,
      });

      // Better Auth devuelve respuestas 200 OK con formas como { status: true } o { success: true }.
      // Si no se lanzó excepción en api.post y la respuesta no indica explícitamente status === false o success === false:
      if (res && (res.status === false || res.success === false)) {
        throw new Error(res.message || res.error || 'No se pudo enviar el enlace. Verifica tu correo e intenta nuevamente.');
      }

      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar el enlace. Verifica tu correo e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface-950 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden select-none">
      {/* Background decorations for premium dark mode */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-brand-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-accent-600/10 blur-[120px] pointer-events-none" />

      {/* Logo / Branding */}
      <div className="mb-8 flex flex-col items-center gap-4 z-10 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center shadow-glow">
          <span className="text-3xl font-black text-white tracking-tight">S</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">SIGLO ERP</h1>
          <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-semibold">SMG Distribuidora</p>
        </div>
      </div>

      {/* Card con Glassmorphism */}
      <div className="w-full max-w-sm z-10 animate-slide-up">
        {step === 'email' ? (
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Iniciar sesión</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Te enviaremos un enlace de acceso seguro, sin contraseña.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="vendedor@smg.cl"
                    className="w-full pl-11 pr-4 py-3 bg-zinc-950/80 border border-zinc-800 focus:border-brand-500 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white rounded-2xl font-bold shadow-lg shadow-brand-950/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando enlace...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar enlace de acceso
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
              <Mail className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Revisa tu correo</h2>
            <p className="text-sm text-zinc-400 mb-1">
              Hemos enviado un enlace de acceso a:
            </p>
            <p className="text-sm font-semibold text-brand-400 mb-6 break-all">{email}</p>
            <div className="bg-zinc-950/40 rounded-2xl p-4 mb-6 border border-zinc-800/40">
              <p className="text-xs text-zinc-500 leading-relaxed">
                El enlace expira en 10 minutos. Si no lo encuentras en tu bandeja de entrada, revisa tu carpeta de correo no deseado (spam).
              </p>
            </div>
            <button
              className="w-full py-3 px-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-700 text-zinc-300 rounded-2xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
              onClick={() => { setStep('email'); setError(null); }}
            >
              <ArrowLeft className="w-4 h-4" />
              Usar otro correo
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="mt-12 text-xs text-zinc-600 text-center z-10 font-medium">
        SIGLO ERP PWA · Bitera Digital
      </p>
    </div>
  );
}
