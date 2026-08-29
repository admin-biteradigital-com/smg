# Página: Home (`/`)

Entrada principal. Objetivo: propuesta de valor + camino directo a comprar online + captación de leads como canal secundario.

---

## Secciones (en orden de aparición)

### NAVBAR
```
[Logo SMG]   Inicio · Catálogo · Nosotros · Contacto   [🛒] [WhatsApp icon] [Ingresar →]
```
- Sticky en scroll. Mobile: hamburger. Carrito y WhatsApp icon siempre visibles.
- Número de WA → `GET /api/v1/config/public` de SIGLO API.
- "Ingresar al sistema" → `/login`, estilo outline.

---

### HERO
```
[Imagen WebP, preloaded — productos del catálogo o vehículo en ruta]

GOLOSINAS IMPORTADAS PARA TU NEGOCIO
Directo del distribuidor

Chamiza y zona de Los Lagos · Kioscos, almacenes y revendedores

[Ver catálogo y comprar]   [Escribinos por WhatsApp →]
```
- `<h1>` — máx 60 caracteres.
- CTA 1: link a `/catalogo` — camino principal de conversión (e-commerce).
- CTA 2: `wa.me/[número]` — nueva pestaña, para quien prefiere coordinar directo.

---

### MARCAS
```
"Distribuimos las mejores marcas importadas"
[Logo] [Logo] [Logo] ... (15 marcas) — scroll horizontal en mobile
```
- Grid: 5 col desktop / 3 tablet / scroll horizontal mobile.
- Logos SVG o WebP con fondo transparente.
- Click → `/catalogo?marca=[slug]`.
- Fuente: `GET /api/v1/catalog/brands` o estáticos en build inicial.

---

### CÓMO FUNCIONA

Este bloque describe el camino de alta como **cliente mayorista recurrente** (crédito, ruta asignada, ciclo de reabastecimiento) — distinto de la compra puntual online desde `/catalogo`, que no requiere este proceso.

3 pasos con íconos SVG inline:
```
1. REGISTRATE   → dejanos tus datos
2. COORDINAMOS  → primera compra juntos
3. EMPEZÁS      → entrega en tu negocio o retiro en Chamiza
```
3 columnas desktop · 1 columna mobile.

---

### COBERTURA
```
"¿Llegamos a tu zona?"
[Mapa estático WebP — zona Los Lagos]
Chamiza · Puerto Montt · [otras localidades]
"¿No estás en la lista? Consultanos igual →" [→ WhatsApp]
```
- Mapa: imagen PNG/WebP estática — sin Google Maps (costo cero).
- Localidades: estáticas o desde `GET /api/v1/config/public`.

---

### FORMULARIO DE REGISTRO
```
"¿Querés distribuir nuestros productos?"

[Nombre del negocio *]
[Nombre del responsable *]
[Teléfono * — prefijo +56 por defecto, editable]
[Email *]
[Localidad *]
[Tipo de negocio * — select: Kiosco / Almacén / Supermercado / Rotisería / Otro]
[Mensaje — opcional]
[☐ Acepto la política de privacidad *]  ← link a /privacidad

[ENVIAR SOLICITUD]
```

Post-submit:
- Confirmación inline: `"¡Gracias! Te contactaremos en las próximas 24 horas."`
- Sin redirección. Botón deshabilitado mientras procesa.
- Error de red → mensaje con opción de reintentar.

Destino: `POST /api/v1/leads` en SIGLO API.

---

### FOOTER
```
Col 1: [Logo] · Tagline · Chamiza, Los Lagos, Chile
Col 2: Inicio · Catálogo · Nosotros · Contacto · Privacidad
Col 3: [Instagram] [TikTok] [Facebook] [WhatsApp]

© [año dinámico] SMG Distribuidora · Desarrollado por Bitera Digital
```
Redes: `rel="noopener noreferrer"`, nueva pestaña.

---

## Datos dinámicos vs. estáticos

| Sección | Origen |
|---|---|
| Hero | Estático |
| Marcas | SIGLO API o estático en build |
| Cómo funciona | Estático |
| Cobertura | Estático |
| Formulario | `POST /api/v1/leads` (dinámico) |
| Número de WhatsApp | `GET /api/v1/config/public` |
