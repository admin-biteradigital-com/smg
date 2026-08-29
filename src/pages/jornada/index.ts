// ─── Barrel Export de Modo Jornada (ADR-012) ──────────────────────────────────
// Agrupa todas las escenas y componentes de layout del Modo Jornada con imports
// estáticos para consolidarlos en un único chunk lazy y evitar pantallas de carga
// intermedias entre escenas durante la operación offline.

export { default as JornadaProviderRoute } from '@/components/layout/JornadaProviderRoute';
export { default as EscenaAbrirJornadaPage } from './EscenaAbrirJornada';
export { default as EscenaCargarVehiculoPage } from './EscenaCargarVehiculo';
export { default as EscenaRutaClientesPage } from './EscenaRutaClientes';
export { default as EscenaVentaPage } from './EscenaVenta';
export { default as EscenaCobroPage } from './EscenaCobro';
export { default as EscenaCobroSinVentaPage } from './EscenaCobroSinVenta';
export { default as EscenaCierrePage } from './EscenaCierre';
