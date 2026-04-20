import type { BudgetPaceStatus } from '@/services/api'

type PaceScope = 'budgets' | 'stats'
type TranslateFn = (key: string, params?: Record<string, unknown>) => string

export function paceStatusClass(status: BudgetPaceStatus | string): string {
  if (status === 'critical') return 'text-red-500'
  if (status === 'risk') return 'text-orange-500'
  if (status === 'warn') return 'text-amber-500'
  return 'text-brand-green'
}

export function paceStatusLabel(
  t: TranslateFn,
  scope: PaceScope,
  status: BudgetPaceStatus | string,
  pacePct?: number | string,
  actualSpent?: number,
  expectedSpent?: number
): string {
  const real = Number(actualSpent)
  const expected = Number(expectedSpent)
  if (Number.isFinite(real) && Number.isFinite(expected) && expected > 0 && real < expected) {
    return t(`${scope}.paceStatusGood`)
  }

  const raw = typeof pacePct === 'string' ? pacePct.replace(',', '.').trim() : pacePct
  const numericPct = typeof raw === 'number' ? raw : Number(raw)
  if (Number.isFinite(numericPct) && numericPct < 0) return t(`${scope}.paceStatusGood`)
  if (status === 'critical') return t(`${scope}.paceStatusCritical`)
  if (status === 'risk') return t(`${scope}.paceStatusRisk`)
  if (status === 'warn') return t(`${scope}.paceStatusWarn`)
  return t(`${scope}.paceStatusOk`)
}

export function paceSimpleText(
  t: TranslateFn,
  scope: PaceScope,
  actualSpent?: number,
  expectedSpent?: number
): string {
  const actual = Number(actualSpent)
  const expected = Number(expectedSpent)
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || expected <= 0) {
    return t(`${scope}.paceSimpleOnTrack`)
  }
  const pct = Math.abs(((actual - expected) / expected) * 100).toFixed(1)
  if (actual > expected) return t(`${scope}.paceSimpleAbove`, { pct })
  if (actual < expected) return t(`${scope}.paceSimpleBelow`, { pct })
  return t(`${scope}.paceSimpleOnTrack`)
}
