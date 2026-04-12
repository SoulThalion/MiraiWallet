-- Ejecutar una vez si la tabla `users` existía sin `monthCycleMode`, `monthCycleEndDay` y `monthCycleAnchor`.
-- Ajusta nombres de columna si tu instancia usa otro mapeo (por defecto Sequelize camelCase en MySQL).

ALTER TABLE users
  ADD COLUMN monthCycleMode ENUM('calendar', 'custom') NOT NULL DEFAULT 'calendar'
  COMMENT 'calendar=mes natural; custom=inicio/fin/ancla';

ALTER TABLE users
  ADD COLUMN monthCycleEndDay TINYINT UNSIGNED NOT NULL DEFAULT 31
  COMMENT 'Día de fin del periodo (1–31) en modo custom';

ALTER TABLE users
  ADD COLUMN monthCycleAnchor ENUM('previous', 'current') NOT NULL DEFAULT 'previous'
  COMMENT 'previous=inicio en mes anterior al etiquetado; current=anclado al mes etiquetado';

-- Compatibilidad: quien tenía solo `monthCycleStartDay` > 1 seguía la regla «nómina» (inicio en mes anterior, fin día anterior al inicio).
UPDATE users
SET
  monthCycleMode = 'custom',
  monthCycleEndDay = monthCycleStartDay - 1,
  monthCycleAnchor = 'previous'
WHERE monthCycleStartDay > 1;
