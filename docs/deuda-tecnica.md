# Registro de Deuda Técnica — SMG Frontend

Este documento registra la deuda técnica conocida en dependencias, el análisis detallado de riesgo por advisory, la justificación de postergación y el plan de resolución.

---

## 1. Vulnerabilidades en Dependencias de Desarrollo y Producción (`npm audit`)

- **Fecha de registro:** 31 de agosto de 2026
- **Estado:** Aceptado / Mitigado por arquitectura
- **Severidad reportada por npm audit:** 9 vulnerabilidades (6 moderate, 1 high, 2 critical)
- **Resultado de `npm audit fix` (sin `--force`):** 0 resueltas (todas requieren cambios de versión mayor / breaking changes).

---

### Detalle de Paquetes y Análisis Advisory por Advisory

#### A. Dependencias de Producción (`react-router` / `react-router-dom`)

| Paquete | Versión actual | Severidad | Advisory / CVE | Título / Vector | Análisis contra SMG | Riesgo Real en Producción |
|---|---|---|---|---|---|---|
| `react-router` / `react-router-dom` | `^6.28.0` | Moderate | [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg) | *Arbitrary Constructor Injection via `deserializeErrors()` en SSR Hydration* (CWE-470) | **No Aplica.** SMG es una SPA/PWA estática alojada en Cloudflare Pages. No utiliza Server-Side Rendering (SSR), no ejecuta Node.js en servidor ni hidrata errores con `deserializeErrors()`. El enrutamiento es 100% cliente declarativo (ADR-012). | **Nulo (0)** |
| `react-router` / `react-router-dom` | `^6.28.0` | Moderate | [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) | *Open redirect via backslash en `<Link>` y `useNavigate`* (CWE-601) | **No Aplica / No Explotable.** Todas las llamadas a `navigate()` y `<Link to={...}>` en la app utilizan rutas literales fijas internas del sistema (ej. `'/jornada/ruta'`, `'/catalogo'`). Ningún destino de navegación se deriva de query parameters o inputs no saneados provistos por terceros. | **Nulo (0)** |

---

#### B. Cadena de Herramientas de Desarrollo y Testing (Dev Tooling — No van al bundle de producción)

| Paquete | Tipo | Severidad | Advisory / CVE | Título / Vector | Modo de uso en SMG | Riesgo Real en Producción |
|---|---|---|---|---|---|---|
| `esbuild` `<=0.24.2` | devDependency transitiva | Moderate | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | *Peticiones no autorizadas al servidor de desarrollo local* (CWE-346) | Bundler de desarrollo local. No corre ningún servidor esbuild en producción (Cloudflare Pages sirve archivos estáticos precompilados). | **Nulo (0)** |
| `vite` `<=6.4.2` | devDependency directa | High / Moderate | [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)<br>[GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9)<br>[GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3) | *`server.fs.deny` bypass en Windows*, *Path traversal en `.map`*, *NTLMv2 hash disclosure en `launch-editor`* (CWE-22, CWE-73, CWE-522) | Build tool (`npm run build`) y dev server local (`localhost`). No existe servidor Vite en producción. | **Nulo (0)** |
| `vitest` `<=3.2.5` | devDependency directa | Critical | [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp) | *Lectura arbitraria de archivos cuando el servidor Vitest UI está activo* (CWE-22, CWE-862) | Test runner. Se ejecuta exclusivamente en modo CLI headless (`vitest run`). El servidor interactivo `--ui` no se inicia ni se expone a internet. | **Nulo (0)** |
| `@vitest/coverage-v8` `<=3.2.5` | devDependency directa | Critical | Dependencia de `vitest` | Herramienta de cobertura de tests. | No corre en producción. | **Nulo (0)** |
| `@vitest/mocker` `<=3.0.0-beta.4` | devDependency transitiva | Moderate | Dependencia de `vite` | Mocking interno de tests. | No corre en producción. | **Nulo (0)** |
| `vite-node` `<=2.2.0-beta.2` | devDependency transitiva | Moderate | Dependencia de `vite` | Ejecutor de tests en Node. | No corre en producción. | **Nulo (0)** |
| `vite-plugin-pwa` `0.21.0` | devDependency directa | Moderate | Dependencia de `vite` | Plugin de generación de Service Worker en build time. | No corre en producción como servidor. | **Nulo (0)** |

---

## 2. Comportamiento en Pipeline de CI/CD

- **Archivo:** `.github/workflows/deploy.yml` (línea 36)
- **Configuración:**
  ```yaml
  - name: Auditoría de dependencias
    run: npm audit --audit-level=high
    continue-on-error: true
  ```
- **Confirmación:** El paso de auditoría cuenta explícitamente con `continue-on-error: true`. Emite advertencias en el log de calidad pero **no bloquea el pipeline de CI/CD**, permitiendo que los jobs subsiguientes de Build y Deploy a Staging completen exitosamente.

---

## 3. Justificación de Postergación y Plan de Resolución

1. **Riesgo Operativo Nulo:** Ninguna de las 9 vulnerabilidades es explotable en la arquitectura de SMG (PWA estática sin SSR en Cloudflare Pages, rutas internas fijas, dev tools aisladas a build/test CLI).
2. **Impacto de `--force`:** Resolver estas vulnerabilidades exige actualizar `react-router-dom` a v7 (cambio de paradigma y API) y `vite`/`vitest` a versiones mayores con potenciales incompatibilidades con plugins de PWA y toolchain de Node.
3. **Plan de Resolución:**
   - Programar una sesión técnica dedicada a la migración planificada a `react-router-dom@7.x` y `vite@6.x+`/`vitest@4.x` cuando se planifique la siguiente actualización de infraestructura frontend.
