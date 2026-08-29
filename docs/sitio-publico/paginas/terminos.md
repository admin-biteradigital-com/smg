# Página: Términos y Condiciones de Compra (`/terminos`)

Documento legal obligatorio antes de activar cualquier pasarela de pago real (ver ADR-009 en el repo `siglo`). Aplica exclusivamente a las compras realizadas en el sitio público (`canal='sitio_web'`) — no reemplaza ningún acuerdo comercial existente con clientes mayoristas que operan por ruta/WhatsApp.

**Nota importante:** este documento es un borrador estructural, no un texto legal final. Chile regula la venta a distancia bajo la Ley 19.496 de Protección al Consumidor, con requisitos específicos (entre otros, derecho a retracto en ciertas condiciones). Los puntos marcados `PENDIENTE — revisión legal` deben confirmarse con un abogado antes de publicar, especialmente en lo referido a plazos de retracto y garantías legales exactas.

---

## Estructura de la página

```
[Navbar]

TÉRMINOS Y CONDICIONES DE COMPRA
Última actualización: [fecha]

§1  Quién vende
§2  Aceptación de estos términos
§3  Productos y precios
§4  Proceso de compra y pago
§5  Entrega
§6  Cambios y devoluciones
§7  Garantías legales
§8  Qué pasa si el pago se aprueba y no hay stock
§9  Protección de datos
§10 Contacto y reclamos

[Footer]
```

---

## Contenido mínimo por sección

### §1 Quién vende

```
Esta tienda es operada por SMG Distribuidora
RUT: [RUT SMG] — PENDIENTE
Dirección: Chamiza, Región de Los Lagos, Chile
Contacto: [email SMG] — PENDIENTE
```

### §2 Aceptación de estos términos

```
Al confirmar una compra en este sitio, aceptás estos términos y condiciones
en su totalidad. Si no estás de acuerdo con alguna parte, no completes la compra
y contactanos por WhatsApp para coordinar de otra forma.
```

### §3 Productos y precios

```
- Los precios publicados están en pesos chilenos (CLP) e incluyen IVA.
- Los precios pueden cambiar sin previo aviso. El precio válido es el vigente
  al momento de confirmar la compra, no el que viste en una visita anterior.
- Las imágenes de los productos son referenciales.
```

### §4 Proceso de compra y pago

```
- El pago se procesa a través de [pasarela elegida — PENDIENTE, ver
  docs/integraciones/pagos.md]. SMG no recibe ni almacena tu número de
  tarjeta en ningún momento — el pago ocurre directamente en la plataforma
  de la pasarela.
- Tu pedido queda confirmado únicamente cuando el pago es aprobado.
- Si el pago es rechazado, el pedido no se procesa y podés intentar
  nuevamente o elegir otro medio de pago.
```

### §5 Entrega

```
- Zona de cobertura: [ver /nosotros — sección Cobertura]
- Plazo de entrega estimado: PENDIENTE — definir con Sebastián
- El costo de envío (si aplica): PENDIENTE — definir con Sebastián
- Podés coordinar retiro en depósito (Chamiza) como alternativa a la entrega.
```

### §6 Cambios y devoluciones

```
PENDIENTE — revisión legal.

Punto de partida sugerido: aceptamos devoluciones de productos en su
empaque original, sin abrir, dentro de un plazo razonable desde la entrega,
salvo productos perecederos o ya abiertos. Confirmar con Sebastián el plazo
exacto y si aplica el derecho a retracto de la Ley 19.496 para este tipo
de producto (golosinas — verificar si hay excepciones aplicables a
alimentos/perecederos antes de publicar un plazo específico).
```

### §7 Garantías legales

```
PENDIENTE — revisión legal.

Los productos vendidos están sujetos a las garantías legales vigentes en
Chile bajo la Ley 19.496. Si recibís un producto en mal estado o vencido,
contactanos de inmediato por WhatsApp con fotos del producto.
```

### §8 Qué pasa si el pago se aprueba y no hay stock

```
En el caso excepcional de que se apruebe un pago para un producto que se
agotó entre que lo viste y confirmaste la compra, te contactaremos dentro
de las 24 horas para coordinar un reemplazo equivalente o el reembolso
completo del monto pagado.
```

### §9 Protección de datos

```
Ver nuestra Política de Privacidad completa en /privacidad.
```

### §10 Contacto y reclamos

```
Para cualquier consulta o reclamo sobre tu compra:
WhatsApp: [número SMG]
Email: [email SMG]
```

---

## Implementación

- Página estática — sin datos dinámicos desde la API
- El checkbox de aceptación de estos términos debe estar presente en `/checkout` antes de confirmar cualquier compra (ver `docs/integraciones/pagos.md`) — no alcanza con que el documento exista, tiene que haber un consentimiento explícito registrado en el momento de la compra
- Los campos `PENDIENTE — revisión legal` no se publican en producción sin que Sebastián confirme el contenido real (plazos, RUT, condiciones específicas)
- Fecha de última actualización: actualizar manualmente cuando se modifique el contenido
