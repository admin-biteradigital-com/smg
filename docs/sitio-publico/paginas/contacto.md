# Página: Contacto (`/contacto`)

Formulario completo de registro de interés + datos de contacto de SMG.

---

## Layout desktop (2 col) / mobile (1 col — formulario primero)

```
COLUMNA 60%                          COLUMNA 40%
───────────────────────────────      ───────────────────────────
"Convertite en distribuidor"         "Otras formas de contacto"

[Formulario completo]                📍 Chamiza, Los Lagos, Chile
                                     📞 [teléfono SMG]
                                     ✉️  [email SMG]
                                     💬 WhatsApp [botón directo]

                                     Lun–Vie 9:00–18:00
                                     Sáb 9:00–13:00
```

---

## Formulario

Idéntico al de la sección Home §6. Ver `docs/sitio-publico/paginas/home.md`.

Destino: `POST /api/v1/leads` en SIGLO API.
Post-submit: confirmación inline, sin redirección.
