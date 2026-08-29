# Página: Login (`/login`)

Acceso al sistema SIGLO para empleados y admin. Sin navbar de marketing ni footer.

---

## Layout

Pantalla centrada verticalmente. Fondo neutro.

```
[Logo SMG]

"Acceso al sistema"

[Email]
[Continuar con Magic Link]

── o ──

[G  Continuar con Google]
```

---

## Flujo (Better Auth v1.5)

**Magic Link (método principal):**
1. Usuario ingresa email → `POST /api/v1/auth/magic-link`
2. SIGLO envía link de 15 min via Resend
3. Confirmación inline: `"Te enviamos un link a [email]. Revisá tu bandeja."`
4. Usuario hace clic → autenticado → redirige según rol:

| Rol | Redirige a |
|---|---|
| `admin` | `/app/dashboard` |
| `vendedor` | `/app/jornada` |
| `chofer` | `/app/carga` |
| `deposito` | `/app/stock` |
| `cliente` | `/app/mis-pedidos` |

**Google OAuth:**
- Botón "Continuar con Google" → flujo OAuth estándar → mismo redirect por rol.

---

## Seguridad

- Después de 5 intentos en 15 min → `"Demasiados intentos. Esperá 5 minutos."` (rate limit en KV)
- No revelar si el email existe o no — mismo mensaje en ambos casos
- Link de magic link: uso único, expira a los 15 min

---

## Reset (flujo futuro)

Si se habilitan contraseñas en v1.1:
```
/reset-password → [Email] → [ENVIAR] → link via Resend
```
