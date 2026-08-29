# Página: Política de Privacidad (`/privacidad`)

Página legal obligatoria antes del primer usuario real. El formulario de leads referencia esta URL.

---

## Estructura de la página

```
[Navbar]

POLÍTICA DE PRIVACIDAD
Última actualización: [fecha]

§1  Responsable del tratamiento
§2  Qué datos recopilamos
§3  Para qué usamos tus datos
§4  Con quién compartimos tus datos
§5  Por cuánto tiempo guardamos tus datos
§6  Tus derechos
§7  Cookies
§8  Contacto

[Footer]
```

---

## Contenido mínimo por sección

### §1 Responsable del tratamiento
```
SMG Distribuidora
RUT: [RUT SMG] — PENDIENTE
Dirección: Chamiza, Región de Los Lagos, Chile
Email de contacto: [email SMG] — PENDIENTE
```

### §2 Qué datos recopilamos
```
Cuando completás el formulario de contacto recopilamos:
- Nombre de tu negocio
- Tu nombre completo
- Teléfono de contacto
- Dirección de email
- Localidad
- Tipo de negocio
- Mensaje opcional

Cuando accedés al sistema interno (empleados):
- Email de acceso
- Registros de actividad (qué acciones realizaste y cuándo)
```

### §3 Para qué usamos tus datos
```
- Contactarte para ofrecerte nuestros servicios de distribución
- Gestionar la relación comercial si te convertís en cliente
- Garantizar la seguridad del sistema de gestión interno
```

### §4 Con quién compartimos tus datos
```
Tus datos pueden ser procesados por los siguientes proveedores tecnológicos,
que actúan como encargados del tratamiento bajo contratos de confidencialidad:

- Cloudflare Inc. (infraestructura de alojamiento — EE.UU.)
- Resend Inc. (envío de emails — EE.UU.)
- Bitera Digital (proveedor tecnológico del sistema — Uruguay)

No vendemos ni cedemos tus datos a terceros con fines comerciales.
```

### §5 Retención de datos
```
- Datos de formulario de contacto: hasta 2 años desde el último contacto
- Datos de clientes activos: durante la relación comercial + 6 años (obligación fiscal)
- Registros de acceso al sistema: 90 días
```

### §6 Tus derechos
```
Tenés derecho a:
- Acceder a tus datos personales
- Rectificarlos si son incorrectos
- Solicitar su eliminación
- Oponerte al tratamiento

Para ejercer estos derechos escribí a: [email SMG]
Responderemos en un plazo máximo de 30 días hábiles.
```

### §7 Cookies
```
Este sitio utiliza únicamente cookies técnicas necesarias para el funcionamiento
del sistema de acceso (sesión de usuario). No utilizamos cookies de seguimiento
ni publicidad de terceros.
```

### §8 Contacto
```
Para consultas sobre esta política: [email SMG]
```

---

## Implementación

- Página estática — sin datos dinámicos desde la API
- Contenido en español (Chile)
- Los campos PENDIENTE se completan con Sebastián antes del Go-Live
- Añadir `<link rel="canonical" href="https://smg.biteradigital.com/privacidad">` en el `<head>`
- Fecha de última actualización: actualizar manualmente cuando se modifique el contenido
