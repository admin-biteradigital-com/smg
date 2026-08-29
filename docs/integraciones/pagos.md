# Integración: Pasarela de Pago (E-commerce)

El sitio público de SMG ahora vende online — el catálogo tiene precios públicos y el cliente puede pagar sin pasar por WhatsApp. Este documento especifica la integración con la pasarela de pago.

---

## Estado de la decisión

**Pendiente de confirmar con Zelmar y Sebastián.** Candidatas evaluadas para Chile:

| Pasarela | Comisión aprox. | Integración | Notas |
|---|---|---|---|
| **Webpay (Transbank)** | ~2.95% + IVA | API REST oficial, ampliamente usada en Chile | Estándar de facto en e-commerce chileno — mayor confianza del comprador |
| **Flow.cl** | ~3.3% - 3.6% + IVA | API REST, onboarding más simple que Transbank | Buena opción para negocios pequeños/medianos |
| **MercadoPago** | ~3.5% - 4.5% + IVA | SDK + checkout hosted | Fuerte reconocimiento de marca en Latam, pero comisión más alta |

**Este documento se completa una vez elegida la pasarela.** Mientras tanto, el schema y los endpoints de SIGLO están diseñados para ser agnósticos al proveedor (ver `TRANSACCIONES_PAGO.metodo_pago` como TEXT libre, sin CHECK).

---

## Contrato que cualquier pasarela debe cumplir

Independientemente de cuál se elija, la integración necesita:

1. **Iniciar checkout** — el frontend llama a `POST /api/v1/payments/checkout` (SIGLO API) con el `idPedido`. SIGLO llama a la pasarela y devuelve una `redirectUrl`.
2. **Redirect al cliente** — el frontend redirige al cliente a `redirectUrl` (fuera del sitio de SMG, en el dominio de la pasarela). **Obligatorio: checkout hospedado o redirect — ver ADR-009 en el repo `siglo`. Una pasarela que solo ofrezca API directa (recibir el número de tarjeta en nuestro propio backend) queda descartada sin importar comisión.**
3. **Webhook de confirmación** — la pasarela llama a `POST /api/v1/payments/webhook` (SIGLO API) cuando el pago se aprueba o rechaza. Este endpoint no usa la sesión del cliente — se autentica con el mecanismo de firma propio de cada pasarela. **Es idempotente por diseño** (ADR-009): un mismo webhook reenviado (comportamiento normal de toda pasarela, no una falla) nunca procesa la misma transacción dos veces — el guard es `TRANSACCIONES_PAGO.webhook_procesado_at`.
4. **Retorno al sitio** — tras el pago, la pasarela redirige de vuelta a una URL de "gracias" en el sitio de SMG (`/checkout/exito` o `/checkout/error`).
5. **Reconciliación diaria** — SIGLO corre un cron (`"0 8 * * *"`) que consulta el estado real de cada transacción `pendiente` directamente en la API de la pasarela, para detectar y corregir webhooks que nunca llegaron. **Requisito para elegir pasarela: debe exponer un endpoint de "consultar estado de transacción por ID" que SIGLO pueda llamar** — sin esto, la reconciliación no es posible y el punto 3 queda como única red de seguridad.

```
Cliente en /checkout
     │
     ▼
POST /api/v1/payments/checkout { idPedido }
     │
     ▼
SIGLO crea TRANSACCIONES_PAGO (estado='pendiente', referencia_externa=NULL)
SIGLO llama a la API de la pasarela → obtiene redirectUrl + referencia_externa
     │
     ▼
Frontend redirige al cliente a redirectUrl (sitio de la pasarela)
     │
     ▼
Cliente paga en el sitio de la pasarela
     │
     ├─→ Pasarela → POST /api/v1/payments/webhook (SIGLO)
     │     │
     │     ├─ webhook_procesado_at ya tiene valor → responder 200, no reprocesar
     │     └─ primera vez → actualiza TRANSACCIONES_PAGO + PEDIDOS_CLIENTE.estado_pago
     │
     └─→ Pasarela redirige al cliente de vuelta a:
         /checkout/exito?pedido=42   (si aprobado)
         /checkout/error?pedido=42   (si rechazado)

[cada día, 05:00 Santiago]
Cron de reconciliación revisa TRANSACCIONES_PAGO pendientes > 2h
→ consulta la pasarela → corrige lo que el webhook no reportó
→ registra la corrida en RECONCILIACION_PAGOS
```

---

## Páginas del frontend necesarias (pendiente de crear cuando se elija pasarela)

| Página | Ruta | Propósito |
|---|---|---|
| Carrito | `/carrito` | Ver productos agregados, ajustar cantidades |
| Checkout | `/checkout` | Datos de entrega + confirmar pedido + checkbox de aceptación de `/terminos` |
| Éxito de pago | `/checkout/exito` | Confirmación post-pago aprobado |
| Error de pago | `/checkout/error` | Mensaje si el pago fue rechazado, opción de reintentar |

Ver especificación completa de estas páginas una vez confirmada la pasarela — hoy no se detallan wireframes para no comprometer decisiones de UI a un proveedor específico (los flujos de Webpay, Flow y MercadoPago difieren en detalles de redirect).

El checkbox de aceptación de `/terminos` (ver `docs/sitio-publico/paginas/terminos.md`) es obligatorio antes de habilitar el botón de pago — sin marcar, no se puede continuar.

---

## Seguridad

- **SIGLO nunca recibe ni almacena datos de tarjeta** — ningún `<input>` de número de tarjeta, CVV, o vencimiento en el sitio de SMG, ningún campo de esos en el body de ningún request a la API. Ver ADR-009 (repo `siglo`) para el razonamiento de por qué esto mantiene a Bitera Digital en la categoría más simple de cumplimiento PCI-DSS (SAQ A).
- **Nunca** confiar en el monto o estado de pago que llega desde el frontend — el Worker de SIGLO valida contra `PRODUCTOS_SERVICIOS.precio_publico` server-side.
- El webhook de la pasarela se valida con su mecanismo de firma específico (HMAC, certificado, o token secreto según el proveedor elegido) — configurado como secret en Cloudflare, nunca hardcodeado.
- El webhook **siempre** verifica `webhook_procesado_at` antes de cualquier `UPDATE` — sin excepción, sin importar cuán confiable parezca la pasarela.
- Las credenciales de la pasarela (API key, secret) se configuran con `wrangler secret put` — mismo patrón que el resto de secrets de SIGLO.

---

## Checklist para cuando se elija la pasarela

- [ ] Confirmar que ofrece checkout hospedado/redirect (no negociable — ver arriba)
- [ ] Confirmar que expone un endpoint de consulta de estado de transacción (necesario para reconciliación diaria)
- [ ] Actualizar este documento con el flujo específico del proveedor elegido
- [ ] Agregar `CHECK` constraint a `TRANSACCIONES_PAGO.metodo_pago` en una migración (`0002_*.sql`) — hoy es TEXT libre a propósito
- [ ] Crear cuenta comercial con la pasarela (requiere RUT de SMG activo)
- [ ] Configurar secrets en Cloudflare (`wrangler secret put`)
- [ ] Implementar páginas de carrito/checkout en el frontend, incluyendo el checkbox de `/terminos`
- [ ] Probar en ambiente sandbox de la pasarela antes de producción — incluir prueba de reenvío de webhook duplicado para confirmar que la idempotencia funciona
- [ ] Definir política de reembolsos con Sebastián (alimentar `/terminos`, §6)
- [ ] Confirmar contenido legal final de `docs/sitio-publico/paginas/terminos.md` con revisión de un abogado
