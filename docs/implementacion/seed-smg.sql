-- ============================================================
-- SMG Distribuidora — Seed específico del cliente
-- Ejecutar DESPUÉS de docs/datos/seed.sql del repo siglo
-- ============================================================
-- 
-- wrangler d1 execute siglo-db-prod \
--   --file=docs/implementacion/seed-smg.sql
-- ============================================================

PRAGMA foreign_keys = ON;

-- ── CONFIGURACIÓN ESPECÍFICA DE SMG ──────────────────────────
-- Completar los PENDIENTE con Sebastián antes del Go-Live
UPDATE OR IGNORE CONFIGURACION SET valor = 'SMG Distribuidora' WHERE clave = 'empresa_nombre';
UPDATE OR IGNORE CONFIGURACION SET valor = 'Chamiza, Región de Los Lagos, Chile' WHERE clave = 'empresa_direccion';
UPDATE OR IGNORE CONFIGURACION SET valor = 'Chamiza' WHERE clave = 'empresa_ciudad';
UPDATE OR IGNORE CONFIGURACION SET valor = 'Los Lagos' WHERE clave = 'empresa_region';
-- Los siguientes requieren datos reales de Sebastián:
-- UPDATE CONFIGURACION SET valor = '[RUT SMG]'         WHERE clave = 'empresa_rut';
-- UPDATE CONFIGURACION SET valor = '[teléfono SMG]'    WHERE clave = 'empresa_telefono';
-- UPDATE CONFIGURACION SET valor = '[email SMG]'       WHERE clave = 'empresa_email';
-- UPDATE CONFIGURACION SET valor = '+56[número]'       WHERE clave = 'whatsapp_numero';
-- UPDATE CONFIGURACION SET valor = '[URL Instagram]'   WHERE clave = 'instagram_url';

-- ── RUTAS DE SMG ─────────────────────────────────────────────
-- Rutas actuales de distribución — ajustar con Sebastián
-- Las del seed.sql son placeholders; estas reemplazan con datos reales
DELETE FROM RUTAS;
INSERT INTO RUTAS (id, nombre, descripcion, distancia_estimada_km, duracion_estimada_horas) VALUES
  (1, 'Ruta Chamiza Norte',    'Sectores norte de Chamiza y alrededores',         35.0, 3.0),
  (2, 'Ruta Chamiza Sur',      'Sectores sur de Chamiza',                         28.0, 2.5),
  (3, 'Ruta Puerto Montt',     'Cobertura urbana Puerto Montt',                   55.0, 4.0),
  (4, 'Ruta Los Muermos',      'Los Muermos y localidades intermedias',           80.0, 5.0),
  (5, 'Ruta Puerto Varas',     'Puerto Varas y alrededores',                      70.0, 4.5);

-- ── MARCAS PARA CATÁLOGO ─────────────────────────────────────
-- Marcas actuales distribuidas por SMG
-- Se almacenan como CONFIGURACION para el catálogo público
-- (No hay tabla MARCAS en el schema — las marcas son texto en PRODUCTOS_SERVICIOS)
-- El catálogo se carga manualmente desde el panel admin.
-- Referencia de marcas actuales (usar al crear productos):
-- Freegells · Trento · Talento · Mantecol · Entre Ríos
-- Blong · Buzzy Croc · Pop Boom · TNT
-- Go! Jelly · Gomutcho · Bel
-- Kryzpo · Pit Stop · Coloreti · Chocomais
-- Gold Café · Extra Life · Montevergine

-- ── NOTA: Datos que se cargan manualmente (NO en seed) ────────
-- Los siguientes datos los carga Sebastián desde el panel admin
-- después de completar el setup inicial:
--
-- 1. EMPLEADOS       → Sebastián + choferes + vendedores + depósito
-- 2. VEHICULOS       → flota completa de SMG
-- 3. PROVEEDORES     → proveedores brasileños, argentinos y chilenos
-- 4. PRODUCTOS       → catálogo completo ~80 SKUs
-- 5. CLIENTES        → base de clientes existentes
--
-- Ver: docs/implementacion/setup-inicial.md PASO 10

-- ── FIN DEL SEED SMG ─────────────────────────────────────────
