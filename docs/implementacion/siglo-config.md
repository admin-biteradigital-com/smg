# Configuración de SIGLO para SMG

Este documento especifica cómo está configurada la instancia de SIGLO que sirve a SMG Distribuidora.

---

## Modelo de deployment y tenancy

SIGLO corre como **una instancia compartida** (un Worker, una base D1) — no una instancia por cliente. Ver `docs/arquitectura/adr/ADR-008-tenancy-hibrido.md` en el repo `siglo` para el razonamiento completo.

SMG es el abonado `id=1` en la tabla `ABONADOS`. Hoy es el único. Si en el futuro aparece un segundo cliente de SIGLO, se sumaría como abonado `id=2` en la misma infraestructura — no como un deployment aparte.

| Recurso | Nombre en Cloudflare | Ambiente |
|---|---|---|
| Worker (producción) | `siglo-prod` | Producción |
| Worker (staging) | `siglo-staging` | Staging |
| D1 Database (producción) | `siglo-db-prod` | Producción |
| D1 Database (staging) | `siglo-db-staging` | Staging |
| KV Namespace (producción) | `siglo-kv-prod` | Producción |
| KV Namespace (staging) | `siglo-kv-staging` | Staging |
| R2 Bucket | `siglo-assets` | Producción + Staging |

---

## URLs

| Ambiente | Frontend (este repo) | API SIGLO |
|---|---|---|
| Producción | `https://smg.biteradigital.com` | `https://siglo.smg.biteradigital.com` |
| Staging | `https://smg-staging.biteradigital.com` | `https://siglo-staging.smg.biteradigital.com` |
| Desarrollo local | `http://localhost:3000` | `http://localhost:8787` |

---

## Roles habilitados para SMG

Todos los roles de SIGLO están habilitados y en uso activo:

| Rol | Usuarios SMG |
|---|---|
| `admin` | Sebastián Marín Giacomino |
| `vendedor` | Agentes de venta en ruta |
| `chofer` | Conductores de la flota |
| `deposito` | Personal de depósito |
| `cliente` | Clientes que compran en el sitio público (e-commerce) — vinculados a `CLIENTES` vía `USUARIOS.id_cliente` |
| `agente_ia` | Meta Business Agent de SMG |

---

## Configuración inicial de D1

Ejecutar en este orden (todo apunta a la base única `siglo-db-prod`, no a una base "de SMG" separada):

```bash
# 1. Crear la base de datos (una sola, compartida)
wrangler d1 create siglo-db-prod

# 2. Aplicar el schema (incluye tabla ABONADOS)
wrangler d1 execute siglo-db-prod \
  --file=../siglo/docs/datos/schema.sql

# 3. Cargar datos iniciales genéricos (incluye INSERT del abonado id=1)
wrangler d1 execute siglo-db-prod \
  --file=../siglo/docs/datos/seed.sql

# 4. Cargar datos específicos de SMG (rutas, config)
wrangler d1 execute siglo-db-prod \
  --file=docs/implementacion/seed-smg.sql

# 5. Crear usuario admin inicial
# (ver docs/implementacion/setup-inicial.md)
```

---

## Variables de entorno del Worker SIGLO

Configurar en el Dashboard de Cloudflare para el Worker `siglo-prod`:

```bash
# Secrets
wrangler secret put BETTER_AUTH_SECRET --name siglo-prod
wrangler secret put GOOGLE_CLIENT_ID --name siglo-prod
wrangler secret put GOOGLE_CLIENT_SECRET --name siglo-prod
wrangler secret put RESEND_API_KEY --name siglo-prod
# Secrets de pasarela de pago — ver docs/integraciones/pagos.md (pendiente de elegir proveedor)
```

```toml
# wrangler.toml — vars no-secretas
[vars]
ENVIRONMENT = "production"
ADMIN_EMAIL = "sebastian@smg.cl"
CORS_ORIGINS = "https://smg.biteradigital.com"
```

---

## Datos de configuración inicial de SMG

`docs/implementacion/seed-smg.sql` inserta estos valores en `CONFIGURACION`, scoped al abonado 1:

```sql
INSERT INTO CONFIGURACION (id_abonado, clave, valor, descripcion) VALUES
  (1, 'empresa_nombre', 'SMG Distribuidora', 'Razón social'),
  (1, 'empresa_rut', 'PENDIENTE', 'RUT empresa — completar con Sebastián'),
  (1, 'empresa_direccion', 'Chamiza, Región de Los Lagos, Chile', 'Dirección'),
  (1, 'empresa_telefono', 'PENDIENTE', 'Teléfono de contacto'),
  (1, 'empresa_email', 'PENDIENTE', 'Email de contacto'),
  (1, 'whatsapp_numero', 'PENDIENTE', 'Número WhatsApp Business de SMG'),
  (1, 'moneda', 'CLP', 'Moneda del sistema'),
  (1, 'zona_horaria', 'America/Santiago', 'Zona horaria Chile'),
  (1, 'iva_porcentaje', '19', 'IVA Chile vigente'),
  (1, 'pasarela_pago_activa', 'PENDIENTE', 'webpay | flow | mercadopago');
```

**Datos marcados como PENDIENTE:** deben completarse con Sebastián antes del Go-Live.

Ver el archivo real y completo en `docs/implementacion/seed-smg.sql`.

---

## Contactos del proyecto

| Rol | Nombre | Contacto |
|---|---|---|
| Cliente / Admin SIGLO | Sebastián Marín Giacomino | PENDIENTE |
| Desarrollador / Bitera Digital | Zelmar Velázquez | PENDIENTE |
