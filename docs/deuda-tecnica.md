# Registro de Deuda Técnica — SMG Frontend

Este documento registra la deuda técnica conocida en dependencias, el análisis detallado de riesgo por advisory, la justificación de postergación y el plan de resolución.

---

## 1. Vulnerabilidades en Dependencias de Desarrollo y Producción (`npm audit`)

- **Fecha de registro original:** 31 de agosto de 2026
- **Fecha de actualización:** 26 de septiembre de 2026
- **Estado:** Actualización quirúrgica aplicada. Vulnerabilidades High y Critical reducidas a 0. Vulnerabilidades Moderate restantes aceptadas y mitigadas por arquitectura.
- **Severidad reportada por npm audit:** 5 vulnerabilidades (5 moderate, 0 high, 0 critical)
- **Resultado de `npm audit --audit-level=high`:** **0 vulnerabilidades (Exit code 0 — Pasa en CI)**.

---

### Detalle de la Actualización Quirúrgica (Septiembre 2026)

Se aplicó una actualización acotada sin saltos disruptivos a Vite 8 ni a React Router 7:
1. `npm audit fix` (sin `--force`): Actualizó `sharp` (0.35.4, resolviendo vulnerabilidades críticas/altas en `libheif`), `wrangler` (4.141.0), `browserslist` (4.29.1, resolviendo 2 avisos High) y `baseline-browser-mapping` (2.11.26).
2. `vite` (`^5.4.0` → `^6.4.3`): Resolvió la vulnerabilidad High `GHSA-fx2h-pf6j-xcff` (bypass de `server.fs.deny` en Windows) y actualizó `esbuild` a `0.25.0` (resolviendo `GHSA-67mh-4wv8-2f99`).
3. `vite-plugin-pwa` (`^0.20.0` → `^0.21.1`): Compatible con Vite 6, conservando 100% la configuración de Service Worker/Workbox de ADR-018 sin cambios de sintaxis.
4. `vitest` y `@vitest/coverage-v8` (`^2.0.0` → `^3.2.6`): Resolvió la vulnerabilidad Critical `GHSA-5xrq-8626-4rwp` (lectura de archivos en UI server). Compatible con `better-auth` (`^2.0.0 || ^3.0.0 || ^4.0.0`).
5. `@vitejs/plugin-react` se mantuvo en `^4.3.0` (compatible con Vite 6) y `react-router-dom` se mantuvo en `^6.26.0`.

---

### Detalle de Paquetes y Análisis de Vulnerabilidades Restantes (Todas Moderate)

#### A. Dependencias de Producción (`react-router` / `react-router-dom`)

| Paquete | Versión actual | Severidad | Advisory / CVE | Título / Vector | Análisis contra SMG | Riesgo Real en Producción |
|---|---|---|---|---|---|---|
| `react-router` / `react-router-dom` | `^6.26.0` | Moderate | [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg) | *Arbitrary Constructor Injection via `deserializeErrors()` en SSR Hydration* (CWE-470) | **No Aplica.** SMG es una SPA/PWA estática alojada en Cloudflare Pages. No utiliza Server-Side Rendering (SSR), no ejecuta Node.js en servidor ni hidrata errores con `deserializeErrors()`. El enrutamiento es 100% cliente declarativo (ADR-012). | **Nulo (0)** |
| `react-router` / `react-router-dom` | `^6.26.0` | Moderate | [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) | *Open redirect via backslash en `<Link>` y `useNavigate`* (CWE-601) | **No Aplica / No Explotable.** Todas las llamadas a `navigate()` y `<Link to={...}>` en la app utilizan rutas que comienzan con prefijo raíz fijo del sistema (ej. `'/jornada/ruta'`, `'/catalogo'`, `'/jornada/venta/${clienteId}'`). Las interpolaciones corresponden exclusivamente a IDs internos de entidades (`clienteId`, `veh.id`, `ventaId`). Los query parameters existentes se transmiten dentro de rutas internas fijas, nunca como destino base ni URLs externas. | **Nulo (0)** |

---

#### B. Cadena de Herramientas de Desarrollo y Testing (Dev Tooling — No van al bundle de producción)

| Paquete | Tipo | Severidad | Advisory / CVE | Título / Vector | Modo de uso en SMG | Riesgo Real en Producción |
|---|---|---|---|---|---|---|
| `@vitest/mocker` / `vitest` / `@vitest/coverage-v8` | devDependency directa/transitiva | Moderate | [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) | *Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock* (CWE-22) | Test runner y mocking interno. Se ejecuta exclusivamente en modo CLI headless (`vitest run`). No corre en servidor ni en producción. | **Nulo (0)** |

---

## 2. Comportamiento en Pipeline de CI/CD

- **Archivo:** `.github/workflows/deploy.yml` (línea 35)
- **Configuración:**
  ```yaml
  - name: Auditoría de dependencias
    run: npm audit --audit-level=high
    continue-on-error: true
  ```
- **Confirmación:** Con la eliminación de todas las vulnerabilidades High y Critical, `npm audit --audit-level=high` finaliza con código de salida **0 (exitoso)**, pasando limpiamente sin advertencias en el pipeline de CI/CD.

---

## 3. Justificación de Mantenimiento de React Router v6

1. **Riesgo Operativo Nulo:** Ninguna de las vulnerabilidades Moderate restantes es explotable en la arquitectura de SMG (PWA estática sin SSR en Cloudflare Pages, rutas internas fijas, dev tools aisladas a CLI headless).
2. **Impacto de migrar a React Router v7:** Subir a `react-router-dom@7.x` representa un cambio mayor de framework (fusión con Remix, cambios de APIs, tipos y convención de rutas) que introduce alto riesgo de regresión en flujos operativos de campo. Se mantiene planificado para una sesión técnica dedicada de refactorización cuando el proyecto lo requiera.
