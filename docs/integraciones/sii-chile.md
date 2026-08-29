# Integración: SII Chile — Facturación Electrónica (DTE)

La integración con el Servicio de Impuestos Internos de Chile es la funcionalidad más regulada de SIGLO. Se implementa en **Fase III** — después de que los módulos de ventas y cobros estén operativos.

---

## Contexto regulatorio

En Chile, los documentos tributarios electrónicos (DTE) son obligatorios para empresas contribuyentes. SMG debe emitir:

| Documento | Cuándo | Código SII |
|---|---|---|
| Boleta electrónica | Venta a consumidor final | 39 |
| Factura electrónica | Venta a empresa con RUT | 33 |
| Nota de débito | Ajuste de factura hacia arriba | 56 |
| Nota de crédito | Devolución o ajuste hacia abajo | 61 |

**IVA:** 19% vigente al momento del diseño. Se almacena como configurable en `CONFIGURACION`.

---

## Flujo de emisión de DTE

```
Venta registrada en SIGLO (ORDENES_VENTA)
         │
         ▼
Admin confirma emisión de DTE desde panel SIGLO
         │
         ▼
SIGLO genera el XML del DTE:
  - Tipo de documento (33/39/56/61)
  - RUT emisor (SMG)
  - RUT receptor (cliente o consumidor final)
  - Folio (obtenido del CAF — ver abajo)
  - Detalle de productos con precios netos
  - IVA calculado (19%)
  - Totales
         │
         ▼
SIGLO firma digitalmente el XML con certificado digital de SMG
(certificado X.509 almacenado en Cloudflare Secrets)
         │
         ▼
SIGLO envía el DTE al SII via API REST:
POST https://palena.sii.cl/DTEWS/CrSolicitudDTEMasivoDTE.jws
         │
         ├─ SII acepta → actualiza FACTURAS: estado_sii='Aceptado', folio_sii=[folio]
         │
         └─ SII rechaza → registrar error, notificar admin
         │
         ▼
SIGLO envía DTE al cliente (PDF + XML) via email (Resend)
```

---

## CAF — Código de Autorización de Folios

El SII asigna rangos de folios autorizados para cada tipo de DTE. SIGLO debe gestionar estos rangos:

```sql
-- Tabla adicional para gestionar CAFs
CREATE TABLE CAF_FOLIOS (
    id INTEGER PRIMARY KEY,
    tipo_dte TEXT NOT NULL,          -- '33', '39', etc.
    folio_desde INTEGER NOT NULL,
    folio_hasta INTEGER NOT NULL,
    folio_actual INTEGER NOT NULL,   -- próximo folio a usar
    caf_xml TEXT NOT NULL,           -- XML del CAF firmado por SII
    fecha_vencimiento TEXT NOT NULL, -- CAFs tienen vencimiento
    activo INTEGER NOT NULL DEFAULT 1
);
```

El admin solicita CAFs al SII cuando el rango está por agotarse (alerta automática cuando queden < 50 folios).

---

## Certificado digital

SMG debe obtener un **certificado digital de firma** de una entidad certificadora autorizada por el SII (ej: E-CERT Chile, CertiSur). Costo aproximado: $50–$100 USD/año.

El certificado se almacena como secret en Cloudflare:
```bash
wrangler secret put SII_CERTIFICADO_PFX     # archivo .pfx en base64
wrangler secret put SII_CERTIFICADO_PASSWORD # contraseña del certificado
wrangler secret put SII_RUT_EMISOR           # RUT de SMG
```

---

## Ambientes SII

| Ambiente | URL | Uso |
|---|---|---|
| Certificación | `maullin.sii.cl` | Pruebas — SMG debe obtener folios de prueba |
| Producción | `palena.sii.cl` | Documentos reales |

El ciclo de certificación SII requiere enviar un set de documentos de prueba y obtener aprobación antes de operar en producción. Estimado: 2–4 semanas.

---

## Tabla FACTURAS en SIGLO (campos SII)

Ya incluida en `docs/datos/schema.sql`:

```sql
-- Campos relevantes en FACTURAS:
estado_sii   -- 'pendiente' | 'enviada' | 'aceptada' | 'rechazada' | 'anulada'
folio_sii    -- folio asignado por el CAF
fecha_envio_sii -- timestamp de envío al SII
```

---

## Librerías a evaluar

El XML del DTE tiene un formato específico definido por el SII. Opciones:

| Librería | Lenguaje | Notas |
|---|---|---|
| `sii-dte` | TypeScript/Node | Evaluar compatibilidad con Workers runtime |
| Generación manual de XML | TypeScript | Control total, sin dependencias externas |
| `cl-sii-data-models` | Python | No compatible con Workers |

**Decisión:** evaluar compatibilidad con Workers antes de Fase III. Si ninguna librería compatible existe, implementar generación de XML manualmente — el formato es estático y documentado.

---

## Prerrequisitos antes de implementar (checklist Fase III)

- [ ] SMG es contribuyente del SII con RUT activo
- [ ] Certificado digital de firma adquirido
- [ ] Folios CAF solicitados y obtenidos (tipo 33 y 39 mínimo)
- [ ] Cuenta en ambiente de certificación SII activada
- [ ] Set de pruebas de certificación enviado y aprobado por SII
- [ ] Módulos de ventas y cobros en producción (Fase II completa)
- [ ] `SII_*` secrets configurados en Cloudflare

---

## Recursos oficiales

- SII API DTE: https://www.sii.cl/factura_electronica/
- Formato XML DTE: Resolución Ex. SII N°45/2003 y modificaciones
- CAF: https://www.sii.cl/servicios_online/1039-.html
- Certificación: https://www.sii.cl/factura_electronica/ciclo_certificacion.htm
