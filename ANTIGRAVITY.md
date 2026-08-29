# ANTIGRAVITY — Guía de Inicio para el Agente de Implementación

Este documento es el punto de entrada único para Antigravity Agent en el repo SMG. Leer antes de generar cualquier código.

---

## Qué es este repositorio

**SMG** contiene el frontend del sistema digital de SMG Distribuidora: el sitio público de la empresa y la PWA interna para sus empleados. Es el primer cliente de implementación del ERP **SIGLO** (repo separado).

**Este repo NO contiene lógica de negocio.** Toda la lógica vive en la API de SIGLO. Este repo consume esa API.

```
github.com/admin-biteradigital-com/siglo   ← Backend (API REST + D1 + Workers)
          ↕ HTTP /api/v1/*
github.com/admin-biteradigital-com/smg     ← Este repo (frontend + sitio público)
```

---

## Las tres restricciones absolutas

| # | Restricción | Consecuencia si se viola |
|---|---|---|
| 1 | **Presupuesto cero** — hosting en Cloudflare Pages free tier | Un servicio de pago invalida la arquitectura |
| 2 | **Mobile-first** — Android es el dispositivo objetivo primario | Una feature que no funciona en móvil no está terminada |
| 3 | **Offline-first** — operaciones de campo funcionan sin conexión | Un vendedor sin internet debe poder registrar ventas |

---

## Orden de lectura obligatorio

### Bloque 1 — Contexto del cliente y la implementación

```
1. README.md                                   ← arquitectura de dos repos, stack, contexto
2. docs/implementacion/siglo-config.md         ← cómo está configurada la instancia SIGLO para SMG
3. docs/implementacion/setup-inicial.md        ← cómo levantar el ambiente desde cero
```

### Bloque 2 — Frontend: decisiones técnicas

```
4. docs/frontend/framework.md                  ← React+TS+Tailwind+Vite+Workbox+idb — por qué
5. docs/frontend/pwa.md                        ← configuración PWA, manifest, instalación por OS
6. docs/frontend/offline-sync.md               ← IndexedDB, Background Sync, cola offline, conflictos
```

### Bloque 3 — Sitio público

```
7. docs/sitio-publico/estructura.md            ← páginas, routing, integración con SIGLO API
8. docs/sitio-publico/paginas/home.md          ← wireframe Home
9. docs/sitio-publico/paginas/catalogo.md      ← catálogo con precio público + carrito
10. docs/sitio-publico/paginas/contacto.md     ← formulario de leads
11. docs/sitio-publico/paginas/nosotros.md     ← historia y cobertura
12. docs/sitio-publico/paginas/login.md        ← acceso al sistema SIGLO
13. docs/sitio-publico/paginas/privacidad.md   ← política de privacidad (legal — obligatoria)
14. docs/sitio-publico/paginas/terminos.md     ← términos de compra (legal — obligatoria si e-commerce activo)
```

### Bloque 4 — App interna (PWA protegida)

```
15. docs/frontend/app-interna.md               ← pantallas por rol: admin, vendedor, chofer, depósito, cliente
```

### Bloque 5 — Integraciones

```
16. docs/integraciones/meta-business-agent.md  ← WhatsApp Business + agente IA (Fase III)
17. docs/integraciones/sii-chile.md            ← facturación electrónica SII Chile (Fase III)
18. docs/integraciones/pagos.md                ← pasarela de pago e-commerce — PENDIENTE de elegir proveedor, idempotencia/PCI (ADR-009 repo siglo)
```

### Bloque 6 — Implementación

```
19. docs/implementacion/seed-smg.sql           ← datos iniciales específicos de SMG
```

---

## `docs/manuales/` — no forma parte de la especificación técnica

Este directorio es material de capacitación para humanos (Sebastián y su equipo), no especificación para Antigravity. **No leer como spec de implementación** — no hay nada ahí que traducir a código. Si al implementar una pantalla el comportamiento descrito en un manual (`docs/manuales/vendedor.md`, etc.) no coincide con la spec técnica (`docs/frontend/app-interna.md`), la spec técnica manda — el manual se actualiza después para reflejar lo real, no al revés.

---

## Archivos de configuración

```
package.json.example   → copiar a package.json, instalar dependencias
.gitignore             ← ya configurado — NO commitear .env ni .env.local
```

Variable de entorno mínima para el build:
```
VITE_SIGLO_API_URL=https://siglo.smg.biteradigital.com
VITE_VAPID_PUBLIC_KEY=[public key VAPID para push notifications]
```

---

## Estructura de directorios src/

```
src/
├── main.tsx                    ← entry point + registro del Service Worker
├── App.tsx                     ← router + layout raíz
│
├── api/                        ← cliente tipado de la API de SIGLO
│   ├── client.ts               ← fetch wrapper: auth cookie + error handling + offline queue
│   ├── catalog.ts              ← GET /api/v1/catalog* (incluye precioPublico)
│   ├── leads.ts                ← POST /api/v1/leads
│   ├── auth.ts                 ← /api/v1/auth/* (magic link, Google OAuth, logout)
│   ├── clients.ts              ← /api/v1/clients/*
│   ├── orders.ts               ← /api/v1/orders/* + /api/v1/sales/*
│   ├── payments.ts             ← /api/v1/payments/* — ver docs/integraciones/pagos.md
│   ├── stock.ts                ← /api/v1/stock/* + /api/v1/receipts
│   └── dashboard.ts            ← /api/v1/dashboard
│
├── pages/
│   ├── public/                 ← sin autenticación
│   │   ├── Home.tsx            ← / 
│   │   ├── Catalogo.tsx        ← /catalogo (con precio + agregar al carrito)
│   │   ├── Carrito.tsx         ← /carrito — spec pendiente (docs/integraciones/pagos.md)
│   │   ├── Checkout.tsx        ← /checkout — spec pendiente de elegir pasarela
│   │   ├── Contacto.tsx        ← /contacto
│   │   ├── Nosotros.tsx        ← /nosotros
│   │   └── Privacidad.tsx      ← /privacidad
│   ├── auth/
│   │   ├── Login.tsx           ← /login (magic link + Google OAuth)
│   │   └── VerifyMagicLink.tsx ← /auth/verify?token=...
│   └── app/                    ← rutas protegidas — requieren sesión válida
│       ├── Dashboard.tsx        ← /app/dashboard (admin)
│       ├── Jornada.tsx          ← /app/jornada (vendedor en ruta)
│       ├── Carga.tsx            ← /app/carga (chofer)
│       ├── Stock.tsx            ← /app/stock (depósito)
│       ├── Clientes.tsx         ← /app/clientes (admin)
│       ├── Catalogo.tsx         ← /app/catalogo (admin — CRUD + campos e-commerce)
│       ├── Leads.tsx            ← /app/leads (admin)
│       ├── PedidosWeb.tsx       ← /app/pedidos-web (admin — pedidos con canal=sitio_web)
│       └── MisPedidos.tsx       ← /app/mis-pedidos (rol cliente)
│
├── components/
│   ├── ui/                     ← botones, inputs, cards, modales reutilizables
│   ├── layout/                 ← Navbar, Footer, AppShell, MobileNav
│   ├── carrito/                ← CartIcon, CartDrawer — estado del carrito (React state)
│   └── offline/                ← SyncStatusIndicator, OfflineBanner, PendingOpsCount
│
├── hooks/
│   ├── useAuth.ts              ← estado global de sesión (userId, role, email)
│   ├── useOfflineSync.ts       ← gestiona IndexedDB + cola de operaciones pendientes
│   ├── useInstallPrompt.ts     ← PWA install prompt (A2HS) — detecta si está instalada
│   └── useNetworkStatus.ts     ← online/offline con event listeners
│
├── store/
│   └── offlineQueue.ts         ← IndexedDB via idb: CRUD de la cola offline
│
├── router/
│   ├── index.tsx               ← definición de rutas con React Router v6
│   └── ProtectedRoute.tsx      ← redirect a /login si no hay sesión
│
└── types/
    └── index.ts                ← tipos que espeja la API de SIGLO (sin lógica)
```

---

## Reglas de código no negociables

```
PWA
  □ Todo el sitio funciona con JS deshabilitado para el contenido estático
  □ Manifest.json presente y válido (Lighthouse PWA: ✅)
  □ Service Worker registrado — Workbox via vite-plugin-pwa
  □ App shell en cache desde el primer deploy

MOBILE-FIRST
  □ Diseñar y probar primero en 375px, después en 1280px
  □ Touch targets ≥ 44×44px (WCAG)
  □ Sin hover-only interactions
  □ Testar en Chrome Android + Safari iOS (desde home screen)

OFFLINE
  □ Las operaciones de escritura en campo van a IndexedDB antes del fetch
  □ El cliente es caché, no fuente de verdad — los datos vuelven del servidor
  □ SyncStatusIndicator visible en toda la app interna

PERFORMANCE
  □ PageSpeed mobile ≥ 90 antes de declarar cualquier página como terminada
  □ Imágenes: WebP + lazy loading + dimensiones explícitas
  □ Sin librerías >50kb sin justificación

SEGURIDAD
  □ Las cookies de sesión las gestiona SIGLO — el frontend no las toca
  □ VITE_* variables: solo valores públicos — nunca secrets
  □ Sin datos de usuarios en localStorage o sessionStorage
```

---

## Endpoints de SIGLO API que consume este frontend

Ver especificación completa en el repo `siglo/docs/api/endpoints/`:

| Endpoint | Autenticación | Consumido en |
|---|---|---|
| `GET /api/v1/health` | No | Healthcheck |
| `GET /api/v1/config/public` | No | Navbar, Footer, Home |
| `GET /api/v1/catalog` | No | Página /catalogo — incluye `precioPublico` |
| `GET /api/v1/catalog/brands` | No | Chips de filtro en /catalogo |
| `POST /api/v1/leads` | No | Formulario Home y /contacto |
| `POST /api/v1/auth/magic-link` | No | Página /login |
| `GET /api/v1/auth/verify` | No | Página /auth/verify |
| `GET /api/v1/auth/google` | No | Página /login |
| `POST /api/v1/auth/logout` | Sí | AppShell |
| `GET /api/v1/auth/me` | Sí | ProtectedRoute |
| `POST /api/v1/orders` | Sí (cliente) | Checkout.tsx |
| `POST /api/v1/payments/checkout` | Sí (cliente) | Checkout.tsx — ver docs/integraciones/pagos.md |
| `GET /api/v1/payments/:id/status` | Sí (cliente) | /checkout/exito |
| `GET /api/v1/orders/own` | Sí (cliente) | MisPedidos.tsx |
| `GET /api/v1/dashboard` | Sí (admin) | Dashboard.tsx |
| `GET /api/v1/clients` | Sí (admin) | Clientes.tsx |
| `GET /api/v1/stock` | Sí (admin, deposito) | Stock.tsx |
| `GET /api/v1/orders?canal=sitio_web` | Sí (admin) | PedidosWeb.tsx |
| `GET /api/v1/admin/clients/:id/export` | Sí (admin) | Clientes.tsx — botón "Exportar datos" (ADR-010, derecho de acceso) |
| `POST /api/v1/sales` | Sí (vendedor) | Jornada.tsx |
| `POST /api/v1/sync` | Sí | offlineQueue.ts |

---

## Contexto

| Campo | Valor |
|---|---|
| Cliente | SMG Distribuidora |
| Responsable | Sebastián Marín Giacomino |
| Ubicación | Chamiza, Región de Los Lagos, Chile |
| URL sitio producción | `https://smg.biteradigital.com` |
| URL staging | `https://smg-staging.biteradigital.com` |
| API SIGLO producción | `https://siglo.smg.biteradigital.com` |
| Dispositivo objetivo | Android (primary), iOS (secondary) |
| **Métrica de éxito del Go-Live** | **100% de ventas reales por la app en las primeras 4 semanas (ADR-010, repo siglo)** |
| **Canal de soporte** | **WhatsApp Business a Zelmar (urgente) · administracion@biteradigital.com (no urgente) — sin SLA formal** |
