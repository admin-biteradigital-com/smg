import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Building2 } from 'lucide-react';

// ─── GestionStubPage ──────────────────────────────────────────────────────────
// Stub del Modo Gestión. Se expandirá en iteraciones futuras.

export default function GestionStubPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-zinc-950 flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center mb-6">
        <Building2 className="w-8 h-8 text-zinc-400" />
      </div>

      <h1 className="text-xl font-black text-white mb-2">Modo Gestión</h1>
      <p className="text-sm text-zinc-400 max-w-xs leading-relaxed mb-8">
        Esta sección estará disponible una vez que la operación esté en marcha.
      </p>

      <button
        onClick={() => navigate('/')}
        className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver
      </button>
    </div>
  );
}
