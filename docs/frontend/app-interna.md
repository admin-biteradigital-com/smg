# App Interna — Pantallas y Flujos

Especificación de las pantallas del sistema SIGLO para los empleados de SMG. Cada pantalla corresponde a un rol específico. El acceso a rutas `/app/*` requiere sesión válida.

---

## Redirección por rol (post-login)

| Rol | Redirige a | Acceso a |
|---|---|---|
| `admin` | `/app/dashboard` | Todo |
| `vendedor` | `/app/jornada` | Jornada, Clientes (lectura) |
| `chofer` | `/app/carga` | Carga asignada |
| `deposito` | `/app/stock` | Stock, Recepciones |
| `cliente` | `/app/mis-pedidos` | Sus propios pedidos e invoices |

---

## AppShell (todas las pantallas protegidas)

```
┌──────────────────────────────────┐
│ [≡] SMG          [Sync ●] [Avatar]│  ← Barra superior
├──────────────────────────────────┤
│                                  │
│     [Contenido de la pantalla]   │
│                                  │
│                                  │
├──────────────────────────────────┤
│ [Dashboard] [Jornada] [Stock] [+]│  ← Nav inferior (mobile)
└──────────────────────────────────┘
```

- **Sync indicator** (`●`): verde = online, gris = offline, girando = sincronizando
- **Nav inferior:** solo muestra las secciones a las que tiene acceso el rol activo
- **Avatar:** menú con "Cerrar sesión"

---

## `/app/dashboard` — Admin

Vista de KPIs operativos del día y la semana.

```
┌─────────────────────────────────────┐
│  Hoy — Martes 15 de junio            │
├────────────┬────────────┬────────────┤
│ Ventas hoy │  Cobros    │  En ruta  │
│ $450.000   │ pendientes │  1 vehíc. │
│            │ $350.000   │           │
├────────────┴────────────┴────────────┤
│  Stock crítico: 3 productos          │
│  [Freegells Menta] [Trento Coco] ... │
├──────────────────────────────────────┤
│  Leads pendientes de contacto: 2     │
│  [Ver leads →]                       │
├──────────────────────────────────────┤
│  Vencimientos próximos: 5 lotes      │
│  [Ver stock →]                       │
└──────────────────────────────────────┘
```

Fuente: `GET /api/v1/dashboard`
Actualización: al cargar la pantalla + pull-to-refresh.

---

## `/app/jornada` — Vendedor en ruta

Pantalla central del vendedor. Muestra la ruta asignada del día con los destinos a visitar.

```
┌─────────────────────────────────────┐
│  Mi jornada — 15 jun               │
│  Ruta Norte · 5 destinos           │
├─────────────────────────────────────┤
│  [✓] Kiosco La Esquina              │  ← completado
│      $18.000 · Cobrado              │
├─────────────────────────────────────┤
│  [→] Almacén Don Pedro              │  ← actual
│      Puerto Montt Centro            │
│      [Registrar venta]              │
├─────────────────────────────────────┤
│  [ ] Minimarket Sol y Mar           │  ← pendiente
│  [ ] Rotisería El Marino            │
│  [ ] Kiosco Copihue                 │
└─────────────────────────────────────┘
```

**Acción "Registrar venta"** abre modal:

```
VENTA — Almacén Don Pedro

Productos cargados disponibles:
[Freegells Menta 12un] [- 0 +]
[Trento Coco 20un]     [- 0 +]
[Mantecol 150g]        [- 0 +]

Subtotal: $0

Método de pago:
[Efectivo ▼]

Nota (opcional): [_______________]

[CANCELAR]  [REGISTRAR VENTA →]
```

Si está offline → guarda en IndexedDB → muestra "Guardado. Se sincronizará al reconectar."

Fuentes:
- `GET /api/v1/loads/assigned` — carga asignada al vendedor
- `POST /api/v1/sales` — registrar venta
- `POST /api/v1/payments` — registrar cobro en el mismo flujo

---

## `/app/carga` — Chofer

Muestra la orden de transporte asignada: vehículo, ruta y destinos en orden de visita.

```
┌─────────────────────────────────────┐
│  Orden de transporte #15            │
│  Ruta Norte · Ford F-150 (ABC-123)  │
├─────────────────────────────────────┤
│  Destinos (5):                      │
│  1. Kiosco La Esquina               │
│     Calle Los Aromos 123            │
│     [Ver productos] [Entregado ✓]   │
│  2. Almacén Don Pedro               │
│     Av. Central 456                 │
│     [Ver productos] [Marcar entrega]│
│  3–5. ...                           │
├─────────────────────────────────────┤
│  [FINALIZAR RUTA]                   │
└─────────────────────────────────────┘
```

Fuentes:
- `GET /api/v1/loads/assigned` — carga asignada al chofer
- `PATCH /api/v1/loads/:id/status` — marcar destino como entregado

---

## `/app/stock` — Depósito

Vista del inventario actual, ordenado por fecha de vencimiento (FEFO).

```
┌─────────────────────────────────────┐
│  Stock — Depósito              [+] │
│  [🔍 Buscar producto...]            │
├─────────────────────────────────────┤
│  ⚠ Freegells Menta · LOT-2025-003  │
│     Vence en 12 días · 48 UN        │
├─────────────────────────────────────┤
│  ✓ Trento Coco · LOT-2025-005       │
│     Vence en 45 días · 240 UN       │
├─────────────────────────────────────┤
│  ✓ Mantecol 150g · LOT-2025-002     │
│     Vence en 78 días · 120 UN       │
└─────────────────────────────────────┘
```

**`[+]` Registrar recepción** → formulario para registrar mercadería entrante con lote y vencimiento.

Fuentes:
- `GET /api/v1/stock` — inventario con alertas de vencimiento
- `POST /api/v1/receipts` — registrar recepción

---

## `/app/clientes` — Admin

Lista de clientes con buscador. Tap en cliente → detalle con sucursales, historial de ventas y cobros pendientes.

---

## `/app/catalogo` — Admin

CRUD del catálogo de productos. Gestión de nombre, descripción, imagen, unidades, precio sugerido (interno), estado activo/inactivo.

**Campos de e-commerce (nuevos):**
```
┌─────────────────────────────────────┐
│  Editar producto: Freegells Menta   │
├─────────────────────────────────────┤
│  Nombre: [Freegells Menta 12un]     │
│  Descripción interna: [_________]   │
│  ...                                │
│  ── Catálogo público ──             │
│  [☑] Visible en sitio público       │
│  Precio público: [$4.500]           │
│  Precio oferta:  [$______] opcional │
│  Descripción web: [______________]  │
│  Categoría web: [Caramelos ▼]       │
└─────────────────────────────────────┘
```

Si "Visible en sitio público" está desmarcado o `precio_publico` está vacío, el producto no aparece en `/catalogo` del sitio web (pero sigue disponible para venta en ruta).

---

## `/app/leads` — Admin

Lista de leads del formulario público con estado y acciones:
- Marcar como contactado
- Convertir a cliente (abre formulario de alta de cliente pre-completado)
- Rechazar con nota

---

## `/app/pedidos-web` — Admin

Pedidos entrantes del sitio público (`canal='sitio_web'`), separados de los pedidos por WhatsApp/teléfono para que el admin priorice los que ya tienen pago confirmado.

```
┌─────────────────────────────────────┐
│  Pedidos del sitio web              │
├─────────────────────────────────────┤
│  #58 · Kiosco La Esquina            │
│  $13.500 · Pagado ✓                 │
│  [Confirmar y pasar a preparación]  │
├─────────────────────────────────────┤
│  #57 · Almacén Don Pedro            │
│  $8.200 · Pago pendiente ⏳         │
│  (esperando confirmación de pasarela)│
└─────────────────────────────────────┘
```

Fuentes:
- `GET /api/v1/orders?canal=sitio_web`
- `GET /api/v1/payments/:id/status` — para verificar estado de pago antes de despachar

---

## `/app/mis-pedidos` — Cliente

Portal de autoservicio para clientes que compraron en el sitio público: ver sus pedidos, estado de pago, estado de entrega, facturas asociadas. Accesible con el mismo login de magic link que el resto del sistema, con rol `cliente`.

Fuentes:
- `GET /api/v1/orders/own`
- `GET /api/v1/payments/:id/status`
- `GET /api/v1/invoices/own`

---

## Comportamiento offline de la app interna

| Pantalla | Sin conexión |
|---|---|
| Dashboard | Muestra datos del último caché |
| Jornada | Funciona completo — ventas se encolan en IndexedDB |
| Carga | Funciona completo — entregas se encolan |
| Stock | Solo lectura desde caché |
| Leads / Clientes / Catálogo / Pedidos web | Bloqueadas — requieren conexión (admin en oficina) |
| Mis pedidos (cliente) | Solo lectura desde caché — comprar requiere conexión (pago online) |

Ver estrategia completa en `docs/frontend/offline-sync.md`.
