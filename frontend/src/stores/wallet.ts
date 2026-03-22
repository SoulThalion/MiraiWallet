import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ── Types ────────────────────────────────────────────────
export interface Transaction {
  id: number
  name: string
  category: string
  icon: string
  amount: number
  date: string
}

export interface Category {
  name: string
  icon: string
  budget: number
  spent: number
  color: string
}

export interface AlertAction {
  label: string
  style: 'primary' | 'secondary' | 'success' | 'gold'
}

export interface Alert {
  id: number
  type: 'danger' | 'success' | 'warning'
  badge: string
  title: string
  body: string
  amount: string | null
  amountLabel?: string | null
  actions: AlertAction[]
}

export interface MonthlyData {
  month: string
  amount: number
  current?: boolean
}

export interface NewExpense {
  description: string
  category: string
  amount: string
  date: string
}

export interface DonutSegment extends Category {
  pct: number
  dash: number
  offset: number
}

// ── Store ────────────────────────────────────────────────
export const useWalletStore = defineStore('wallet', () => {
  // ── State ──────────────────────────────────────────────
  const darkMode = ref<boolean>(true)
  const onboarded = ref<boolean>(false)

  const balance = ref<number>(12840.50)

  const transactions = ref<Transaction[]>([
    { id: 1,  name: 'Mercadona',       category: 'Comida',          icon: '🛒', amount: -87.40,  date: 'Hoy, 10:23' },
    { id: 2,  name: 'Nómina',          category: 'Ingresos',        icon: '💰', amount: 3200.00, date: '14 Mar' },
    { id: 3,  name: 'Spotify Premium', category: 'Suscripciones',   icon: '🎵', amount: -10.99,  date: '13 Mar' },
    { id: 4,  name: 'Repsol',          category: 'Transporte',      icon: '⛽', amount: -65.00,  date: '12 Mar' },
    { id: 5,  name: 'Amazon',          category: 'Compras',         icon: '📦', amount: -43.20,  date: '10 Mar' },
    { id: 6,  name: 'Gimnasio',        category: 'Salud',           icon: '💪', amount: -45.00,  date: '1 Mar'  },
  ])

  const categories = ref<Category[]>([
    { name: 'Hogar',      icon: '🏠', budget: 700,  spent: 620, color: '#1A8CFF' },
    { name: 'Comida',     icon: '🍔', budget: 400,  spent: 340, color: '#2EC776' },
    { name: 'Transporte', icon: '🚗', budget: 250,  spent: 180, color: '#F5C842' },
    { name: 'Ocio',       icon: '🎬', budget: 200,  spent: 210, color: '#7F77DD' },
    { name: 'Salud',      icon: '💊', budget: 150,  spent: 90,  color: '#FF5A5A' },
  ])

  const alerts = ref<Alert[]>([
    {
      id: 1, type: 'danger', badge: 'URGENTE',
      title: 'Seguro del coche vence en 3 días',
      body: 'Tienes saldo suficiente para pagarlo sin comprometer el presupuesto mensual.',
      amount: '€420,00', amountLabel: null,
      actions: [{ label: 'Pagar ahora', style: 'primary' }, { label: 'Recordar', style: 'secondary' }]
    },
    {
      id: 2, type: 'success', badge: 'SUGERENCIA',
      title: 'Financiación 0% disponible',
      body: 'MacBook Pro a 12 meses sin intereses. Cuota: 4,7% de tu ingreso mensual.',
      amount: '€132/mes × 12',
      actions: [{ label: 'Ver oferta', style: 'success' }, { label: 'Ignorar', style: 'secondary' }]
    },
    {
      id: 3, type: 'warning', badge: 'AVISO',
      title: 'Ocio +24% vs febrero',
      body: '€210 gastados vs €169 el mes anterior. Considera ajustar el límite.',
      amount: '+€41 vs feb',
      actions: [{ label: 'Ajustar límite', style: 'gold' }, { label: 'Ver desglose', style: 'secondary' }]
    }
  ])

  const monthlyData = ref<MonthlyData[]>([
    { month: 'Oct', amount: 1604 },
    { month: 'Nov', amount: 2100 },
    { month: 'Dic', amount: 2800 },
    { month: 'Ene', amount: 1920 },
    { month: 'Feb', amount: 1703 },
    { month: 'Mar', amount: 1847, current: true },
  ])

  const newExpense = ref<NewExpense>({ description: '', category: 'Hogar', amount: '', date: '' })

  // ── Computed ───────────────────────────────────────────
  const totalIncome = computed<number>(() =>
    transactions.value.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  )

  const totalExpenses = computed<number>(() =>
    Math.abs(transactions.value.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))
  )

  const saved = computed<number>(() => totalIncome.value - totalExpenses.value)

  const monthlyAverage = computed<number>(() => {
    const totals = monthlyData.value.map(m => m.amount)
    return Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
  })

  const bestMonth = computed<MonthlyData>(() =>
    monthlyData.value.reduce((min, m) => m.amount < min.amount ? m : min)
  )

  const totalBudget = computed<number>(() =>
    categories.value.reduce((s, c) => s + c.budget, 0)
  )

  const totalSpent = computed<number>(() =>
    categories.value.reduce((s, c) => s + c.spent, 0)
  )

  const donutSegments = computed<DonutSegment[]>(() => {
    const total = totalSpent.value
    const circumference = 2 * Math.PI * 36
    let offset = 0
    return categories.value.map(cat => {
      const pct = cat.spent / total
      const dash = pct * circumference
      const seg: DonutSegment = { ...cat, pct: Math.round(pct * 100), dash, offset }
      offset += dash
      return seg
    })
  })

  const maxBar = computed<number>(() => Math.max(...monthlyData.value.map(m => m.amount)))

  // ── Actions ────────────────────────────────────────────
  function toggleDark(): void {
    darkMode.value = !darkMode.value
  }

  function completeOnboarding(): void {
    onboarded.value = true
  }

  function dismissAlert(id: number): void {
    alerts.value = alerts.value.filter(a => a.id !== id)
  }

  function addTransaction(tx: NewExpense): void {
    const amount = parseFloat(tx.amount)
    transactions.value.unshift({
      id: Date.now(),
      name: tx.description,
      category: tx.category,
      icon: '💸',
      amount: -Math.abs(amount),
      date: 'Hoy'
    })
    balance.value -= Math.abs(amount)
  }

  function updateBudget(categoryName: string, newBudget: number): void {
    const cat = categories.value.find(c => c.name === categoryName)
    if (cat) cat.budget = newBudget
  }

  return {
    darkMode, onboarded, balance,
    transactions, categories, alerts, monthlyData, newExpense,
    totalIncome, totalExpenses, saved,
    monthlyAverage, bestMonth, totalBudget, totalSpent,
    donutSegments, maxBar,
    toggleDark, completeOnboarding, dismissAlert, addTransaction, updateBudget
  }
})
