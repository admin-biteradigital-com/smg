import { Outlet } from 'react-router-dom';
import { JornadaProvider } from '@/contexts/JornadaContext';

// ─── JornadaProviderRoute ─────────────────────────────────────────────────────
// Layout route component para el Modo Jornada.
// Envuelve todas las rutas /jornada/* con una única instancia compartida de
// JornadaProvider y renderiza <Outlet /> para la escena activa.
// Esto evita múltiples llamadas a GET /api/v1/jornadas/activa al navegar entre escenas.

export function JornadaProviderRoute() {
  return (
    <JornadaProvider>
      <Outlet />
    </JornadaProvider>
  );
}

export default JornadaProviderRoute;
