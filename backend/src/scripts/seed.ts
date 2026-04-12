import '../models'
import { connectDatabase } from '../config/database'
import { User, Account, Category, Transaction, Alert, Budget } from '../models'
import logger from '../utils/logger'

const today  = new Date()
const fmt    = (d: Date)    => d.toISOString().split('T')[0]
const ago    = (days: number) => { const d = new Date(today); d.setDate(d.getDate() - days); return fmt(d) }
const month  = fmt(today).slice(0, 7)

async function seed() {
  await connectDatabase()

  // Clean in FK-safe order
  await Budget.destroy({ where: {} })
  await Alert.destroy({ where: {} })
  await Transaction.destroy({ where: {} })
  await Category.destroy({ where: {} })
  await Account.destroy({ where: {} })
  await User.destroy({ where: {} })

  logger.info('Seeding users…')
  const user = await User.create({
    name: 'Carlos García', email: 'carlos@miraiWallet.com',
    passwordHash: 'Password1', role: 'user', isActive: true,
  })

  logger.info('Seeding categories…')
  const cats = await Category.bulkCreate([
    { userId: user.id, name: 'Hogar',         icon: '🏠', color: '#1A8CFF', monthlyBudget: 700,  type: 'expense', isDefault: true },
    { userId: user.id, name: 'Comida',         icon: '🍔', color: '#2EC776', monthlyBudget: 400,  type: 'expense', isDefault: true },
    { userId: user.id, name: 'Transporte',     icon: '🚗', color: '#F5C842', monthlyBudget: 250,  type: 'expense', isDefault: true },
    { userId: user.id, name: 'Ocio',           icon: '🎬', color: '#7F77DD', monthlyBudget: 200,  type: 'expense', isDefault: true },
    { userId: user.id, name: 'Salud',          icon: '💊', color: '#FF5A5A', monthlyBudget: 150,  type: 'expense', isDefault: true },
    { userId: user.id, name: 'Suscripciones',  icon: '📱', color: '#00C8D4', monthlyBudget: 50,   type: 'expense', isDefault: true },
    { userId: user.id, name: 'Nómina',         icon: '💰', color: '#2EC776', monthlyBudget: 0,    type: 'income',  isDefault: true },
  ], { returning: true })

  const byName = Object.fromEntries(cats.map(c => [c.name, c]))

  logger.info('Seeding account…')
  const account = await Account.create({
    userId: user.id, name: 'Cuenta Corriente', type: 'checking',
    balance: 12840.50, currency: 'EUR', institution: 'Banco Mirai', color: '#1A8CFF',
  })

  logger.info('Seeding transactions…')
  await Transaction.bulkCreate([
    { userId: user.id, accountId: account.id, categoryId: byName['Nómina'].id,       description: 'Nómina marzo',        amount: 3200,  type: 'income',  date: ago(8),  importSource: 'bank_api' },
    { userId: user.id, accountId: account.id, categoryId: byName['Hogar'].id,        description: 'Alquiler',            amount: 620,   type: 'expense', date: ago(7) },
    { userId: user.id, accountId: account.id, categoryId: byName['Comida'].id,       description: 'Mercadona',           amount: 87.40, type: 'expense', date: ago(0) },
    { userId: user.id, accountId: account.id, categoryId: byName['Suscripciones'].id,description: 'Spotify Premium',     amount: 10.99, type: 'expense', date: ago(1),  isRecurring: true, recurringPeriod: 'monthly' },
    { userId: user.id, accountId: account.id, categoryId: byName['Transporte'].id,   description: 'Repsol gasolina',     amount: 65,    type: 'expense', date: ago(2) },
    { userId: user.id, accountId: account.id, categoryId: byName['Ocio'].id,         description: 'Cena restaurante',    amount: 48.50, type: 'expense', date: ago(3) },
    { userId: user.id, accountId: account.id, categoryId: byName['Salud'].id,        description: 'Gimnasio',            amount: 45,    type: 'expense', date: ago(5),  isRecurring: true, recurringPeriod: 'monthly' },
    { userId: user.id, accountId: account.id, categoryId: byName['Comida'].id,       description: 'El Corte Inglés',     amount: 120,   type: 'expense', date: ago(10) },
  ])

  logger.info('Seeding alerts…')
  await Alert.bulkCreate([
    { userId: user.id, type: 'danger',  badge: 'URGENTE',    title: 'Seguro del coche vence en 3 días',  body: 'Tienes saldo suficiente para pagarlo.',                        amount: '€420,00',     actions: [{ label: 'Pagar ahora', style: 'primary' }, { label: 'Recordar', style: 'secondary' }] },
    { userId: user.id, type: 'success', badge: 'SUGERENCIA', title: 'Financiación 0% disponible',        body: 'MacBook Pro a 12 meses sin intereses.',                       amount: '€132/mes × 12', actions: [{ label: 'Ver oferta',   style: 'success'   }, { label: 'Ignorar',  style: 'secondary' }] },
    { userId: user.id, type: 'warning', badge: 'AVISO',      title: 'Ocio +24% vs febrero',              body: '€210 gastados vs €169 el mes anterior.',                      amount: '+€41 vs feb', actions: [{ label: 'Ajustar límite', style: 'gold'   }, { label: 'Ver desglose', style: 'secondary' }] },
  ])

  logger.info('Seeding budgets…')
  for (const cat of cats.filter(c => c.type === 'expense')) {
    await Budget.create({ userId: user.id, categoryId: cat.id, amount: cat.monthlyBudget, month })
  }

  logger.info('✅  Seed complete!')
  logger.info(`   Email:    carlos@miraiWallet.com`)
  logger.info(`   Password: Password1`)
  process.exit(0)
}

seed().catch(err => { logger.error(err); process.exit(1) })
