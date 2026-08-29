# PWA — Progressive Web App

SIGLO para SMG se implementa como PWA. Es el canal de distribución primario — no una solución temporal.

---

## Por qué PWA (no app nativa)

| Criterio | PWA | React Native / Flutter |
|---|---|---|
| Costo | $0 — sin App Store ($99/año Apple) | Requiere cuentas de desarrollador |
| Distribución | URL directa, inmediata | Proceso de aprobación (1–7 días) |
| Codebase | Una sola — web + mobile + desktop | Dos o tres codebases |
| Deploy | Cloudflare Pages — segundos | Build nativo por plataforma |
| Offline | Service Worker + IndexedDB | Nativo pero más complejo |
| Capacidades MVP | Cubre el 100% del caso de uso | Agrega complejidad sin beneficio en MVP |

**Ruta de evolución:** si el mercado lo requiere (>30% iOS sin instalar tras onboarding, o cliente enterprise exige App Store), se envuelve la PWA con **Capacitor** sin reescribir el frontend. El mismo código, empaquetado como app nativa.

---

## Stack técnico

```
React + TypeScript    UI framework
Tailwind CSS          Estilos — utility-first, mobile-first por defecto
Vite                  Bundler — builds rápidos, HMR
Workbox               Service Worker — abstracción sobre SW API
idb                   IndexedDB wrapper — almacenamiento offline
Web Push + VAPID      Notificaciones push
```

Deploy: **Cloudflare Pages** — artefacto estático desde GitHub CI.

---

## Configuración obligatoria

### Web App Manifest (`manifest.json`)
```json
{
  "name": "SMG Distribuidora",
  "short_name": "SMG",
  "description": "Sistema de gestión SMG",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#1A3C5E",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## Instalación por plataforma

### Android (Chrome)
Chrome muestra banner automático al cumplir criterios PWA (HTTPS + manifest + SW).
1. Visita URL → banner de instalación
2. Un toque → ícono en home screen
3. App abre en modo standalone (sin barra del browser)

### iOS (Safari) — proceso manual
iOS no muestra banners automáticos. El onboarding debe incluir instrucciones visuales:
1. Abrir Safari → URL de SMG
2. Tap ícono Share (cuadrado con flecha)
3. "Agregar a pantalla de inicio"
4. Confirmar → ícono en home screen

**Detección:** `window.navigator.standalone === true` indica que está instalada en iOS.
Mostrar banner in-app con instrucciones cuando no está instalada.

---

## Limitaciones iOS documentadas

| Capacidad | Android | iOS (home screen) |
|---|---|---|
| Instalación | ✅ Banner automático | ⚠️ Manual (3–4 pasos) |
| Push notifications | ✅ | ✅ Solo desde home screen |
| Offline — Cache API | ✅ | ✅ ~50MB |
| Offline — IndexedDB | ✅ | ✅ ~500MB (evicción posible) |
| Background Sync | ✅ | ❌ |
| Modo standalone | ✅ | ✅ |

**Evicción iOS:** si el usuario no abre la app en varios días, iOS puede limpiar el storage local. Mitigación: la app sincroniza al reconectar — el cliente es caché, no fuente de verdad. Si el cliente se limpia, los datos vuelven del servidor en el próximo login.

**Background Sync iOS:** no soportado. La sincronización offline ocurre cuando el usuario abre la app — suficiente para el caso de uso de SMG (el vendedor abre la app al llegar al campo o al depósito).

---

## Criterios de aceptación mobile (Definition of Done)

Toda funcionalidad debe pasar antes de marcarse como completa:

- [ ] Funciona en Chrome Android (gama media — Motorola/Samsung A-series)
- [ ] Funciona en Safari iOS 16.4+ (desde home screen)
- [ ] Operable con una mano en smartphone 5.5"
- [ ] No más de 3 taps para la acción más frecuente
- [ ] Funciona con conectividad 3G (≥ 1 Mbps)
- [ ] Acción crítica (registro de asistencia, venta en ruta) funciona offline
- [ ] Touch targets ≥ 44×44px (WCAG)
- [ ] Lighthouse PWA: ✅ todas las categorías
- [ ] PageSpeed mobile: ≥ 90

---

## Notificaciones push

Proveedor: Cloudflare Workers con VAPID keys — sin Firebase, sin costo adicional.

Proceso de configuración (una vez):
1. Generar par de claves VAPID: `npx web-push generate-vapid-keys`
2. Almacenar `VAPID_PRIVATE_KEY` como secret en Cloudflare
3. Exponer `VAPID_PUBLIC_KEY` como variable de entorno en Pages
4. El Service Worker se suscribe al push en el cliente
5. El Worker envía notificaciones via Web Push API

Restricción iOS: el usuario debe haber instalado la PWA en home screen para recibir push.
