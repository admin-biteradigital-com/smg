## ¿Qué hace este PR?

<!-- Descripción concisa del cambio. 1–3 oraciones. -->

## Tipo de cambio

- [ ] 🐛 Bug fix
- [ ] ✨ Nueva funcionalidad
- [ ] 🔒 Seguridad
- [ ] 🗄️ Migración de base de datos
- [ ] ♻️ Refactor
- [ ] 📝 Documentación
- [ ] 🧪 Tests

## Checklist — Definition of Done

### Obligatorio
- [ ] No hay secrets hardcodeados (`grep -r "BETTER_AUTH_SECRET\|RESEND_API_KEY" src/`)
- [ ] Validación Zod en todos los endpoints con body
- [ ] RBAC aplicado en todos los endpoints protegidos
- [ ] Operaciones multi-tabla usan `env.DB.batch()`
- [ ] Errores con formato estándar `{ error: { code, message, status } }`
- [ ] Sin `console.log` con datos de usuarios

### Tests
- [ ] Unit tests escritos para la lógica nueva
- [ ] Integration test del endpoint (happy path + error)
- [ ] Si toca datos de negocio: test de cross-tenant isolation
- [ ] Todos los tests pasan localmente (`npm run test`)

### Si incluye migración de D1
- [ ] Archivo de migración numerado en `docs/datos/migrations/`
- [ ] Migración probada localmente (`npm run db:migrate:dev`)
- [ ] No modifica migraciones ya aplicadas

### Si incluye nuevo endpoint público
- [ ] Rate limiting aplicado
- [ ] Documentado en `docs/api/endpoints/`
- [ ] Cache headers configurados si aplica

## Endpoint(s) afectado(s)

<!-- Listar si aplica. Ej: POST /api/v1/leads -->

## Migración de D1

<!-- Listar si aplica. Ej: 0003_add_sync_conflicts.sql -->

## Notas para el reviewer

<!-- Contexto adicional, decisiones tomadas, trade-offs. -->
