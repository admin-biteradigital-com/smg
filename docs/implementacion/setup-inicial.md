# Setup Inicial — SIGLO para SMG

Guía completa para levantar una instancia de SIGLO desde cero para el cliente SMG Distribuidora.

---

## Prerequisitos

- Cuenta Cloudflare (admin-biteradigital-com)
- Wrangler CLI instalado: `npm install -g wrangler`
- Node.js 20+
- Acceso al repositorio `github.com/admin-biteradigital-com/siglo`
- Acceso al repositorio `github.com/admin-biteradigital-com/smg`

---

## PASO 1 — Crear recursos en Cloudflare

```bash
# Autenticar con Cloudflare
wrangler login

# 1a. Crear base de datos D1 (producción)
wrangler d1 create siglo-db-prod
# → Anotar el database_id en wrangler.toml

# 1b. Crear base de datos D1 (staging)
wrangler d1 create siglo-db-staging

# 1c. Crear KV namespace (producción)
wrangler kv namespace create "siglo-kv-prod"
# → Anotar el id en wrangler.toml

# 1d. Crear KV namespace (staging)
wrangler kv namespace create "siglo-kv-staging"

# 1e. Crear R2 bucket
wrangler r2 bucket create siglo-assets

# 1f. Crear Queue (producción)
wrangler queues create siglo-queue
wrangler queues create siglo-dlq    # Dead Letter Queue para errores

# 1g. Crear Queue (staging)
wrangler queues create siglo-queue-staging
```

---

## PASO 2 — Configurar wrangler.toml

```bash
# En el repo siglo/
cp wrangler.toml.example wrangler.toml

# Completar los TODO con los IDs obtenidos en el paso anterior:
# - database_id de D1 prod y staging
# - id de KV prod y staging
# - ADMIN_EMAIL con el email de Sebastián
# - CORS_ORIGINS con la URL del frontend SMG
```

---

## PASO 3 — Configurar secrets en Cloudflare

```bash
# Better Auth — generar un secret seguro (mínimo 32 caracteres)
# Ejemplo: openssl rand -base64 32
wrangler secret put BETTER_AUTH_SECRET
# → ingresar el string generado cuando lo pida

# Google OAuth — configurar en Google Cloud Console primero:
# https://console.cloud.google.com/apis/credentials
# → OAuth 2.0 Client ID con redirect: https://siglo.smg.biteradigital.com/api/v1/auth/google/callback
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET

# Resend — obtener API key en resend.com
wrangler secret put RESEND_API_KEY

# Para staging (agregar --env staging a cada comando)
wrangler secret put BETTER_AUTH_SECRET --env staging
wrangler secret put RESEND_API_KEY --env staging
# (Google OAuth staging puede usar las mismas credenciales si se agrega la URL de staging como redirect)
```

---

## PASO 4 — Inicializar la base de datos

```bash
# Aplicar schema (producción)
wrangler d1 execute siglo-db-prod \
  --file=docs/datos/schema.sql

# Aplicar seed inicial
wrangler d1 execute siglo-db-prod \
  --file=docs/datos/seed.sql

# Aplicar seed específico de SMG
wrangler d1 execute siglo-db-prod \
  --file=../smg/docs/implementacion/seed-smg.sql

# Repetir para staging
wrangler d1 execute siglo-db-staging \
  --file=docs/datos/schema.sql --env staging
wrangler d1 execute siglo-db-staging \
  --file=docs/datos/seed.sql --env staging
wrangler d1 execute siglo-db-staging \
  --file=../smg/docs/implementacion/seed-smg.sql --env staging
```

---

## PASO 5 — Crear usuario admin inicial

```bash
# Después del primer deploy, crear el usuario admin de Sebastián
# usando la API de Better Auth Admin:

curl -X POST https://siglo.smg.biteradigital.com/api/v1/admin/bootstrap \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Secret: [BETTER_AUTH_SECRET]" \
  -d '{
    "email": "[email de Sebastián]",
    "rol": "admin",
    "nombre": "Sebastián Marín"
  }'
```

> **Nota:** El endpoint `/api/v1/admin/bootstrap` solo funciona cuando no existe ningún usuario admin en D1. Después del primer uso queda deshabilitado automáticamente.

---

## PASO 6 — Deploy inicial

```bash
# Deploy a staging primero
wrangler deploy --env staging

# Verificar health check
curl https://siglo-staging.smg.biteradigital.com/api/v1/health
# → Esperar: {"status":"ok","version":"1"}

# Deploy a producción
wrangler deploy --env production

# Verificar
curl https://siglo.smg.biteradigital.com/api/v1/health
```

---

## PASO 7 — Configurar GitHub Actions

En el repo GitHub:
1. `Settings → Secrets and variables → Actions`
2. Agregar: `CLOUDFLARE_API_TOKEN` (API Token con permisos Workers + D1)
3. `Settings → Environments → New environment: production`
4. En `production`: activar "Required reviewers" → agregar `@zelmar`

---

## PASO 8 — Configurar Cloudflare Pages (SMG frontend)

```bash
# En el repo smg/
# Cloudflare Pages se configura desde el dashboard de Cloudflare:
# Pages → Create project → Connect to Git → smg repo → main branch

# Variables de entorno en Pages (Settings → Environment variables):
# Production:
VITE_SIGLO_API_URL=https://siglo.smg.biteradigital.com
VITE_VAPID_PUBLIC_KEY=[public key VAPID generada]

# Preview (staging):
VITE_SIGLO_API_URL=https://siglo-staging.smg.biteradigital.com
VITE_VAPID_PUBLIC_KEY=[public key VAPID]
```

---

## PASO 9 — Completar datos PENDIENTE en CONFIGURACION

Acceder a SIGLO como admin y completar los valores marcados como `PENDIENTE`:

| Clave | Valor a completar |
|---|---|
| `empresa_nombre` | Razón social de SMG |
| `empresa_rut` | RUT de SMG |
| `empresa_direccion` | Dirección de Chamiza |
| `empresa_ciudad` | Chamiza |
| `empresa_region` | Los Lagos |
| `empresa_telefono` | Teléfono de contacto |
| `empresa_email` | Email de contacto |
| `whatsapp_numero` | Número WhatsApp Business (+56...) |
| `instagram_url` | URL del perfil (si existe) |

---

## PASO 10 — Carga inicial de datos

En el panel de admin de SIGLO, cargar manualmente:

1. **Empleados** — Sebastián + choferes + vendedores + personal depósito
2. **Vehículos** — flota completa
3. **Proveedores** — proveedores actuales de golosinas
4. **Catálogo** — los ~80 SKUs con código de barras, unidades, precios
5. **Clientes** — base de clientes existentes

> El catálogo inicial puede cargarse también vía CSV si se implementa el endpoint `/api/v1/admin/catalog/import`.

---

## Verificación de Go-Live

Checklist técnico antes de declarar producción lista:

- [ ] Health check responde 200 en producción
- [ ] Login con magic link funciona (Sebastián recibe el email)
- [ ] Panel admin muestra dashboard
- [ ] Formulario de lead del sitio público crea registro en D1
- [ ] SSL Labs: A+ en smg.biteradigital.com
- [ ] SecurityHeaders: A+ en smg.biteradigital.com
- [ ] Política de privacidad publicada en /privacidad
- [ ] Términos y condiciones de compra publicados en /terminos, con contenido legal confirmado (no PENDIENTE) si el e-commerce ya está activo
- [ ] Backup D1 cron activo (verificar en Cloudflare Dashboard → Workers → Cron Triggers)
- [ ] **Simulacro de restore ejecutado al menos una vez, con resultado exitoso registrado** — ver `docs/infraestructura/continuidad.md` (repo `siglo`). No declarar Go-Live sin esto.
- [ ] Manuales de uso por rol (`docs/manuales/`) compartidos con Sebastián y su equipo antes del primer día de uso real

### Si el e-commerce ya está activo, además:

- [ ] Pasarela de pago configurada en modo producción (no sandbox)
- [ ] Idempotencia del webhook probada — un mismo webhook reenviado no duplica una venta (ver ADR-009, repo `siglo`)
- [ ] Cron de reconciliación diaria corriendo (verificar en Cloudflare Dashboard)
- [ ] Ningún formulario de tarjeta propio en ninguna página — solo redirect a la pasarela

---

## Métrica de éxito de la implementación (ADR-010)

> **El 100% de las ventas reales de SMG deben pasar por la aplicación dentro de las primeras 4 semanas desde el Go-Live.**

No es un checklist técnico — es el criterio de negocio para decidir si la implementación funcionó. Si al cierre de la semana 4 sigue habiendo ventas que no quedan registradas en el sistema (cuaderno, WhatsApp sin registrar, memoria), se hace una revisión con Sebastián para entender la causa antes de decidir próximos pasos.

**Seguimiento sugerido:** revisar semanalmente el conteo de `ORDENES_VENTA` contra una estimación independiente del volumen real de ventas de SMG (ej. cotejando con el stock consumido) durante ese primer mes.

---

## Canal de soporte (ADR-010)

| Canal | Uso |
|---|---|
| WhatsApp Business a Zelmar | Urgencias operativas — algo no funciona en el momento |
| administracion@biteradigital.com | Solicitudes no urgentes, cambios de alcance |

Sin SLA formal de tiempo de respuesta en esta etapa.
