# Sitio Público SMG — Especificación Completa

El sitio público es el primer entregable del proyecto SMG. Vive en `smg.biteradigital.com` y es la cara visible de SMG en internet.

---

## Objetivos

1. Comunicar la propuesta de valor de SMG a kioscos, almacenes y revendedores en Chile
2. Capturar leads mediante formulario de registro de interés
3. Mostrar el catálogo dinámico de productos **con precio público** y permitir compra online
4. Dirigir a WhatsApp Business como canal alternativo de contacto
5. Ser el punto de acceso al login del sistema SIGLO para empleados y clientes registrados
6. Cumplir PageSpeed 100 · SSL Labs A+ · SecurityHeaders A+ desde el Go-Live

**Cambio respecto a la versión anterior:** el catálogo ya no es "solo consulta, contactar por WhatsApp" — el cliente ve precio y puede comprar directamente en el sitio. WhatsApp sigue disponible como canal alternativo para consultas o pedidos que el cliente prefiera coordinar de forma directa.

---

## Páginas

| Ruta | Página | Propósito |
|---|---|---|
| `/` | Home | Propuesta de valor + captación de leads |
| `/catalogo` | Catálogo | Productos con precio, agregar al carrito |
| `/carrito` | Carrito | Ver productos agregados — spec pendiente (ver `docs/integraciones/pagos.md`) |
| `/checkout` | Checkout | Datos de entrega + pago — spec pendiente de elegir pasarela |
| `/nosotros` | Nosotros | Historia, equipo, zona de cobertura |
| `/contacto` | Contacto | Formulario completo de registro de interés |
| `/privacidad` | Política de privacidad | Obligatorio legal — Ley 19.628 Chile |
| `/login` | Login | Acceso al sistema SIGLO — empleados y clientes registrados |

---

## Decisiones técnicas del frontend

- **Framework:** a definir — candidatos: Astro (máximo rendimiento, ideal para sitio mayoritariamente estático + catálogo dinámico) o Next.js. Ver `docs/frontend/framework.md`
- **Hosting:** Cloudflare Pages — deploy automático desde GitHub
- **CSS:** Tailwind CSS
- **Fuentes:** Google Fonts (preload, subset solo Latin) o fuente del sistema
- **Imágenes:** WebP, lazy loading, dimensiones explícitas
- **Sin JS innecesario:** el sitio público debe funcionar con JS mínimo — el catálogo puede ser SSG con revalidación periódica

---

## Navbar

Presente en todas las páginas. Sticky en scroll.

```
[Logo SMG]   Inicio · Catálogo · Nosotros · Contacto   [WhatsApp icon] [Ingresar al sistema]
```

- **Mobile (< 768px):** hamburger menu. WhatsApp icon siempre visible.
- **Botón "Ingresar al sistema":** link a `/login` — visible siempre, estilo outline.
- **WhatsApp icon:** link directo a `wa.me/[número SMG]` — abrir en nueva pestaña.
- El número de WhatsApp viene de la SIGLO API: `GET /api/v1/config/public`

---

## Footer

```
Col 1: [Logo SMG] · Tagline · Dirección Chamiza, Los Lagos
Col 2: Inicio · Catálogo · Nosotros · Contacto · Privacidad
Col 3: [Instagram] [TikTok] [Facebook] [WhatsApp]

Copyright © [año] SMG Distribuidora · Desarrollado por Bitera Digital
```

- El año se calcula dinámicamente.
- Links de redes sociales: abrir en nueva pestaña con `rel="noopener noreferrer"`.

---

## Integración con SIGLO API (sitio público)

El sitio público consume endpoints públicos de SIGLO (sin auth) para navegación, y protegidos (con sesión) para compra:

| Endpoint SIGLO | Auth | Uso en sitio |
|---|---|---|
| `GET /api/v1/catalog` | No | Página `/catalogo` — productos activos con `precioPublico` |
| `GET /api/v1/catalog/:id` | No | Detalle de producto en `/catalogo` |
| `GET /api/v1/catalog/brands` | No | Filtros por marca en `/catalogo` |
| `POST /api/v1/leads` | No | Formulario de contacto |
| `GET /api/v1/config/public` | No | Número WA, redes sociales, datos públicos |
| `POST /api/v1/orders` | Sí (rol `cliente`) | Crear pedido desde `/checkout` |
| `POST /api/v1/payments/checkout` | Sí (rol `cliente`) | Iniciar pago — ver `docs/integraciones/pagos.md` |
| `GET /api/v1/payments/:id/status` | Sí (rol `cliente`) | Página `/checkout/exito` |

La URL de la API de SIGLO se configura en la variable de entorno del build de Pages: `SIGLO_API_URL`.

---

## SEO y meta tags

Cada página debe incluir:

```html
<title>[Título de la página] | SMG Distribuidora</title>
<meta name="description" content="[Descripción específica de la página]">
<meta property="og:title" content="[Título]">
<meta property="og:description" content="[Descripción]">
<meta property="og:image" content="[URL imagen OG 1200x630]">
<meta property="og:url" content="[URL canónica]">
<meta name="robots" content="index, follow">
<link rel="canonical" href="[URL canónica]">
```

---

## Performance — requisitos

| Métrica | Target |
|---|---|
| PageSpeed mobile | ≥ 90 (target 100) |
| PageSpeed desktop | 100 |
| LCP (Largest Contentful Paint) | < 2.5s |
| CLS (Cumulative Layout Shift) | < 0.1 |
| FID / INP | < 100ms |
| Imágenes | WebP, lazy loading, dimensiones explícitas |
| Fuentes | Preload + `font-display: swap` |
| CSS | Purge unused, inlinear crítico |
| JS | Mínimo necesario — sin librerías pesadas en sitio público |

---

## Spec detallada por página

Ver:
- `docs/sitio-publico/paginas/home.md`
- `docs/sitio-publico/paginas/catalogo.md`
- `docs/sitio-publico/paginas/contacto.md`
- `docs/sitio-publico/paginas/nosotros.md`
- `docs/sitio-publico/paginas/login.md`
- `docs/sitio-publico/paginas/privacidad.md`
- `docs/integraciones/pagos.md` — carrito/checkout, pendiente de wireframe hasta elegir pasarela
