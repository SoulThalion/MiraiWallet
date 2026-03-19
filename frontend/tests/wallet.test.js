import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia }       from 'pinia'
import { useWalletStore }                    from '@/stores/wallet'

describe('wallet store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ── State defaults ──────────────────────────────────────
  describe('initial state', () => {
    it('starts with darkMode enabled', () => {
      const store = useWalletStore()
      expect(store.darkMode).toBe(true)
    })

    it('starts with onboarded = false', () => {
      const store = useWalletStore()
      expect(store.onboarded).toBe(false)
    })

    it('has a positive initial balance', () => {
      const store = useWalletStore()
      expect(store.balance).toBeGreaterThan(0)
    })

    it('has pre-loaded transactions', () => {
      const store = useWalletStore()
      expect(store.transactions.length).toBeGreaterThan(0)
    })

    it('has pre-loaded categories', () => {
      const store = useWalletStore()
      expect(store.categories.length).toBeGreaterThan(0)
    })

    it('has pre-loaded alerts', () => {
      const store = useWalletStore()
      expect(store.alerts.length).toBeGreaterThan(0)
    })
  })

  // ── Actions ─────────────────────────────────────────────
  describe('toggleDark()', () => {
    it('flips darkMode from true to false', () => {
      const store = useWalletStore()
      store.toggleDark()
      expect(store.darkMode).toBe(false)
    })

    it('flips darkMode back to true on second call', () => {
      const store = useWalletStore()
      store.toggleDark()
      store.toggleDark()
      expect(store.darkMode).toBe(true)
    })
  })

  describe('completeOnboarding()', () => {
    it('sets onboarded to true', () => {
      const store = useWalletStore()
      store.completeOnboarding()
      expect(store.onboarded).toBe(true)
    })
  })

  describe('dismissAlert(id)', () => {
    it('removes the alert with the given id', () => {
      const store = useWalletStore()
      const firstId = store.alerts[0].id
      store.dismissAlert(firstId)
      expect(store.alerts.find(a => a.id === firstId)).toBeUndefined()
    })

    it('keeps remaining alerts intact', () => {
      const store = useWalletStore()
      const initialCount = store.alerts.length
      store.dismissAlert(store.alerts[0].id)
      expect(store.alerts.length).toBe(initialCount - 1)
    })

    it('does nothing when id does not exist', () => {
      const store = useWalletStore()
      const initialCount = store.alerts.length
      store.dismissAlert(99999)
      expect(store.alerts.length).toBe(initialCount)
    })
  })

  describe('addTransaction(tx)', () => {
    it('prepends a new transaction to the list', () => {
      const store = useWalletStore()
      const before = store.transactions.length
      store.addTransaction({ description: 'Test', category: 'Ocio', amount: '20' })
      expect(store.transactions.length).toBe(before + 1)
      expect(store.transactions[0].name).toBe('Test')
    })

    it('deducts the amount from balance', () => {
      const store = useWalletStore()
      const before = store.balance
      store.addTransaction({ description: 'Test', category: 'Ocio', amount: '50' })
      expect(store.balance).toBeCloseTo(before - 50)
    })

    it('stores amount as a negative number', () => {
      const store = useWalletStore()
      store.addTransaction({ description: 'Test', category: 'Ocio', amount: '30' })
      expect(store.transactions[0].amount).toBe(-30)
    })
  })

  describe('updateBudget(categoryName, newBudget)', () => {
    it('updates the budget of an existing category', () => {
      const store = useWalletStore()
      store.updateBudget('Hogar', 900)
      expect(store.categories.find(c => c.name === 'Hogar').budget).toBe(900)
    })

    it('does nothing when category name does not exist', () => {
      const store = useWalletStore()
      const before = store.categories.map(c => c.budget).join(',')
      store.updateBudget('Fantasma', 999)
      const after = store.categories.map(c => c.budget).join(',')
      expect(after).toBe(before)
    })
  })

  // ── Computed ─────────────────────────────────────────────
  describe('computed: totalIncome', () => {
    it('sums only positive transactions', () => {
      const store = useWalletStore()
      const manual = store.transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
      expect(store.totalIncome).toBeCloseTo(manual)
    })
  })

  describe('computed: totalExpenses', () => {
    it('returns a positive number for negative transactions', () => {
      const store = useWalletStore()
      expect(store.totalExpenses).toBeGreaterThan(0)
    })
  })

  describe('computed: saved', () => {
    it('equals income minus expenses', () => {
      const store = useWalletStore()
      expect(store.saved).toBeCloseTo(store.totalIncome - store.totalExpenses)
    })
  })

  describe('computed: monthlyAverage', () => {
    it('is a rounded integer', () => {
      const store = useWalletStore()
      expect(Number.isInteger(store.monthlyAverage)).toBe(true)
    })

    it('is between min and max monthly amounts', () => {
      const store = useWalletStore()
      const amounts = store.monthlyData.map(m => m.amount)
      expect(store.monthlyAverage).toBeGreaterThanOrEqual(Math.min(...amounts))
      expect(store.monthlyAverage).toBeLessThanOrEqual(Math.max(...amounts))
    })
  })

  describe('computed: bestMonth', () => {
    it('has the lowest spending amount', () => {
      const store = useWalletStore()
      const minAmount = Math.min(...store.monthlyData.map(m => m.amount))
      expect(store.bestMonth.amount).toBe(minAmount)
    })
  })

  describe('computed: totalBudget', () => {
    it('equals sum of all category budgets', () => {
      const store = useWalletStore()
      const manual = store.categories.reduce((s, c) => s + c.budget, 0)
      expect(store.totalBudget).toBe(manual)
    })
  })

  describe('computed: totalSpent', () => {
    it('equals sum of all category spent values', () => {
      const store = useWalletStore()
      const manual = store.categories.reduce((s, c) => s + c.spent, 0)
      expect(store.totalSpent).toBe(manual)
    })
  })

  describe('computed: maxBar', () => {
    it('equals the highest monthly amount', () => {
      const store = useWalletStore()
      const max = Math.max(...store.monthlyData.map(m => m.amount))
      expect(store.maxBar).toBe(max)
    })
  })

  describe('computed: donutSegments', () => {
    it('returns one segment per category', () => {
      const store = useWalletStore()
      expect(store.donutSegments.length).toBe(store.categories.length)
    })

    it('percentages sum to ~100', () => {
      const store = useWalletStore()
      const total = store.donutSegments.reduce((s, seg) => s + seg.pct, 0)
      // Allow ±2 for rounding
      expect(total).toBeGreaterThanOrEqual(98)
      expect(total).toBeLessThanOrEqual(102)
    })

    it('each segment has required fields', () => {
      const store = useWalletStore()
      store.donutSegments.forEach(seg => {
        expect(seg).toHaveProperty('name')
        expect(seg).toHaveProperty('color')
        expect(seg).toHaveProperty('pct')
        expect(seg).toHaveProperty('dash')
        expect(seg).toHaveProperty('offset')
      })
    })
  })
})
