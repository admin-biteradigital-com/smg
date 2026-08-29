# Integración: Meta Business Agent (WhatsApp)

El agente de IA que atiende a los clientes de SMG en WhatsApp Business es **Meta Business Agent** — la plataforma nativa de Meta para agentes conversacionales. No es un sistema de Bitera Digital ni de SIGLO.

---

## Decisión de arquitectura

**Meta Business Agent** fue elegido porque:
- Free tier base: $0
- Sin infraestructura propia que defender — Meta gestiona servidores y escalabilidad
- La dependencia de Meta ya existe por el canal (WhatsApp) — el agente nativo no agrega dependencia nueva
- Conectores a APIs externas soportados nativamente → llama directamente a la API de SIGLO
- Desde enero 2026, Meta prohibió agentes de IA de terceros en WhatsApp Business API → es la única opción oficial

**Plan de contingencia:** si Meta cambia las condiciones del agente, migrar a Cloudflare Workers + Workers AI como receptor de webhook. La API de SIGLO no cambia — solo cambia quién la llama. Impacto en SIGLO: cero.

Ver ADR-005 en repo SIGLO.

---

## Flujo de operación

```
1. Cliente escribe mensaje a WhatsApp Business de SMG
         │
         ▼
2. Meta Business Agent interpreta la intención:
   pedido / consulta de catálogo / estado de entrega / otro
         │
         ├─ Pedido detectado
         │        ↓
         │  3a. POST /api/v1/orders (API de SIGLO)
         │        { clienteId, sucursalId, productos, cantidades }
         │        ↓
         │  4a. SIGLO registra el pedido en D1
         │        ↓
         │  5a. Agente responde al cliente: "Pedido #42 registrado ✓"
         │
         ├─ Consulta de catálogo
         │        ↓
         │  3b. GET /api/v1/catalog (API de SIGLO)
         │        ↓
         │  4b. Agente responde con productos disponibles
         │
         ├─ Estado de entrega
         │        ↓
         │  3c. GET /api/v1/orders/:id/status (API de SIGLO)
         │        ↓
         │  4c. Agente responde con estado actual
         │
         └─ No puede resolver
                  ↓
         Notificación en SIGLO para intervención de Sebastián
```

---

## Endpoints de SIGLO expuestos al agente

El agente usa el rol `agente_ia` en SIGLO con permisos mínimos:

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/v1/catalog` | GET | Catálogo de productos activos (sin precios internos) |
| `/api/v1/catalog/:id` | GET | Detalle de un producto |
| `/api/v1/orders` | POST | Crear pedido de cliente |
| `/api/v1/orders/:id/status` | GET | Estado de un pedido específico |
| `/api/v1/config/public` | GET | Datos públicos de contacto y horarios |

El agente **nunca** accede a: stock, rutas, empleados, facturas, cobros, o datos de otros clientes.

---

## Autenticación del agente en SIGLO API

El agente usa un JWT de larga duración provisionado por el admin de SIGLO:

```
1. Admin en SIGLO → Panel → Integraciones → Generar API Key para agente_ia
2. SIGLO crea un usuario con rol agente_ia y genera JWT (TTL: 1 año)
3. El JWT se configura en el conector de Meta Business Agent como Bearer token
4. Cada request del agente incluye: Authorization: Bearer {JWT}
```

El Worker de SIGLO valida el JWT normalmente — no distingue si la request viene del agente o de la app.

---

## Configuración en Meta Business Agent

Pasos de configuración (realizados en el panel de Meta Business Manager):

1. Verificar número de WhatsApp Business de SMG
2. Crear agente en Meta Business Agent
3. Cargar base de conocimiento:
   - Información de SMG (quiénes somos, horarios, cobertura)
   - FAQ de distribución (cómo comprar, mínimos de pedido, zonas)
4. Configurar conectores personalizados:
   - Conector "Catálogo SIGLO" → `GET /api/v1/catalog`
   - Conector "Crear Pedido" → `POST /api/v1/orders`
   - Conector "Estado de Pedido" → `GET /api/v1/orders/:id/status`
5. Definir reglas de escalación → notificación a Sebastián cuando el agente no puede resolver

---

## Datos pendientes para configurar el agente

- [ ] Número de WhatsApp Business dedicado de SMG (Sebastián)
- [ ] Texto de presentación del agente (nombre, tono, idioma)
- [ ] FAQ de SMG para la base de conocimiento
- [ ] Horario de atención para definir cuándo escalar a Sebastián
- [ ] URL de producción de la API de SIGLO para los conectores

---

## Fase de implementación

Meta Business Agent se configura en **Fase III** — cuando la API de SIGLO tiene los endpoints de pedidos implementados y probados. No bloquea el desarrollo del sitio público ni de la app interna.
