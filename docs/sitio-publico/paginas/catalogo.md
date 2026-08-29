# Página: Catálogo (`/catalogo`)

Muestra el catálogo dinámico de SMG **con precio público**. El cliente puede agregar productos al carrito y comprar online, o consultar por WhatsApp si lo prefiere.

---

## Datos

```
GET /api/v1/catalog               → productos activos con precioPublico
GET /api/v1/catalog?marca=[slug]  → filtro por marca
GET /api/v1/catalog/:id           → detalle de producto
GET /api/v1/catalog/brands        → marcas para los chips de filtro
```

**Solo se listan productos con `visible_publico = 1` y `precio_publico` no nulo** — el filtro lo aplica el Worker de SIGLO, no el frontend.

**Cache:** SSG con revalidación cada 5 minutos en Cloudflare Pages. Los productos cambian solo cuando el admin los edita en SIGLO.

---

## Layout

```
[Input: Buscar producto...]                    [🛒 Carrito (3)]

[Chips: Todas · Freegells · Trento · Blong · Go! Jelly · ...]  ← scroll mobile

┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│[Imagen] │  │[Imagen] │  │[Imagen] │  │[Imagen] │
│Nombre   │  │Nombre   │  │Nombre   │  │Nombre   │
│Marca    │  │Marca    │  │Marca    │  │Marca    │
│$4.500   │  │$3.200   │  │$5.100   │  │$2.800   │
│[+ Agregar] │[+ Agregar]  │[+ Agregar]  │[+ Agregar]
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

Grid: 4 col desktop · 2 tablet · 1 mobile.
Búsqueda: client-side sobre productos ya cargados — sin request adicional.
URL param actualizable: `?marca=freegells` (para compartir filtro).
**Ícono de carrito:** siempre visible en el header de la página, con contador de ítems. Persiste en estado del cliente (React state) mientras navega el catálogo — no requiere login hasta el checkout.

---

## Card de producto

```
┌──────────────────────┐
│  [Imagen WebP]       │  aspect-ratio 1:1, lazy loading
│  200×200px           │
├──────────────────────┤
│  Freegells Menta     │  nombre (bold)
│  Freegells           │  marca (color secundario)
│  $4.500              │  precioPublico — o precioOferta tachando el original si existe
│                      │
│  [+ Agregar]         │  agrega al carrito (estado local)
│  [Consultar →]       │  alternativa → WhatsApp con texto prellenado
└──────────────────────┘
```

**Si `precioOferta` no es null:** mostrar `precioPublico` tachado y `precioOferta` destacado.

Botón "Consultar" (secundario, más pequeño que "Agregar"): `wa.me/[número]?text=Hola%2C%20me%20interesa%3A%20[nombre]` — se mantiene como alternativa para el cliente que prefiere coordinar por WhatsApp en vez de comprar online.

**Stock:** no se muestra cantidad exacta en el catálogo público. Si un producto se queda sin stock, el admin lo desactiva (`visible_publico = 0`) desde el panel — no hay chequeo de stock en tiempo real en esta versión.

---

## Carrito (estado del cliente)

El carrito vive en memoria (React state) mientras el cliente navega — no se persiste en el servidor hasta que inicia checkout. Ver flujo completo en `docs/integraciones/pagos.md`.

```
[+ Agregar] → suma 1 unidad al carrito (o incrementa si ya está)
[🛒 Carrito (3)] → abre panel/página con el detalle
```

Especificación completa de `/carrito` y `/checkout`: pendiente de wireframe hasta confirmar la pasarela de pago (ver `docs/integraciones/pagos.md`) — los flujos de Webpay, Flow y MercadoPago difieren en detalles de UI de redirect.

---

## Estado vacío

```
"No encontramos productos para esta búsqueda.
 Escribinos por WhatsApp y te ayudamos →"  [→ WhatsApp]
```
