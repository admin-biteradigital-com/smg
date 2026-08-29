# SYNC.md — Estado de dependencia cruzada (SMG)

## Este repo espera del otro (siglo)
- [x] CORS habilitado para smg-staging.biteradigital.com y siglo.smg.biteradigital.com (confirmado por siglo hoy)
- [x] Definición de pasarela de pago (Webpay Plus / Transbank — ADR-009 CERRADO) — `Checkout.tsx` desbloqueado e implementado con Hosted Checkout.
- [x] Confirmación de endpoint de catálogo público exponiendo `precioPublico` (y `precioOferta`) — consumidos en catálogo frontend.
- [x] Confirmación de contrato final de POST /api/v1/orders con `canal='sitio_web'`, `idSucursal`, `items`, `requierePagoOnline`, `fechaEntregaAcordada` y `notas` — autenticación requerida vía `ProtectedRoute` y cálculo de precios server-side.

## Este repo le debe al otro (siglo)
- [ ] Ninguno pendiente por ahora

Última sincronización: 2026-08-09


