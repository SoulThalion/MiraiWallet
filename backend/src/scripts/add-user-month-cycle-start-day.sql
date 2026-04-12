-- Ejecutar una vez si la tabla `users` ya existía sin esta columna y no usas `sequelize.sync({ alter: true })`.
-- Ajusta el nombre de columna si tu instancia de Sequelize usa otro mapeo.

ALTER TABLE users
  ADD COLUMN monthCycleStartDay INT UNSIGNED NOT NULL DEFAULT 1
  COMMENT '1=mes natural; 2-31=inicio del ciclo (p. ej. 27: abril = 27 mar–26 abr)';
