# AGENTS.md — Reglas y Directrices de Proyecto (SMG Frontend)

> **Instrucción primordial:** Antes de cualquier tarea, leer [`ANTIGRAVITY.md`](file:///c:/Users/zelma/OneDrive/Documentos/Repositorios%20Git/SMG/ANTIGRAVITY.md) en la raíz para el contexto completo de arquitectura, especificaciones y orden de lectura.

---

## Restricciones Duras del Proyecto

1. **Presupuesto Cloudflare $0:**
   - Todo el frontend se aloja exclusivamente en Cloudflare Pages (*free tier*). No introducir servicios de pago ni dependencias que requieran infraestructura paga.

2. **Mobile-First (Android):**
   - El dispositivo objetivo principal son smartphones y tablets Android de operadores y vendedores en campo. Toda interfaz y flujo debe estar diseñado y optimizado prioritariamente para pantallas móviles.

3. **Offline-First:**
   - La operación de campo debe funcionar sin conexión a internet. El uso de **IndexedDB (Dexie.js / idb)** y **Background Sync** es obligatorio para persistir y sincronizar transacciones offline (ventas, cobranzas, rutas).

4. **Arquitectura de Navegación por Escenas:**
   - Cada paso de un flujo operativo debe ser una ruta separada en **React Router** (ej. `/app/jornada/cobro`, `/app/jornada/resumen`). **PROHIBIDO** implementar wizards o flujos multi-paso monolíticos basados exclusivamente en estado en memoria, para permitir restauración de estado ante refrescos de pantalla o caídas de app.

5. **Relación Contractual: "SIGLO manda, SMG obedece":**
   - `siglo` define el contrato (schema de base de datos D1, endpoints REST `/api/v1/*`, validaciones). `smg` es exclusivamente un consumidor. **Nunca** modificar ni asumir cambios de contratos de API en este repo sin coordinar previamente con el repositorio de backend `SIGLO`.

6. **Estrategia y Política de Deployments:**
   - **Staging:** Deploy automático ejecutado por CI al hacer push a la rama `develop`.
   - **Producción:** Deploy a producción ejecutado al hacer push a `main`, requiriendo **aprobación manual** del ambiente en GitHub Actions.
   - *Nota:* Ambos comportamientos son intencionales y deliberados. **No modificar el pipeline de CI/CD sin autorización explícita de Zelmar.**

---

## Protocolo de cierre de sesión (obligatorio antes de reportar "completado")

Antes de informar que una tarea está terminada, verificar y reportar explícitamente:

1. `git status` — confirmar que no quedan cambios sin commitear. Si los hay, commitear antes de reportar como finalizada la tarea.
2. `git log origin/<rama> --oneline -3` — confirmar que el commit realmente llegó al repositorio remoto, no solo al historial local.
3. Si el cambio dispara CI/CD, no asumir éxito por el solo hecho de haber hecho push. Indicar explícitamente que la confirmación del resultado del pipeline requiere revisión humana en GitHub Actions, salvo que se tenga forma de consultarlo directamente.
4. Si el cambio afecta rutas, UI o flujo de usuario visible, indicar que se recomienda validación manual en Staging antes de considerar el tema cerrado.

Reportar el resultado de los puntos 1 y 2 explícitamente en cada resumen de tarea completada, no solo cuando se pregunte.
