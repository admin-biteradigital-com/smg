# Frontend — Framework y Stack Técnico

## Decisión

**React 18 + TypeScript + Tailwind CSS + Vite** como stack base de la PWA de SMG.

---

## Por qué este stack

| Tecnología | Alternativas evaluadas | Razón de la elección |
|---|---|---|
| **React 18** | Vue 3, Svelte, Solid | Ecosistema más amplio, compatible con Workbox, familiar para Antigravity |
| **TypeScript** | JavaScript puro | Type safety obligatorio — los errores de tipo en mobile se detectan antes |
| **Tailwind CSS** | CSS modules, Emotion, Styled-components | Utility-first = mobile-first natural, sin CSS muerto en producción |
| **Vite** | Create React App, Webpack, Parcel | Build más rápido, HMR, compatible con Workbox plugin |
| **Workbox** | SW manual, service-worker-webpack | Abstracción madura del Service Worker, estrategias de cache declarativas |
| **idb** | localforage, dexie | Liviana, tipada, wrapper idiomático de IndexedDB |

---

## Stack completo

```
react@18                    UI framework
react-dom@18                DOM rendering
react-router-dom@6          Routing (SPA)
typescript@5                Type safety
tailwindcss@3               Estilos utility-first
vite@5                      Bundler + dev server
@vitejs/plugin-react        Plugin React para Vite
vite-plugin-pwa             PWA + Workbox integrado con Vite
workbox-window              Client-side para registrar SW y gestionar updates
idb@8                       IndexedDB tipado para offline storage
```

---

## Dependencias opcionales (evaluar antes de instalar)

```
react-hook-form@7           Formularios (alternativa: nativo con Zod)
@tanstack/react-query@5     Cache de datos remotos + sync state
zod@3                       Validación de schemas (compartida con el Worker)
lucide-react                Íconos SVG (tree-shakeable)
```

**Regla:** no instalar ninguna dependencia sin evaluar tamaño de bundle (`npm run build -- --analyze`).

---

## Estructura de directorios

```
smg/
├── .github/
│   ├── workflows/
│   │   └── deploy.yml              ← CI/CD → Cloudflare Pages
│   └── PULL_REQUEST_TEMPLATE.md
├── .gitignore
├── .env.example                    ← template (no commitear .env)
├── package.json
├── tsconfig.json
├── vite.config.ts                  ← incluye vite-plugin-pwa
├── tailwind.config.ts
│
├── public/
│   ├── manifest.json               ← Web App Manifest
│   └── icons/
│       ├── 192.png
│       └── 512.png
│
└── src/
    ├── main.tsx                    ← entry point + SW registration
    ├── App.tsx                     ← router + layout raíz
    │
    ├── api/                        ← cliente de la SIGLO API
    │   ├── client.ts               ← fetch wrapper con auth + error handling
    │   ├── catalog.ts              ← GET /api/v1/catalog*
    │   ├── leads.ts                ← POST /api/v1/leads
    │   ├── auth.ts                 ← /api/v1/auth/*
    │   ├── clients.ts              ← /api/v1/clients/*
    │   ├── orders.ts               ← /api/v1/orders/*
    │   ├── sales.ts                ← /api/v1/sales/*
    │   └── dashboard.ts            ← /api/v1/dashboard
    │
    ├── pages/
    │   ├── public/
    │   │   ├── Home.tsx
    │   │   ├── Catalogo.tsx
    │   │   ├── Contacto.tsx
    │   │   ├── Nosotros.tsx
    │   │   └── Privacidad.tsx
    │   ├── auth/
    │   │   ├── Login.tsx
    │   │   └── VerifyMagicLink.tsx
    │   └── app/                    ← rutas protegidas (SIGLO interno)
    │       ├── Dashboard.tsx
    │       ├── Jornada.tsx         ← vendedor en ruta
    │       ├── Carga.tsx           ← chofer
    │       ├── Stock.tsx           ← depósito
    │       ├── Clientes.tsx
    │       ├── Catalogo.tsx        ← catálogo admin
    │       └── Leads.tsx           ← panel admin
    │
    ├── components/
    │   ├── ui/                     ← componentes reutilizables
    │   ├── layout/                 ← Navbar, Footer, AppShell
    │   └── offline/                ← SyncIndicator, OfflineBanner
    │
    ├── hooks/
    │   ├── useAuth.ts              ← estado de sesión global
    │   ├── useOfflineSync.ts       ← gestión de cola offline
    │   └── useInstallPrompt.ts     ← PWA install prompt (A2HS)
    │
    ├── store/
    │   └── offlineQueue.ts         ← IndexedDB via idb — operaciones offline
    │
    ├── router/
    │   ├── index.tsx               ← definición de rutas
    │   └── ProtectedRoute.tsx      ← wrapper para rutas autenticadas
    │
    └── types/
        └── index.ts                ← tipos compartidos (espejo de SIGLO API)
```

---

## Configuración mínima de Vite + PWA

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/siglo\.smg\.biteradigital\.com\/api\/v1\/catalog/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'catalog-cache', expiration: { maxAgeSeconds: 300 } },
          },
          {
            urlPattern: /^https:\/\/siglo\.smg\.biteradigital\.com\/api\/v1\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 5 },
          },
        ],
      },
      manifest: {
        name: 'SMG Distribuidora',
        short_name: 'SMG',
        theme_color: '#1A3C5E',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
```

---

## Variables de entorno

```bash
# .env.example — copiar a .env.local (no commitear)
VITE_SIGLO_API_URL=https://siglo.smg.biteradigital.com
VITE_VAPID_PUBLIC_KEY=
VITE_ENV=production
```

---

## Scripts de desarrollo

```json
{
  "scripts": {
    "dev":       "vite",
    "build":     "tsc && vite build",
    "preview":   "vite preview",
    "typecheck": "tsc --noEmit",
    "lint":      "eslint src --ext .ts,.tsx",
    "test":      "vitest run",
    "test:watch":"vitest"
  }
}
```
