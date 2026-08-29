# Procedimiento de Desarrollo Paralelo — SIGLO / SMG
**Bitera Digital · Rama de referencia: `develop`**

Este documento define cómo Zelmar trabaja de forma local con Antigravity en los dos repos (`admin-biteradigital-com/siglo` y `admin-biteradigital-com/smg`) sin que ambos avancen "a ciegas" uno del otro, y cómo ese código se promueve local → staging → producción.

---

## 1. Principio rector: SIGLO manda, SMG obedece

`siglo` define el contrato (schema D1, endpoints, ADRs). `smg` es un consumidor. Esto significa una regla dura:

> **Ningún cambio de contrato (endpoint, tabla, campo) se hace primero en `smg`.** Si `smg` necesita algo que la API no da, la tarea nace en `siglo`, se cierra ahí (migración + endpoint + doc), y recién después se consume en `smg`.

Esto evita el escenario típico de "el frontend inventó un campo que el backend nunca va a tener".

---

## 2. Estructura local de carpetas

Trabajar los dos repos como hermanos, no anidados:

```
~/bitera/
├── siglo/      (admin-biteradigital-com/siglo)
└── smg/        (admin-biteradigital-com/smg)
```

Esto te permite tener **dos ventanas/sesiones de Antigravity abiertas en simultáneo**, una por carpeta, cada una con su propio `ANTIGRAVITY.md` como SSOT local.

---

## 3. Ramas y capas (mismo esquema en los dos repos)

| Rama | Capa | Deploy |
|---|---|---|
| `feature/*` | Local | `wrangler dev` / `vite dev` — nunca se despliega |
| `develop` | Local integrado | Base de todo el trabajo del día a día |
| `staging` | Staging (Cloudflare) | `siglo-db-staging`, `smg-staging.biteradigital.com` |
| `main` | Producción | `siglo-db-prod`, dominio real del cliente SMG |

Regla de promoción: **nunca se saltea una capa.** `feature/* → develop → staging → main`. El merge a `staging` y a `main` requiere que el checklist de la sección 5 esté en verde.

---

## 4. Rutina de arranque local diario (orden obligatorio)

Como `smg` depende de la API de `siglo`, el orden de arranque no es arbitrario:

1. **Levantar SIGLO primero:**
   ```
   cd ~/bitera/siglo
   npm run db:migrate:dev      # aplica migraciones a D1 local
   npm run db:seed:dev         # datos de prueba (incluye id_abonado=1 SMG)
   npm run dev                 # wrangler dev, expone la API local
   ```
   Verificar salud: `GET /api/v1/health` → 200 antes de seguir.

2. **Levantar SMG apuntando a esa API local:**
   ```
   cd ~/bitera/smg
   # .env.local debe apuntar VITE_API_URL a la instancia local de SIGLO (paso 1)
   npm run typecheck && npm run dev
   ```

3. **Trabajar la tarea del día** en el repo que corresponda según la regla de la sección 1.

4. **Antes de cualquier commit**, correr en el repo tocado: `npm run typecheck && npm run test`.

Esto te da un ciclo local completo (API real corriendo + PWA consumiéndola) en vez de mockear el backend desde el frontend, que es donde suelen aparecer los desfasajes de contrato.

---

## 5. Checklist de promoción de capa (gate obligatorio)

Antes de mergear `develop → staging` o `staging → main`, en **cada repo tocado**:

- [ ] `npm run typecheck` → 0 errores
- [ ] `npm run test` → 100% verde
- [ ] Si hubo cambio de schema en `siglo`: migración nueva numerada + `diccionario.md` actualizado en el mismo commit (docs-as-code)
- [ ] Si `smg` consume un endpoint nuevo/modificado: confirmar que existe en la versión de `siglo` ya desplegada en esa misma capa (no se puede promover `smg` a staging si `siglo` staging todavía no tiene el endpoint)
- [ ] Variables de entorno de la capa destino completas en `wrangler.toml` / `.env` (nada de placeholders `TODO@TODO.com`)
- [ ] Secrets inyectados vía `wrangler secret put` en esa capa (no en el repo)

---

## 6. Sincronización de tareas entre repos

Agregar en **ambos repos**, en la raíz junto a `ANTIGRAVITY.md`, un archivo `SYNC.md` con este formato mínimo:

```markdown
# SYNC.md — Estado de dependencia cruzada

## Este repo espera del otro
- [ ] (siglo) Endpoint POST /api/v1/pagos/webhook con idempotencia — bloquea Checkout.tsx en smg

## Este repo le debe al otro
- [ ] (smg) Confirmar consumo de precio_publico en catálogo público antes de cerrar ADR e-commerce

Última sincronización: 2026-07-25
```

Cada vez que arranques una sesión de Antigravity en cualquiera de los dos repos, el primer paso del prompt (sección 7) le pide leer su propio `SYNC.md` **y** el `SYNC.md` del otro repo (podés pegarle el contenido a mano si las sesiones no comparten filesystem).

---

## 7. Prompts unificados para Antigravity

Usar el que corresponda al abrir cada sesión. Los dos comparten cabecera de contexto para que, aunque sean sesiones separadas, "sepan" que el otro repo existe y en qué estado está.

### 7.1 Prompt para sesión en `siglo`

```
Estás operando en el repositorio admin-biteradigital-com/siglo, el backend ERP core
del proyecto SIGLO (Bitera Digital), cliente inicial SMG Distribuidora.

Contexto obligatorio antes de cualquier acción:
1. Leé ANTIGRAVITY.md completo (Bloques 1-7) como SSOT.
2. Leé SYNC.md de este repo.
3. Te paso a continuación el SYNC.md actual del repo hermano `smg` (frontend PWA que
   consume esta API) para que sepas qué depende de vos:
   [PEGAR CONTENIDO DE smg/SYNC.md]

Restricciones absolutas, no negociables: presupuesto cero (Cloudflare free tier),
secure by design, offline-first en el consumidor.

Regla de contrato: cualquier cambio de schema D1, endpoint o campo de respuesta debe
quedar reflejado el mismo commit en docs/datos/schema.sql, diccionario.md, y en
SYNC.md de este repo bajo "Este repo le debe al otro" si smg necesita consumirlo.

Tarea de hoy: [DESCRIBIR TAREA PUNTUAL]

Antes de cerrar la tarea: correr npm run typecheck && npm run test, y confirmar que
no quedan placeholders (TODO@TODO.com, etc.) en la capa que estés tocando.
```

### 7.2 Prompt para sesión en `smg`

```
Estás operando en el repositorio admin-biteradigital-com/smg, el frontend PWA
(React+TS+Vite+Workbox+idb) del cliente SMG Distribuidora, que consume la API de
SIGLO como contrato externo — no como código propio.

Contexto obligatorio antes de cualquier acción:
1. Leé ANTIGRAVITY.md completo de este repo como SSOT.
2. Leé SYNC.md de este repo.
3. Te paso el SYNC.md actual del repo `siglo` (backend del que dependés) para que
   sepas qué endpoints/campos están realmente disponibles en la capa en la que
   estás trabajando (local/staging/prod):
   [PEGAR CONTENIDO DE siglo/SYNC.md]

Restricciones absolutas: presupuesto cero, mobile-first (Android, touch targets
≥44x44px, viewport 375px), offline-first (IndexedDB antes que dispatch remoto).

Regla de contrato: si necesitás un campo o endpoint que la API de SIGLO no expone
todavía en esta capa, NO lo inventes ni lo mockees de forma permanente. Registralo
en SYNC.md bajo "Este repo espera del otro" y marcá el punto de integración como
bloqueado hasta que siglo lo publique en la misma capa.

Tarea de hoy: [DESCRIBIR TAREA PUNTUAL]

Antes de cerrar la tarea: correr npm run typecheck && npm run build, y verificar
que el Service Worker registra correctamente en local.
```

---

## 8. Puntos críticos actuales a resolver antes de escalar a staging (según reportes 25-jul-2026)

Estos bloquean cualquier promoción de capa hoy mismo:

1. **`siglo`**: placeholders `TODO@TODO.com` / `https://TODO.biteradigital.com` en `wrangler.toml` (staging y prod) — reemplazar por dominios reales (`siglo.smg.biteradigital.com`).
2. **`siglo`**: secrets de Better Auth y Resend no inyectados vía `wrangler secret put` en ningún entorno.
3. **`siglo`/`smg`**: pasarela de pago (ADR-009) sin proveedor definido — Webpay/Transbank, Flow.cl o MercadoPago, con hosted checkout/redirect como requisito no negociable. Esto bloquea `Checkout.tsx` en `smg`.
4. **`smg`**: validación runtime completa de la cola offline (`offlineQueue.ts` / `useOfflineSync.ts`) en IndexedDB, pendiente de correr en condiciones reales de baja conectividad (Chamiza).

Sugerencia de orden: resolver 1 y 2 primero (son de infraestructura, no bloquean lógica de negocio), después definir la pasarela (3) porque desbloquea trabajo real en `smg`, y en paralelo avanzar la validación offline (4) que no depende de nada de lo anterior.
