import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, DollarSign, ChevronRight, ChevronLeft, AlertCircle, Users, Truck, MapPin, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getEmpresaPerfil } from '@/lib/api';
import type { EmpresaPerfil } from '@/types';

// ─── GestionHomePage ──────────────────────────────────────────────────────────
// Shell de navegación por cards de Modo Gestión (ADR-014 Entrega A y B).
// Ruta: /gestion

export default function GestionHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [empresa, setEmpresa] = useState<EmpresaPerfil | null>(null);

  useEffect(() => {
    async function loadEmpresa() {
      try {
        const res = await getEmpresaPerfil();
        if (res?.data) {
          setEmpresa(res.data);
        }
      } catch (err) {
        console.error('[GestionHome] Error al cargar perfil de empresa:', err);
        // Degradación silenciosa: no bloquea si hay error de red
      }
    }
    loadEmpresa();
  }, []);

  const esConfiguracionPendiente = empresa?.estadoOperacion === 'configurando';
  const esAdmin = user?.rol === 'admin';

  return (
    <div className="min-h-dvh bg-zinc-950 flex flex-col items-center justify-center px-6 py-12">
      {/* Header / Brand */}
      <div className="mb-8 text-center max-w-sm w-full">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shadow-lg mb-3.5">
          <Building2 className="w-7 h-7 text-zinc-300" />
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">Modo Gestión</h1>
        <p className="text-xs text-zinc-400 mt-1">
          {user?.email?.split('@')[0] ?? 'Administrador'} ·{' '}
          <span className="capitalize text-zinc-300 font-semibold">{user?.rol ?? 'admin'}</span>
        </p>
      </div>

      {/* Cards de Navegación */}
      <div className="w-full max-w-sm space-y-3.5">
        {/* Card 1: Perfil de Empresa */}
        <button
          onClick={() => navigate('/gestion/empresa')}
          className="w-full p-5 bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-3xl flex items-center gap-4 transition-all active:scale-[0.98] group text-left shadow-lg"
        >
          <div className="p-3.5 bg-zinc-800/80 border border-zinc-700/60 text-brand-400 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
            <Building2 className="w-7 h-7" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-bold text-zinc-100">Perfil de Empresa</p>
              {esConfiguracionPendiente && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Configuración pendiente
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Datos fiscales, contacto y configuración inicial
            </p>
          </div>

          <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
        </button>

        {/* Card 2: Cuentas Corrientes (Solo Admin) */}
        {esAdmin && (
          <button
            onClick={() => navigate('/gestion/cuentas')}
            className="w-full p-5 bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-3xl flex items-center gap-4 transition-all active:scale-[0.98] group text-left shadow-lg"
          >
            <div className="p-3.5 bg-zinc-800/80 border border-zinc-700/60 text-emerald-400 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
              <DollarSign className="w-7 h-7" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-zinc-100">Cuentas Corrientes</p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Clientes con saldo pendiente y cobros remotos
              </p>
            </div>

            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
          </button>
        )}

        {/* Card 3: Productos (Solo Admin) */}
        {esAdmin && (
          <button
            onClick={() => navigate('/gestion/productos')}
            className="w-full p-5 bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-3xl flex items-center gap-4 transition-all active:scale-[0.98] group text-left shadow-lg"
          >
            <div className="p-3.5 bg-zinc-800/80 border border-zinc-700/60 text-violet-400 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
              <Package className="w-7 h-7" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-zinc-100">Productos</p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Catálogo de productos y precios
              </p>
            </div>

            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
          </button>
        )}

        {/* Card 4: Empleados */}
        {esAdmin && (
          <button
            onClick={() => navigate('/gestion/empleados')}
            className="w-full p-5 bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-3xl flex items-center gap-4 transition-all active:scale-[0.98] group text-left shadow-lg"
          >
            <div className="p-3.5 bg-zinc-800/80 border border-zinc-700/60 text-cyan-400 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
              <Users className="w-7 h-7" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-zinc-100">Empleados</p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Vendedores, choferes y personal
              </p>
            </div>

            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
          </button>
        )}

        {/* Card 4: Vehículos */}
        {esAdmin && (
          <button
            onClick={() => navigate('/gestion/vehiculos')}
            className="w-full p-5 bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-3xl flex items-center gap-4 transition-all active:scale-[0.98] group text-left shadow-lg"
          >
            <div className="p-3.5 bg-zinc-800/80 border border-zinc-700/60 text-amber-400 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
              <Truck className="w-7 h-7" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-zinc-100">Vehículos</p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Flota de vehículos de reparto
              </p>
            </div>

            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
          </button>
        )}

        {/* Card 5: Rutas */}
        {esAdmin && (
          <button
            onClick={() => navigate('/gestion/rutas')}
            className="w-full p-5 bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-3xl flex items-center gap-4 transition-all active:scale-[0.98] group text-left shadow-lg"
          >
            <div className="p-3.5 bg-zinc-800/80 border border-zinc-700/60 text-purple-400 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
              <MapPin className="w-7 h-7" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-zinc-100">Rutas</p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Rutas de distribución y zonas
              </p>
            </div>

            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0" />
          </button>
        )}
      </div>

      {/* Footer: Volver al Inicio */}
      <div className="w-full max-w-sm mt-8">
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al Inicio
        </button>
      </div>
    </div>
  );
}
