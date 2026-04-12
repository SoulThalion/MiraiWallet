/** Variables de entorno de test: ver `load-test-env.ts` (Vitest `setupFiles`, antes de cualquier import). */
import { sequelize } from '../../src/config/database'
import '../../src/models'   // register models & associations

export async function setupDb(): Promise<void> {
  /** Alinea esquema con los modelos sin DROP (evita borrar la misma BD que desarrollo si coinciden credenciales). */
  await sequelize.sync({ alter: true })
}

export async function teardownDb(): Promise<void> {
  await sequelize.close()
}
