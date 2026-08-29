# SMG Distribuidora — Sistema Digital

> **Implementación de SIGLO para SMG Distribuidora**
> Desarrollado por [Bitera Digital](https://biteradigital.com)

---

## Para Antigravity Agent

Este repositorio contiene **exclusivamente** los componentes específicos de SMG Distribuidora como cliente de SIGLO:

- Sitio público de SMG (`smg.biteradigital.com`)
- PWA interna para empleados de SMG (frontend que consume la API de SIGLO)
- Integraciones específicas de SMG (WhatsApp Business, SII Chile)
- Configuración del deployment de SIGLO para SMG

**El backend (API, base de datos, lógica de negocio) vive en el repo SIGLO:**
`github.com/admin-biteradigital-com/siglo`

---

## Arquitectura de dos repos

```
┌─────────────────────────────────────┐
│  SIGLO (github.com/.../siglo)       │
│  Backend — API REST /api/v1/        │
│  Cloudflare Workers + D1 + KV + R2  │
│  Better Auth v1.5 (self-hosted)     │
└──────────────┬──────────────────────┘
               │ HTTP / API REST
               │
┌──────────────▼──────────────────────┐
│  SMG (este repo)                    │
│  Frontend — Cloudflare Pages        │
│  Sitio público + PWA empleados      │
│  smg.biteradigital.com              │
└─────────────────────────────────────┘
```

---

## Qué vive en este repo

| Componente | Descripción |
|---|---|
| Sitio público | Landing page de SMG para clientes potenciales |
| PWA interna | App para empleados: vendedores, choferes, depósito, admin |
| Integración WhatsApp | Config del Meta Business Agent de SMG |
| Integración SII | Módulo de facturación electrónica para Chile |
| Assets de SMG | Logo, imágenes, identidad visual |

---

## Stack de este repo

| Capa | Tecnología |
|---|---|
| Hosting | Cloudflare Pages |
| Framework | A definir (ver `docs/frontend/framework.md`) |
| Offline/PWA | Workbox + IndexedDB (Dexie.js) + Background Sync |
| API client | Fetch nativo con wrapper tipado |
| Estilos | A definir |

---

## Conexión con SIGLO

Este repo consume la API de SIGLO. La URL base de la API se configura por ambiente:

| Ambiente | URL API SIGLO |
|---|---|
| Desarrollo local | `http://localhost:8787` |
| Staging | `https://siglo-staging.smg.biteradigital.com` |
| Producción | `https://siglo.smg.biteradigital.com` |

La variable de entorno `SIGLO_API_URL` debe estar configurada en el deploy de Pages.

---

## Estructura de la documentación

```
docs/
├── implementacion/    → Cómo está configurado SIGLO para SMG
├── sitio-publico/     → Especificación del sitio público
│   └── paginas/       → Wireframe y spec por página
├── frontend/          → PWA, offline sync, componentes
└── integraciones/     → WhatsApp Business, SII Chile
```

---

## Contexto del cliente

| Campo | Valor |
|---|---|
| Cliente | SMG Distribuidora |
| Responsable | Sebastián Marín Giacomino |
| Ubicación | Chamiza, Región de Los Lagos, Chile |
| Operación | Autoventa de golosinas importadas — exclusivamente Chile |
| URL producción | smg.biteradigital.com |
| Catálogo | ~80 SKUs activos, 15 marcas, dinámico |
| Dispositivo objetivo | Android (mobile-first) |

---

## Orden de lectura para Antigravity

1. `docs/implementacion/siglo-config.md` — cómo está configurado SIGLO para SMG
2. `docs/sitio-publico/estructura.md` — estructura del sitio público
3. `docs/frontend/pwa.md` — especificación de la PWA
4. `docs/frontend/offline-sync.md` — estrategia offline para empleados en ruta
5. `docs/integraciones/whatsapp.md` — Meta Business Agent de SMG
6. `docs/integraciones/sii-chile.md` — facturación electrónica SII Chile
