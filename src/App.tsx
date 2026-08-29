import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { initConnectivityListeners } from '@/lib/sync';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { JornadaProvider, useJornada } from '@/contexts/JornadaContext';
import { PedidoActivoProvider } from '@/store/pedidoActivo';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// ── Auth Pages ────────────────────────────────────────────────────────────────
import LoginPage from '@/pages/auth/Login';
import AuthVerifyPage from '@/pages/auth/AuthVerify';
import CheckoutPage from '@/pages/public/Checkout';

// ── App Shell ─────────────────────────────────────────────────────────────────
import AppShell from '@/pages/app/AppShell';
// @deprecated - DashboardPage reemplazado por ModoSelectorPage (ADR-012)
// @deprecated - JornadaPage reemplazado por Escenas en src/pages/jornada/ (ADR-012)
import ClientesPage from '@/pages/app/Clientes';
import CatalogoPage from '@/pages/app/Catalogo';
import SyncStatusPage from '@/pages/app/SyncStatus';

// ── ADR-014: Modo Gestión ───────────────────────────────────────────────────
import GestionHomePage from '@/pages/gestion/GestionHomePage';
import EmpresaPage from '@/pages/gestion/EmpresaPage';
import CuentasCorrientesPage from '@/pages/gestion/cuentas/CuentasCorrientesPage';
import ProductosListPage from '@/pages/gestion/productos/ProductosListPage';
import ProductoFormPage from '@/pages/gestion/productos/ProductoFormPage';
import EmpleadosListPage from '@/pages/gestion/empleados/EmpleadosListPage';
import EmpleadoFormPage from '@/pages/gestion/empleados/EmpleadoFormPage';
import VehiculosListPage from '@/pages/gestion/vehiculos/VehiculosListPage';
import VehiculoFormPage from '@/pages/gestion/vehiculos/VehiculoFormPage';
import RutasListPage from '@/pages/gestion/rutas/RutasListPage';
import RutaFormPage from '@/pages/gestion/rutas/RutaFormPage';

// ── ADR-012: Páginas y Layout de Modo Jornada ────────────────────────────────
import { JornadaProviderRoute } from '@/components/layout/JornadaProviderRoute';
import ModoSelectorPage from '@/pages/ModoSelector';
import EscenaAbrirJornadaPage from '@/pages/jornada/EscenaAbrirJornada';
import EscenaCargarVehiculoPage from '@/pages/jornada/EscenaCargarVehiculo';
import EscenaRutaClientesPage from '@/pages/jornada/EscenaRutaClientes';
import EscenaVentaPage from '@/pages/jornada/EscenaVenta';
import EscenaCobroPage from '@/pages/jornada/EscenaCobro';
import EscenaCobroSinVentaPage from '@/pages/jornada/EscenaCobroSinVenta';
import EscenaCierrePage from '@/pages/jornada/EscenaCierre';

// ── Flujo Pedido ──────────────────────────────────────────────────────────────
import NuevoPedidoPage from '@/pages/app/pedido/NuevoPedido';
import SelectorClientePage from '@/pages/app/pedido/SelectorCliente';
import SelectorItemsPage from '@/pages/app/pedido/SelectorItems';
import ConfirmarPedidoPage from '@/pages/app/pedido/ConfirmarPedido';

// ─── Wrapper que inyecta el provider del pedido activo (necesita user.userId) ─────

function AppWithPedidoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <>{children}</>;
  return (
    <PedidoActivoProvider userId={user.userId}>
      {children}
    </PedidoActivoProvider>
  );
}

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
                <CheckoutPage />
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
            path="/gestion"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <GestionHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestion/empresa"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EmpresaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestion/cuentas"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CuentasCorrientesPage />
              </ProtectedRoute>
            }
          />

          {/* Productos */}
          <Route
            path="/gestion/productos"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ProductosListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestion/productos/nuevo"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ProductoFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestion/productos/:id/editar"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ProductoFormPage />
              </ProtectedRoute>
            }
          />

          {/* Empleados */}
          <Route
            path="/gestion/empleados"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EmpleadosListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestion/empleados/nuevo"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EmpleadoFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestion/empleados/:id/editar"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EmpleadoFormPage />
              </ProtectedRoute>
            }
          />

          {/* Vehículos */}
          <Route
            path="/gestion/vehiculos"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <VehiculosListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestion/vehiculos/nuevo"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <VehiculoFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestion/vehiculos/:id/editar"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <VehiculoFormPage />
              </ProtectedRoute>
            }
          />

          {/* Rutas */}
          <Route
            path="/gestion/rutas"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RutasListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestion/rutas/nuevo"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RutaFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestion/rutas/:id/editar"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RutaFormPage />
              </ProtectedRoute>
            }
          />

          {/* ── ADR-012: Modo Jornada (flujo secuencial con JornadaProvider compartido) ── */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['vendedor', 'chofer', 'admin']}>
                <JornadaProviderRoute />
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
                <AppWithPedidoProvider>
                  <AppShell />
                </AppWithPedidoProvider>
              </ProtectedRoute>
            }
          >
            {/* Clientes */}
            <Route path="clientes" element={<ClientesPage />} />

            {/* Catálogo */}
            <Route path="catalogo" element={<CatalogoPage />} />

            {/* Sincronización */}
            <Route path="sync" element={<SyncStatusPage />} />

            {/* ── Flujo Nuevo Pedido ──────────────────────────────── */}
            <Route path="pedidos/nuevo" element={<NuevoPedidoPage />} />
            <Route path="pedidos/nuevo/cliente" element={<SelectorClientePage />} />
            <Route path="pedidos/nuevo/items" element={<SelectorItemsPage />} />
            <Route path="pedidos/nuevo/confirmar" element={<ConfirmarPedidoPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
