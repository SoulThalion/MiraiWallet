import { describe, it, expect } from 'vitest'
import {
  buildRecurringPatternKey,
  parseRecurringPatternTabKey,
  recurringExpenseBaseKeyFromTransaction,
  transactionMatchesRecurringPatternKey,
  patternCategoryOverrideForTransaction,
  transactionMatchesAnySavingsPatternKey,
  type PatternCategoryOverride,
} from '../../src/services/transaction.service'

const tx = (day: number, desc = 'netflix subscription') => ({
  categoryId: 'c1',
  subcategoryId: null as string | null,
  amount: -9.99,
  description: desc,
  date: `2024-06-${String(day).padStart(2, '0')}`,
  type: 'expense' as const,
})

describe('recurringExpenseBaseKeyFromTransaction', () => {
  it('ignores calendar day', () => {
    const a = recurringExpenseBaseKeyFromTransaction(tx(14))
    const b = recurringExpenseBaseKeyFromTransaction(tx(15))
    expect(a).toBeTruthy()
    expect(a).toBe(b)
  })
})

describe('transactionMatchesRecurringPatternKey', () => {
  it('matches anchor and ±1 day', () => {
    const base = recurringExpenseBaseKeyFromTransaction(tx(15))!
    const key = buildRecurringPatternKey(base, 15)
    expect(transactionMatchesRecurringPatternKey(tx(14), key)).toBe(true)
    expect(transactionMatchesRecurringPatternKey(tx(15), key)).toBe(true)
    expect(transactionMatchesRecurringPatternKey(tx(16), key)).toBe(true)
    expect(transactionMatchesRecurringPatternKey(tx(13), key)).toBe(false)
    expect(transactionMatchesRecurringPatternKey(tx(17), key)).toBe(false)
  })

  it('anchor 31 matches day 30 in June', () => {
    const t30 = {
      categoryId: 'c1',
      subcategoryId: null as string | null,
      amount: -9.99,
      description: 'netflix subscription',
      date: '2024-06-30',
      type: 'expense' as const,
    }
    const base = recurringExpenseBaseKeyFromTransaction(t30)!
    const key = buildRecurringPatternKey(base, 31)
    expect(transactionMatchesRecurringPatternKey(t30, key)).toBe(true)
  })
})

describe('recurring day spread (detector rule)', () => {
  function groupWouldPass(days: number[]): boolean {
    if (days.length < 2) return false
    const minD = Math.min(...days)
    const maxD = Math.max(...days)
    return maxD - minD <= 2
  }
  it('rejects same-month duplicate policy via spread > 2', () => {
    expect(groupWouldPass([5, 20])).toBe(false)
  })
  it('accepts 1 and 2 as same anchor window', () => {
    expect(groupWouldPass([1, 2])).toBe(true)
  })
})

describe('parseRecurringPatternTabKey', () => {
  it('parses 5 tab segments', () => {
    const base = 'none\tnone\tnetflix subscription\t9.99'
    const p = parseRecurringPatternTabKey(`${base}\t5`)
    expect(p).toEqual({ baseKey: base, anchorDay: 5 })
    expect(parseRecurringPatternTabKey('bad')).toBeNull()
  })
})

describe('patternCategoryOverrideForTransaction', () => {
  it('resolves override by relaxed day', () => {
    const base = recurringExpenseBaseKeyFromTransaction(tx(15))!
    const storedKey = buildRecurringPatternKey(base, 14)
    const map = new Map<string, PatternCategoryOverride>([
      [storedKey, { patternKey: storedKey, categoryId: 'ov', subcategoryId: null }],
    ])
    const o = patternCategoryOverrideForTransaction(tx(15), map)
    expect(o?.categoryId).toBe('ov')
  })
})

describe('transactionMatchesAnySavingsPatternKey', () => {
  it('matches stored pattern within ±1 day', () => {
    const base = recurringExpenseBaseKeyFromTransaction(tx(15))!
    const stored = buildRecurringPatternKey(base, 15)
    const set = new Set([stored])
    expect(transactionMatchesAnySavingsPatternKey(tx(14), set)).toBe(true)
    expect(transactionMatchesAnySavingsPatternKey(tx(16), set)).toBe(true)
    expect(transactionMatchesAnySavingsPatternKey(tx(12), set)).toBe(false)
  })
})
