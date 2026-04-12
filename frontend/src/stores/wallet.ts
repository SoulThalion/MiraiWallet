import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  api,
  ApiTransaction,
  ApiCategory,
  ApiAlert,
  ApiBudget,
  DashboardData,
  AuthResult,
  SessionUser,
} from '@/services/api'

// ── Types ────────────────────────────────────────────────
export interface Transaction {
  id: string | number
  name: string
  category: string
  icon: string
  amount: number
  date: string
}

export interface Category {
  id?: string
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
  id: string | number
  type: 'danger' | 'success' | 'warning' | 'info'
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
  const darkMode = ref<boolean>(true)
  const onboarded = ref<boolean>(false)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const user = ref<SessionUser | null>(null)
  const defaultAccountId = ref<string | null>(null)

  const balance = ref<number>(0)
  const transactions = ref<Transaction[]>([])
  const categories = ref<Category[]>([])
  const alerts = ref<Alert[]>([])
  const monthlyData = ref<MonthlyData[]>([])
  const monthlySummary = ref<{ month: string; income: number; expenses: number; net: number }[]>([])
  const newExpense = ref<NewExpense>({ description: '', category: '', amount: '', date: '' })

  function mapApiTransaction(tx: ApiTransaction): Transaction {
    const signed =
      tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : -tx.amount
    return {
      id: tx.id,
      name: tx.description,
      category: tx.category?.name || 'Sin categoría',
      icon: tx.category?.icon || '💸',
      amount: signed,
      date: new Date(tx.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    }
  }

  function mapApiCategory(cat: ApiCategory, budget?: ApiBudget): Category {
    const monthly = cat.monthlyBudget ?? cat.budget ?? 0
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      budget: budget?.amount ?? monthly,
      spent: cat.spent ?? budget?.spent ?? 0
    }
  }

  function mapApiAlert(alert: ApiAlert): Alert {
    const raw = alert.amount
    return {
      id: alert.id,
      type: alert.type,
      badge: alert.badge,
      title: alert.title,
      body: alert.body,
      amount: raw != null && raw !== '' ? String(raw) : null,
      actions: Array.isArray(alert.actions) ? alert.actions : []
    }
  }

  function mapMonthlyData(summary: { month: string; income: number; expenses: number; net: number }[]): MonthlyData[] {
    const monthNames: Record<string, string> = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
      '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    }
    const now = new Date()
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0')

    return summary.map(m => ({
      month: monthNames[m.month] || m.month,
      amount: m.expenses,
      current: m.month === currentMonth
    }))
  }

  function applyAuth(result: AuthResult): void {
    localStorage.setItem('token', result.accessToken)
    localStorage.setItem('refreshToken', result.refreshToken)
    user.value = result.user
  }

  function clearSession(): void {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    user.value = null
    defaultAccountId.value = null
  }

  async function logout(): Promise<void> {
    try {
      await api.logout()
    } catch {
      /* sesión ya inválida */
    }
    clearSession()
  }

  async function loadUser(): Promise<void> {
    if (!localStorage.getItem('token')) {
      user.value = null
      return
    }
    try {
      user.value = await api.getMe()
    } catch {
      clearSession()
    }
  }

  async function loadAccounts(): Promise<void> {
    try {
      const accs = await api.getAccounts()
      defaultAccountId.value = accs[0]?.id ?? null
    } catch (err) {
      console.error('Error loading accounts:', err)
      defaultAccountId.value = null
    }
  }

  async function loadDashboard(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const data: DashboardData = await api.getDashboard()

      balance.value = data.balance
      monthlySummary.value = data.monthlySummary
      monthlyData.value = mapMonthlyData(data.monthlySummary)

      categories.value = data.categoryBreakdown.map(cb => ({
        id: cb.categoryId || 'uncategorized',
        name: cb.name,
        icon: cb.icon,
        color: cb.color,
        budget: 0,
        spent: cb.total
      }))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al cargar datos'
      console.error('Error loading dashboard:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadTransactions(page = 1, limit = 20): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.getTransactions({ page, limit })
      transactions.value = response.data.map(mapApiTransaction)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al cargar transacciones'
      console.error('Error loading transactions:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadCategories(): Promise<void> {
    try {
      const cats = await api.getCategories()
      const existingSpent = new Map(categories.value.map(c => [c.id, c.spent]))
      categories.value = cats.map(cat => mapApiCategory(cat, undefined)).map(cat => ({
        ...cat,
        spent: existingSpent.get(cat.id) ?? cat.spent
      }))
    } catch (err) {
      console.error('Error loading categories:', err)
    }
  }

  async function loadBudgets(month?: string): Promise<void> {
    try {
      const budgets = await api.getBudgets(month)
      categories.value = categories.value.map(cat => {
        const budget = budgets.find(b => b.categoryId === cat.id)
        if (budget) {
          return { ...cat, budget: budget.amount, spent: budget.spent ?? cat.spent }
        }
        return cat
      })
    } catch (err) {
      console.error('Error loading budgets:', err)
    }
  }

  async function loadAlerts(): Promise<void> {
    try {
      const response = await api.getAlerts({ limit: 50 })
      alerts.value = response.data.map(mapApiAlert)
    } catch (err) {
      console.error('Error loading alerts:', err)
    }
  }

  async function initialize(): Promise<void> {
    if (!localStorage.getItem('token')) return
    if (!user.value) await loadUser()
    if (!user.value) return
    await loadAccounts()
    await Promise.all([
      loadDashboard(),
      loadTransactions(),
      loadCategories(),
      loadBudgets(),
      loadAlerts()
    ])
  }

  const totalIncome = computed<number>(() =>
    monthlySummary.value.reduce((sum, m) => sum + m.income, 0)
  )

  const totalExpenses = computed<number>(() =>
    monthlySummary.value.reduce((sum, m) => sum + m.expenses, 0)
  )

  const saved = computed<number>(() =>
    monthlySummary.value.reduce((sum, m) => sum + m.net, 0)
  )

  const monthlyAverage = computed<number>(() => {
    if (monthlyData.value.length === 0) return 0
    const totals = monthlyData.value.map(m => m.amount)
    return Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
  })

  const bestMonth = computed<MonthlyData>(() =>
    monthlyData.value.reduce((min, m) => m.amount < min.amount ? m : min, monthlyData.value[0] || { month: '', amount: 0 })
  )

  const totalBudget = computed<number>(() =>
    categories.value.reduce((s, c) => s + c.budget, 0)
  )

  const totalSpent = computed<number>(() =>
    categories.value.reduce((s, c) => s + c.spent, 0)
  )

  const donutSegments = computed<DonutSegment[]>(() => {
    const total = totalSpent.value
    if (total === 0) return []
    const circumference = 2 * Math.PI * 36
    let offset = 0
    return categories.value.filter(cat => cat.spent > 0).map(cat => {
      const pct = cat.spent / total
      const dash = pct * circumference
      const seg: DonutSegment = { ...cat, pct: Math.round(pct * 100), dash, offset }
      offset += dash
      return seg
    })
  })

  const maxBar = computed<number>(() =>
    Math.max(...monthlyData.value.map(m => m.amount), 0)
  )

  const userInitials = computed<string>(() => {
    if (!user.value?.name?.trim()) return '?'
    const parts = user.value.name.trim().split(/\s+/)
    const a = parts[0]?.[0] ?? ''
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
    const s = (a + b).toUpperCase()
    return s || '?'
  })

  const userDisplayName = computed<string>(() => user.value?.name?.trim() || 'Usuario')

  function toggleDark(): void {
    darkMode.value = !darkMode.value
  }

  function completeOnboarding(): void {
    onboarded.value = true
  }

  async function dismissAlert(id: number | string): Promise<void> {
    try {
      await api.dismissAlert(String(id))
      alerts.value = alerts.value.filter(a => a.id !== id)
    } catch (err) {
      console.error('Error dismissing alert:', err)
    }
  }

  async function addTransaction(tx: NewExpense & { note?: string }): Promise<void> {
    const accountId = defaultAccountId.value
    if (!accountId) {
      const msg = 'No hay cuenta asociada. Inicia sesión de nuevo o crea una cuenta en el backend.'
      error.value = msg
      throw new Error(msg)
    }
    try {
      const category = categories.value.find(c => c.name === tx.category)
      await api.createTransaction({
        description: tx.description,
        amount: parseFloat(tx.amount),
        type: 'expense',
        date: tx.date,
        accountId,
        categoryId: category?.id,
        notes: tx.note?.trim() || undefined
      })
      await loadDashboard()
      await loadTransactions()
      await loadAccounts()
    } catch (err) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } }
      const apiMsg = ax.response?.data?.error?.message
      error.value = typeof apiMsg === 'string' ? apiMsg : err instanceof Error ? err.message : 'Error al añadir transacción'
      throw err
    }
  }

  async function updateBudget(categoryName: string, newBudget: number): Promise<void> {
    console.log('Update budget:', categoryName, newBudget)
  }

  return {
    darkMode,
    onboarded,
    isLoading,
    error,
    user,
    userInitials,
    userDisplayName,
    defaultAccountId,
    balance,
    transactions,
    categories,
    alerts,
    monthlyData,
    monthlySummary,
    newExpense,

    totalIncome,
    totalExpenses,
    saved,
    monthlyAverage,
    bestMonth,
    totalBudget,
    totalSpent,
    donutSegments,
    maxBar,

    toggleDark,
    completeOnboarding,
    dismissAlert,
    addTransaction,
    updateBudget,
    initialize,
    loadDashboard,
    loadTransactions,
    loadCategories,
    loadBudgets,
    loadAlerts,
    applyAuth,
    clearSession,
    logout,
    loadUser
  }
})
