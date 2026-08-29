# Offline-First y Sincronización

Los empleados de SMG operan en rutas con conectividad variable. La app funciona completamente offline para operaciones críticas y sincroniza automáticamente al reconectar.

---

## Principio fundamental

> **El cliente es caché, no fuente de verdad.** Los datos en IndexedDB son una copia local de D1. Si el cliente se pierde (evicción iOS, reinstalación), los datos vuelven del servidor en el próximo login. Las escrituras offline se sincronizan al reconectar — nunca se pierden si el cliente envía la operación a la cola antes de perder conexión.

---

## Capas de la estrategia

```
┌─────────────────────────────────────────────┐
│  Service Worker (Workbox)                   │
│  Intercepta requests, decide estrategia     │
├─────────────────────────────────────────────┤
│  Cache API                                  │
│  App shell + datos de lectura frecuente     │
├─────────────────────────────────────────────┤
│  IndexedDB (via idb)                        │
│  Datos estructurados + cola de escrituras   │
├─────────────────────────────────────────────┤
│  Background Sync API (Android)              │
│  Sync automático al reconectar              │
│  (iOS: sync al abrir la app)                │
├─────────────────────────────────────────────┤
│  Cloudflare KV (servidor)                   │
│  Cola de operaciones pendientes             │
└─────────────────────────────────────────────┘
```

---

## Estrategias de cache por tipo de recurso

| Recurso | Estrategia | TTL cache |
|---|---|---|
| App shell (HTML, CSS, JS) | Cache First | Hasta nueva versión (SW update) |
| Imágenes de productos | Cache First | 24 horas |
| Datos de ruta asignada | Network First → Cache fallback | 1 hora |
| Clientes de la jornada | Network First → Cache fallback | 1 hora |
| Productos cargados en vehículo | Network First → Cache fallback | 30 min |
| Precios y catálogo | Stale While Revalidate | 4 horas |
| Dashboard KPIs | Network Only (no crítico offline) | — |

---

## Operaciones disponibles sin conexión

### Lectura (desde Cache API + IndexedDB)
- Ver ruta asignada y destinos del día
- Ver clientes a visitar con datos de contacto
- Ver productos cargados en el vehículo (por lote)
- Ver historial reciente de ventas y cobros
- Ver catálogo de productos con precios

### Escritura (encolada en IndexedDB → sync al reconectar)
- Registrar venta en ruta (productos, cantidades, precios, método de pago)
- Registrar cobro (monto, método)
- Agregar nota a un destino o cliente
- Actualizar estado de entrega de un destino
- Registrar recepción de mercadería en depósito

### Requiere conexión (no offline)
- Login (magic link / Google OAuth)
- Emitir factura electrónica (DTE al SII)
- Cambios administrativos (crear cliente, modificar catálogo)

---

## Flujo de escritura offline

```
Usuario registra una venta sin conexión
         │
         ▼
Service Worker detecta que la request falla (sin red)
         │
         ▼
Guardar en IndexedDB:
  {
    id: ulid(),
    type: 'CREATE_SALE',
    payload: { ... datos de la venta ... },
    timestamp: Date.now(),
    synced: false
  }
         │
         ▼
Mostrar al usuario: "Guardado localmente. Se sincronizará al reconectar."
Indicador visible de operaciones pendientes: "3 operaciones en espera"
         │
         ▼
Al reconectar → Background Sync API dispara (Android)
ó
Al abrir la app con conexión → sincronización en foreground (iOS + Android)
         │
         ▼
Para cada operación pendiente en IndexedDB:
  POST /api/v1/sync  { operations: [...] }
         │
         ▼
SIGLO API procesa en D1 (en batch)
         │
    ┌────┴────┐
    │ OK      │ Error de conflicto
    ▼         ▼
Marcar     Guardar en SYNC_CONFLICTS (D1)
synced:    Admin revisa en panel
true
         │
         ▼
Limpiar de IndexedDB
Actualizar UI: "Sincronizado ✓"
```

---

## Resolución de conflictos

**Estrategia MVP: last-write-wins por timestamp del dispositivo.**

Si el mismo recurso fue modificado online y offline:
- La versión más reciente (por timestamp del dispositivo) prevalece
- El conflicto se registra en `SYNC_CONFLICTS` en D1 para revisión del admin
- El admin puede revisar y resolver manualmente desde el panel

Esta estrategia es suficiente para SMG en MVP porque:
- Los vendedores trabajan en rutas asignadas distintas (sin conflicto habitual)
- El admin no modifica datos de rutas activas mientras el vendedor está en campo

**Deuda técnica documentada:** si SMG crece a múltiples vendedores trabajando el mismo cliente simultáneamente, evaluar CRDTs o estrategia de merge por campo.

---

## Indicadores visuales de estado offline

La app debe comunicar claramente el estado de conectividad al usuario:

```typescript
// Estados posibles
type SyncStatus =
  | 'online'          // Conectado, todo sincronizado
  | 'offline'         // Sin conexión, operando offline
  | 'syncing'         // Reconectó, sincronizando
  | 'pending'         // Offline con N operaciones en cola
  | 'conflict'        // Hay conflictos que requieren atención

// Indicador en la barra superior de la app
// Online:   ●  (verde)
// Offline:  ●  (gris) — "Sin conexión · 3 operaciones en espera"
// Syncing:  ◌  (animado) — "Sincronizando..."
// Conflict: ⚠  (amarillo) — "2 conflictos — revisar en panel"
```

---

## Variables de entorno para PWA

```bash
# En Cloudflare Pages environment variables:
VITE_SIGLO_API_URL=https://siglo.smg.biteradigital.com
VITE_VAPID_PUBLIC_KEY=<public key de VAPID>
```

---

## Testing offline

Antes de cada release verificar:
- [ ] Chrome DevTools → Application → Service Workers → "Offline" activado
- [ ] Registrar una venta en modo offline
- [ ] Volver a conectar → verificar que se sincronizó en D1
- [ ] Verificar que el indicador visual cambia correctamente en cada estado
- [ ] Verificar en Safari iOS 16.4+ (desde home screen instalada)
