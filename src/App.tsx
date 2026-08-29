import { useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { initConnectivityListeners } from '@/lib/sync';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { JornadaProvider, useJornada } from '@/contexts/JornadaContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// ── Componente de Fallback Simple para Suspense ──────────────────────────────
function LoadingFallback() {
  return (
    <div className="min-h-dvh bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-400">
      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      <p className="text-xs text-zinc-500 font-medium">Cargando módulo...</p>
    </div>
  );
}

// ── Auth Pages (Eager) ────────────────────────────────────────────────────────
import LoginPage from '@/pages/auth/Login';
import AuthVerifyPage from '@/pages/auth/AuthVerify';
import ModoSelectorPage from '@/pages/ModoSelector';

// ── App Shell / Catálogo (Eager) ──────────────────────────────────────────────
import AppShell from '@/pages/app/AppShell';
import CatalogoPage from '@/pages/app/Catalogo';

// ── Grupo Lazy: Checkout ──────────────────────────────────────────────────────
const CheckoutPage = lazy(() => import('@/pages/public/Checkout'));

// ── Grupo Lazy: Modo Gestión (ADR-014) ────────────────────────────────────────
const GestionHomePage = lazy(() => import('@/pages/gestion/GestionHomePage'));
const EmpresaPage = lazy(() => import('@/pages/gestion/EmpresaPage'));
const CuentasCorrientesPage = lazy(() => import('@/pages/gestion/cuentas/CuentasCorrientesPage'));
const ProductosListPage = lazy(() => import('@/pages/gestion/productos/ProductosListPage'));
const ProductoFormPage = lazy(() => import('@/pages/gestion/productos/ProductoFormPage'));
const EmpleadosListPage = lazy(() => import('@/pages/gestion/empleados/EmpleadosListPage'));
const EmpleadoFormPage = lazy(() => import('@/pages/gestion/empleados/EmpleadoFormPage'));
const VehiculosListPage = lazy(() => import('@/pages/gestion/vehiculos/VehiculosListPage'));
const VehiculoFormPage = lazy(() => import('@/pages/gestion/vehiculos/VehiculoFormPage'));
const RutasListPage = lazy(() => import('@/pages/gestion/rutas/RutasListPage'));
const RutaFormPage = lazy(() => import('@/pages/gestion/rutas/RutaFormPage'));

// ── Grupo Lazy: Modo Jornada (ADR-012 — Consolidado en un único chunk) ───────
const jornadaModulePromise = import('@/pages/jornada');
const JornadaProviderRoute = lazy(() => jornadaModulePromise.then((m) => ({ default: m.JornadaProviderRoute })));
const EscenaAbrirJornadaPage = lazy(() => jornadaModulePromise.then((m) => ({ default: m.EscenaAbrirJornadaPage })));
const EscenaCargarVehiculoPage = lazy(() => jornadaModulePromise.then((m) => ({ default: m.EscenaCargarVehiculoPage })));
const EscenaRutaClientesPage = lazy(() => jornadaModulePromise.then((m) => ({ default: m.EscenaRutaClientesPage })));
const EscenaVentaPage = lazy(() => jornadaModulePromise.then((m) => ({ default: m.EscenaVentaPage })));
const EscenaCobroPage = lazy(() => jornadaModulePromise.then((m) => ({ default: m.EscenaCobroPage })));
const EscenaCobroSinVentaPage = lazy(() => jornadaModulePromise.then((m) => ({ default: m.EscenaCobroSinVentaPage })));
const EscenaCierrePage = lazy(() => jornadaModulePromise.then((m) => ({ default: m.EscenaCierrePage })));

// ─── SyncBootstrap ────────────────────────────────────────────────────────────
// Espera a que la sesión esté hidratada (isLoading=false) antes de arrancar
// los listeners de conectividad y el primer runSync().
// Esto evita que sync dispare llamadas autenticadas antes de que fetchMe()
// complete, lo que producía 401s espurios que mataban la sesión válida.

function SyncBootstrap() {
  const { isLoading } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (isLoading || initialized.current) return;
    initialized.current = true;
    const cleanup = initConnectivityListeners();
    return cleanup;
  }, [isLoading]);

  return null;
}

// ─── JornadaResumeGuard ───────────────────────────────────────────────────────
// ADR-012 Tarea 8: Lógica de reanudación automática.
// Si el usuario tiene jornada activa y está en /, redirige a /jornada/ruta.
// Solo se ejecuta una vez tras la hidratación de la sesión.

function JornadaResumeGuard() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { jornada, loading: jornadaLoading } = useJornada();
  const navigate = useNavigate();
  const location = useLocation();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (authLoading || jornadaLoading || hasChecked.current) return;
    if (!isAuthenticated) return;

    hasChecked.current = true;

    if (jornada && location.pathname === '/') {
      navigate('/jornada/ruta', { replace: true });
    }
  }, [authLoading, jornadaLoading, isAuthenticated, jornada, location.pathname, navigate]);

  return null;
}


// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* SyncBootstrap vive dentro de AuthProvider para leer isLoading.
            Solo inicia el sync DESPUÉS de que fetchMe() resuelve la sesión,
            evitando 401s espurios de catalog/orders que dispararían el
            unauthorizedCallback y resetearían al usuario. */}
        <SyncBootstrap />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/verify" element={<AuthVerifyPage />} />

          {/* Protected Routes sin AppShell (e.g. Checkout) */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingFallback />}>
                  <CheckoutPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* ── ADR-012: Modo Selector (reemplaza Dashboard en /) ── */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <JornadaProvider>
                  <JornadaResumeGuard />
                  <ModoSelectorPage />
                </JornadaProvider>
              </ProtectedRoute>
            }
          />

          {/* ── ADR-014: Modo Gestión ── */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <Outlet />
                </Suspense>
              </ProtectedRoute>
            }
          >
            <Route path="/gestion" element={<GestionHomePage />} />
            <Route path="/gestion/empresa" element={<EmpresaPage />} />
            <Route path="/gestion/cuentas" element={<CuentasCorrientesPage />} />

            {/* Productos */}
            <Route path="/gestion/productos" element={<ProductosListPage />} />
            <Route path="/gestion/productos/nuevo" element={<ProductoFormPage />} />
            <Route path="/gestion/productos/:id/editar" element={<ProductoFormPage />} />

            {/* Empleados */}
            <Route path="/gestion/empleados" element={<EmpleadosListPage />} />
            <Route path="/gestion/empleados/nuevo" element={<EmpleadoFormPage />} />
            <Route path="/gestion/empleados/:id/editar" element={<EmpleadoFormPage />} />

            {/* Vehículos */}
            <Route path="/gestion/vehiculos" element={<VehiculosListPage />} />
            <Route path="/gestion/vehiculos/nuevo" element={<VehiculoFormPage />} />
            <Route path="/gestion/vehiculos/:id/editar" element={<VehiculoFormPage />} />

            {/* Rutas */}
            <Route path="/gestion/rutas" element={<RutasListPage />} />
            <Route path="/gestion/rutas/nuevo" element={<RutaFormPage />} />
            <Route path="/gestion/rutas/:id/editar" element={<RutaFormPage />} />
          </Route>

          {/* ── ADR-012: Modo Jornada (flujo secuencial con JornadaProvider compartido) ── */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['vendedor', 'chofer', 'admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <JornadaProviderRoute />
                </Suspense>
              </ProtectedRoute>
            }
          >
            <Route path="/jornada" element={<EscenaAbrirJornadaPage />} />
            <Route path="/jornada/carga" element={<EscenaCargarVehiculoPage />} />
            <Route path="/jornada/ruta" element={<EscenaRutaClientesPage />} />
            <Route path="/jornada/cobro-pendiente/:clienteId" element={<EscenaCobroSinVentaPage />} />
            <Route path="/jornada/venta/:clienteId" element={<EscenaVentaPage />} />
            <Route path="/jornada/cobro/:ventaId" element={<EscenaCobroPage />} />
            <Route path="/jornada/cierre" element={<EscenaCierrePage />} />
          </Route>

          {/* ── Rutas existentes dentro del AppShell (sin regresión) ── */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            {/* Catálogo */}
            <Route path="catalogo" element={<CatalogoPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
