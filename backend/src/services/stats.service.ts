import { Op } from 'sequelize'
import { randomUUID } from 'crypto'
import { Account, Budget, Category, RecurringPatternDismissal, Subcategory, SubcategoryBudget, Transaction, User } from '../models'
import * as accountService     from './account.service'
import * as transactionService from './transaction.service'
import * as budgetService from './budget.service'
import type {
  PlannedCommitmentCadence,
  PlannedCommitmentDto,
  RecurringManualRuleDto,
  StatsForecastSimulateDto,
  StatsMonthOverviewDto,
  StatsRecurringDueItemDto,
  StatsRecurringExpenseDto,
  StatsRecurringManualMatchDto,
  StatsRecurringMissedDto,
} from '../types'
import { dateToFiscalYm, getMonthCycleConfigForUser, toDateOnlyString, ymToDateBounds, type MonthCycleConfig } from '../utils/monthPeriod'
import { ApiError } from '../utils/ApiError'
import { ERROR_CODES } from '../errors/error-codes'

function isYm(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s)
}

const MONTH_LABEL_ES: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
}

function monthLabelEs(mm: string): string {
  return MONTH_LABEL_ES[mm] ?? mm
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

async function defaultFiscalYmForUser(userId: string): Promise<string> {
  const cfg = await getMonthCycleConfigForUser(userId)
  const d = new Date()
  const ymd = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  return dateToFiscalYm(ymd, cfg) || `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

const RECURRING_LOOKBACK_MONTHS = 36
/** Los más recientes primero: si hay muchos movimientos, los patrones actuales (Netflix, etc.) no deben quedar fuera. */
const RECURRING_MAX_TX = 20000
/** Tope de patrones devueltos (tras filtros). Subir con cuidado por tamaño de respuesta; antes 60 ocultaba detectados válidos. */
const RECURRING_MAX_RESULTS = 400

function calendarYmFromDateOnly(dateVal: unknown): string {
  const ymd = toDateOnlyString(dateVal)
  return ymd.length >= 7 ? ymd.slice(0, 7) : ''
}

/** Mes usado para «≥2 meses distintos» y duplicados en el mismo periodo: alineado al ciclo fiscal del usuario si no es calendario natural. */
function recurringDetectorMonthYm(dateVal: unknown, cfg: MonthCycleConfig): string {
  const ymd = toDateOnlyString(dateVal)
  if (!ymd || ymd.length < 7) return ''
  if (cfg.mode === 'calendar') return ymd.slice(0, 7)
  const f = dateToFiscalYm(dateVal, cfg)
  return f && /^\d{4}-(0[1-9]|1[0-2])$/.test(f) ? f : ymd.slice(0, 7)
}

function dayOfMonthFromDateOnly(dateVal: unknown): number {
  const ymd = toDateOnlyString(dateVal)
  const br = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!br) return 0
  return parseInt(br[3]!, 10)
}

/** Agrupa automáticos por concepto/importe sin día (margen ±1 día se aplica después). */
function recurringExpenseBaseGroupKey(tx: Transaction): string | null {
  return transactionService.recurringExpenseBaseKeyFromTransaction(tx)
}

function normalizeConcept(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function parseManualRules(raw: unknown): RecurringManualRuleDto[] {
  if (!Array.isArray(raw)) return []
  const out: RecurringManualRuleDto[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = String(row.id ?? '').trim()
    const conceptPattern = String(row.conceptPattern ?? '').trim()
    const fromDay = Number(row.fromDay)
    const toDay = Number(row.toDay)
    const minAmount = row.minAmount == null ? null : Number(row.minAmount)
    const maxAmount = row.maxAmount == null ? null : Number(row.maxAmount)
    const categoryId = String(row.categoryId ?? '').trim()
    const subcategoryId = row.subcategoryId == null ? null : String(row.subcategoryId).trim()
    if (!id || !conceptPattern || !categoryId) continue
    if (!Number.isFinite(fromDay) || !Number.isFinite(toDay)) continue
    if (fromDay < 1 || fromDay > 31 || toDay < 1 || toDay > 31) continue
    if (minAmount == null && maxAmount == null) continue
    if (minAmount != null && (!Number.isFinite(minAmount) || minAmount < 0)) continue
    if (maxAmount != null && (!Number.isFinite(maxAmount) || maxAmount < 0)) continue
    if (minAmount != null && maxAmount != null && minAmount > maxAmount) continue
    out.push({
      id,
      conceptPattern,
      fromDay,
      toDay,
      minAmount,
      maxAmount,
      categoryId,
      subcategoryId: subcategoryId || null,
    })
  }
  return out
}

function matchesDayRange(day: number, fromDay: number, toDay: number): boolean {
  if (fromDay <= toDay) return day >= fromDay && day <= toDay
  return day >= fromDay || day <= toDay
}

function txMatchesManualRule(tx: Transaction, rule: RecurringManualRuleDto): boolean {
  const txDesc = normalizeConcept(String(tx.description ?? ''))
  if (!txDesc || !txDesc.includes(normalizeConcept(rule.conceptPattern))) return false
  const day = dayOfMonthFromDateOnly(tx.date)
  if (!matchesDayRange(day, rule.fromDay, rule.toDay)) return false
  const amount = Math.abs(Number(tx.amount))
  if (!Number.isFinite(amount) || amount <= 0) return false
  if (rule.minAmount != null && amount < rule.minAmount) return false
  if (rule.maxAmount != null && amount > rule.maxAmount) return false
  return true
}

/**
 * Agrupa gastos con la misma categoría, subcategoría, concepto (insensible a mayúsculas y espacios),
 * importe y día del mes; solo incluye grupos con ≥2 apariciones en ≥2 meses naturales distintos.
 */
function calendarYmToday(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

/**
 * Mejor mes (mínimo importe mensual del tipo) en ventana móvil:
 * - Solo meses con movimiento del tipo (>0)
 * - Últimos 12 meses con datos hasta `anchorYm`
 * - Excluye siempre el mes fiscal actual (incompleto)
 */
async function bestMonthRolling(
  userId: string,
  anchorYm: string,
  monthCycleCfg: Awaited<ReturnType<typeof getMonthCycleConfigForUser>>,
  kind: 'expense' | 'income',
): Promise<{ label: string; amount: number }> {
  const nowYmd = toDateOnlyString(new Date())
  const currentFiscalYm = dateToFiscalYm(nowYmd, monthCycleCfg)
  const anchor = /^\d{4}-(0[1-9]|1[0-2])$/.test(anchorYm) ? anchorYm : (currentFiscalYm ?? anchorYm)
  const { to: toAnchor } = ymToDateBounds(anchor, monthCycleCfg)
  const fromProbe = ymToDateBounds(`${String(parseInt(anchor.slice(0, 4), 10) - 4)}-01`, monthCycleCfg).from

  const txs = await Transaction.findAll({
    where: {
      userId,
      isExcluded: false,
      type: kind,
      date: { [Op.between]: [fromProbe, toAnchor] },
    },
    attributes: ['date', 'amount'],
  })

  const byYm = new Map<string, number>()
  for (const tx of txs) {
    const ym = dateToFiscalYm(tx.date, monthCycleCfg)
    if (!ym || ym > anchor) continue
    if (currentFiscalYm && ym === currentFiscalYm) continue
    const amt = Number(tx.amount)
    if (!Number.isFinite(amt) || amt <= 0) continue
    byYm.set(ym, roundMoney2((byYm.get(ym) ?? 0) + amt))
  }

  const windowYms = [...byYm.keys()].sort((a, b) => b.localeCompare(a)).slice(0, 12)
  if (windowYms.length === 0) return { label: '—', amount: 0 }

  /**
   * Si el mes más antiguo de la ventana es el mes en que empezó la actividad del usuario
   * y ese primer movimiento cayó después del inicio del periodo fiscal, lo tratamos como
   * mes parcial de arranque y lo excluimos para el KPI de mínimo mensual.
   */
  const firstTx = await Transaction.findOne({
    where: { userId, isExcluded: false, type: kind },
    attributes: ['date'],
    order: [['date', 'ASC']],
  })
  let candidateYms = [...windowYms]
  if (firstTx) {
    const firstYmd = toDateOnlyString(firstTx.date)
    const firstYm = dateToFiscalYm(firstYmd, monthCycleCfg)
    const oldestYm = candidateYms[candidateYms.length - 1]
    if (firstYm && oldestYm && firstYm === oldestYm) {
      try {
        const { from } = ymToDateBounds(oldestYm, monthCycleCfg)
        if (firstYmd > from) {
          candidateYms = candidateYms.filter(ym => ym !== oldestYm)
        }
      } catch {
        // Si el periodo no es válido por algún motivo, mantenemos el comportamiento base.
      }
    }
  }
  if (candidateYms.length === 0) return { label: '—', amount: 0 }

  let bestYm = candidateYms[0]!
  let bestAmount = byYm.get(bestYm) ?? 0
  for (const ym of candidateYms.slice(1)) {
    const amt = byYm.get(ym) ?? 0
    if (amt < bestAmount || (amt === bestAmount && ym < bestYm)) {
      bestYm = ym
      bestAmount = amt
    }
  }

  const [y, mm] = bestYm.split('-')
  return { label: `${monthLabelEs(mm)} ${y}`, amount: roundMoney2(bestAmount) }
}

export async function findRecurringExpensePatterns(userId: string): Promise<StatsRecurringExpenseDto[]> {
  const [user, monthCycleCfg] = await Promise.all([
    User.findByPk(userId, {
      attributes: [
        'id',
        'recurringExcludedCategoryIds',
        'recurringExcludedSubcategoryIds',
        'recurringSavingsPatternKeys',
        'recurringSavingsCategoryIds',
        'recurringSavingsSubcategoryIds',
        'recurringPatternCategoryOverrides',
      ],
    }),
    getMonthCycleConfigForUser(userId),
  ])
  const rawExcludedCat = user?.recurringExcludedCategoryIds as unknown
  const excludedCategorySet = new Set<string>(
    Array.isArray(rawExcludedCat) ? rawExcludedCat.map(x => String(x)).filter(Boolean) : [],
  )
  const rawExcludedSub = user?.recurringExcludedSubcategoryIds as unknown
  const excludedSubcategorySet = new Set<string>(
    Array.isArray(rawExcludedSub) ? rawExcludedSub.map(x => String(x)).filter(Boolean) : [],
  )
  const rawSavingsPatterns = user?.recurringSavingsPatternKeys as unknown
  const savingsPatternSet = new Set<string>(
    Array.isArray(rawSavingsPatterns) ? rawSavingsPatterns.map(x => String(x)).filter(Boolean) : [],
  )
  const rawSavingsCategoryIds = user?.recurringSavingsCategoryIds as unknown
  const savingsCategorySet = new Set<string>(
    Array.isArray(rawSavingsCategoryIds) ? rawSavingsCategoryIds.map(x => String(x)).filter(Boolean) : [],
  )
  const rawSavingsSubcategoryIds = user?.recurringSavingsSubcategoryIds as unknown
  const savingsSubcategorySet = new Set<string>(
    Array.isArray(rawSavingsSubcategoryIds) ? rawSavingsSubcategoryIds.map(x => String(x)).filter(Boolean) : [],
  )
  const overrideMap = transactionService.buildPatternCategoryOverrideMap(user?.recurringPatternCategoryOverrides as unknown)
  const [allCategories, allSubcategories] = await Promise.all([
    Category.findAll({ where: { userId }, attributes: ['id', 'name', 'icon', 'color'] }),
    Subcategory.findAll({ where: { userId }, attributes: ['id', 'name', 'icon', 'color', 'categoryId'] }),
  ])
  const catById = new Map(allCategories.map(c => [c.id, c]))
  const subById = new Map(allSubcategories.map(s => [s.id, s]))

  const dismissRows = await RecurringPatternDismissal.findAll({
    where: { userId },
    attributes: ['patternKey', 'dismissedYm'],
  })
  const dismissalMap = new Map(dismissRows.map(r => [r.patternKey, r.dismissedYm]))

  const since = new Date()
  since.setMonth(since.getMonth() - RECURRING_LOOKBACK_MONTHS)
  const fromYmd = `${since.getFullYear()}-${pad2(since.getMonth() + 1)}-${pad2(since.getDate())}`

  const txs = await Transaction.findAll({
    where: { userId, isExcluded: false, type: { [Op.in]: ['expense', 'transfer'] }, date: { [Op.gte]: fromYmd } },
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false },
      { model: Subcategory, as: 'subcategory', attributes: ['id', 'name'], required: false },
    ],
    order: [['date', 'DESC']],
    limit: RECURRING_MAX_TX,
  })

  type Acc = { txs: Transaction[]; months: Set<string> }
  const groups = new Map<string, Acc>()

  for (const tx of txs) {
    if (tx.categoryId && excludedCategorySet.has(tx.categoryId)) continue
    if (tx.subcategoryId && excludedSubcategorySet.has(tx.subcategoryId)) continue
    const key = recurringExpenseBaseGroupKey(tx)
    if (!key) continue
    const ym = recurringDetectorMonthYm(tx.date, monthCycleCfg)
    if (!/^\d{4}-\d{2}$/.test(ym)) continue
    const acc = groups.get(key) ?? { txs: [], months: new Set() }
    acc.txs.push(tx)
    acc.months.add(ym)
    groups.set(key, acc)
  }

  const resolveOverrideForPattern = (patternKey: string, baseKey: string, anchorDay: number) => {
    let override = overrideMap.get(patternKey)
    if (override) return override
    for (const o of overrideMap.values()) {
      const p = transactionService.parseRecurringPatternTabKey(o.patternKey)
      if (p && p.baseKey === baseKey && Math.abs(p.anchorDay - anchorDay) <= 1) return o
    }
    return undefined
  }

  const out: StatsRecurringExpenseDto[] = []
  for (const [baseKey, acc] of groups) {
    if (acc.txs.length < 2 || acc.months.size < 2) continue

    const byYm = new Map<string, Transaction[]>()
    for (const t of acc.txs) {
      const ym = recurringDetectorMonthYm(t.date, monthCycleCfg)
      if (!/^\d{4}-\d{2}$/.test(ym)) continue
      const arr = byYm.get(ym) ?? []
      arr.push(t)
      byYm.set(ym, arr)
    }
    let skipMultiSameMonth = false
    for (const arr of byYm.values()) {
      if (arr.length > 1) {
        skipMultiSameMonth = true
        break
      }
    }
    if (skipMultiSameMonth) continue

    const ymsSorted = [...byYm.keys()].sort()
    const dayList = ymsSorted.map((ym) => dayOfMonthFromDateOnly(byYm.get(ym)![0]!.date))
    const minD = Math.min(...dayList)
    const maxD = Math.max(...dayList)
    if (maxD - minD > 2) continue

    const sortedDays = [...dayList].sort((a, b) => a - b)
    const mid = Math.floor(sortedDays.length / 2)
    const anchorDayRaw = sortedDays.length % 2 === 1
      ? sortedDays[mid]!
      : Math.round((sortedDays[mid - 1]! + sortedDays[mid]!) / 2)
    const anchorDay = Math.min(31, Math.max(1, anchorDayRaw))
    const patternKey = transactionService.buildRecurringPatternKey(baseKey, anchorDay)

    const sorted = [...acc.txs].sort((a, b) =>
      toDateOnlyString(a.date).localeCompare(toDateOnlyString(b.date)),
    )
    const first = sorted[0]!
    const dates = sorted.map(t => toDateOnlyString(t.date))
    const firstDate = dates[0]!
    const lastDate = dates[dates.length - 1]!

    const override = resolveOverrideForPattern(patternKey, baseKey, anchorDay)
    const effectiveCat = override?.categoryId ? catById.get(override.categoryId) : null
    const effectiveSub = override?.subcategoryId ? subById.get(override.subcategoryId) : null
    const effectiveCatFromSub = effectiveSub ? catById.get(effectiveSub.categoryId) : null
    const categoryId = effectiveCatFromSub?.id ?? effectiveCat?.id ?? first.categoryId ?? null
    const subcategoryId = effectiveSub?.id ?? (override && !override.subcategoryId ? null : (first.subcategoryId ?? null))
    const categoryName = effectiveCatFromSub?.name ?? effectiveCat?.name ?? first.category?.name ?? 'Sin categoría'
    const categoryIcon = effectiveCatFromSub?.icon ?? effectiveCat?.icon ?? first.category?.icon ?? '💸'
    const categoryColor = effectiveCatFromSub?.color ?? effectiveCat?.color ?? first.category?.color ?? '#888'
    const subcategoryName = effectiveSub?.name ?? (
      subcategoryId ? (first.subcategory?.name ?? null) : null
    )
    const isSavingsPattern =
      savingsPatternSet.has(patternKey)
      || [...savingsPatternSet].some((k) => transactionService.transactionMatchesRecurringPatternKey(first, k))
    out.push({
      categoryId,
      subcategoryId,
      categoryName,
      subcategoryName,
      categoryIcon,
      categoryColor,
      description:      first.description.trim().replace(/\s+/g, ' '),
      amount:           roundMoney2(Math.abs(Number(first.amount))),
      dayOfMonth:       anchorDay,
      occurrenceCount:  acc.txs.length,
      distinctMonthCount: acc.months.size,
      firstDate,
      lastDate,
      patternKey,
      isSavings:
        isSavingsPattern
        || (first.subcategoryId ? savingsSubcategorySet.has(first.subcategoryId) : false)
        || (first.categoryId ? savingsCategorySet.has(first.categoryId) : false),
    })
  }

  const findDismissState = (row: StatsRecurringExpenseDto): { dismissYm: string | undefined; keysToClear: string[] } => {
    const keysToClear: string[] = []
    let dismissYm = dismissalMap.get(row.patternKey)
    if (dismissYm) keysToClear.push(row.patternKey)
    else {
      const rp = transactionService.parseRecurringPatternTabKey(row.patternKey)
      if (rp) {
        for (const [dKey, ym] of dismissalMap) {
          const dp = transactionService.parseRecurringPatternTabKey(dKey)
          if (dp && dp.baseKey === rp.baseKey) {
            dismissYm = ym
            keysToClear.push(dKey)
            break
          }
        }
      }
    }
    return { dismissYm, keysToClear }
  }

  const keysToClearDismissal: string[] = []
  const visible: StatsRecurringExpenseDto[] = []
  for (const row of out) {
    const { dismissYm, keysToClear } = findDismissState(row)
    const lastYm = row.lastDate.slice(0, 7)
    if (dismissYm) {
      if (lastYm > dismissYm) {
        keysToClearDismissal.push(...keysToClear)
        if (keysToClear.length === 0) keysToClearDismissal.push(row.patternKey)
        visible.push(row)
      }
    } else {
      visible.push(row)
    }
  }

  if (keysToClearDismissal.length > 0) {
    await RecurringPatternDismissal.destroy({
      where: { userId, patternKey: { [Op.in]: [...new Set(keysToClearDismissal)] } },
    })
  }

  visible.sort((a, b) => {
    if (b.distinctMonthCount !== a.distinctMonthCount) return b.distinctMonthCount - a.distinctMonthCount
    if (b.occurrenceCount !== a.occurrenceCount) return b.occurrenceCount - a.occurrenceCount
    return a.description.localeCompare(b.description)
  })

  return visible.slice(0, RECURRING_MAX_RESULTS)
}

async function findRecurringManualMatches(userId: string): Promise<StatsRecurringManualMatchDto[]> {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'recurringManualRules'],
  })
  const rules = parseManualRules(user?.recurringManualRules as unknown)
  if (!rules.length) return []

  const since = new Date()
  since.setMonth(since.getMonth() - RECURRING_LOOKBACK_MONTHS)
  const fromYmd = `${since.getFullYear()}-${pad2(since.getMonth() + 1)}-${pad2(since.getDate())}`
  const txs = await Transaction.findAll({
    where: { userId, isExcluded: false, type: { [Op.in]: ['expense', 'transfer'] }, date: { [Op.gte]: fromYmd } },
    order: [['date', 'DESC']],
    limit: RECURRING_MAX_TX,
  })

  const [allCategories, allSubcategories] = await Promise.all([
    Category.findAll({ where: { userId }, attributes: ['id', 'name', 'icon', 'color'] }),
    Subcategory.findAll({ where: { userId }, attributes: ['id', 'name', 'categoryId'] }),
  ])
  const catById = new Map(allCategories.map(c => [c.id, c]))
  const subById = new Map(allSubcategories.map(s => [s.id, s]))

  const out: StatsRecurringManualMatchDto[] = []
  for (const rule of rules) {
    const cat = catById.get(rule.categoryId)
    if (!cat) continue
    const sub = rule.subcategoryId ? subById.get(rule.subcategoryId) : null
    if (rule.subcategoryId && (!sub || sub.categoryId !== cat.id)) continue
    const matches = txs.filter((tx) => txMatchesManualRule(tx, rule))
    if (!matches.length) continue
    const sorted = [...matches].sort((a, b) => toDateOnlyString(a.date).localeCompare(toDateOnlyString(b.date)))
    const first = sorted[0]!
    const last = sorted[sorted.length - 1]!
    out.push({
      ruleId: rule.id,
      conceptPattern: rule.conceptPattern,
      categoryId: cat.id,
      subcategoryId: sub?.id ?? null,
      categoryName: cat.name,
      subcategoryName: sub?.name ?? null,
      categoryIcon: cat.icon,
      categoryColor: cat.color,
      fromDay: rule.fromDay,
      toDay: rule.toDay,
      minAmount: rule.minAmount,
      maxAmount: rule.maxAmount,
      sampleDescription: String(last.description ?? '').trim(),
      latestAmount: roundMoney2(Math.abs(Number(last.amount))),
      matchCount: matches.length,
      firstDate: toDateOnlyString(first.date),
      lastDate: toDateOnlyString(last.date),
    })
  }
  out.sort((a, b) => b.matchCount - a.matchCount || b.lastDate.localeCompare(a.lastDate))
  return out.slice(0, RECURRING_MAX_RESULTS)
}

export async function listRecurringManualRules(userId: string): Promise<RecurringManualRuleDto[]> {
  const user = await User.findByPk(userId, { attributes: ['id', 'recurringManualRules'] })
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')
  return parseManualRules(user.recurringManualRules as unknown)
}

export async function createRecurringManualRule(
  userId: string,
  payload: Partial<RecurringManualRuleDto>,
): Promise<RecurringManualRuleDto> {
  const user = await User.findByPk(userId, { attributes: ['id', 'recurringManualRules'] })
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')

  const next: RecurringManualRuleDto = {
    id: randomUUID(),
    conceptPattern: String(payload.conceptPattern ?? '').trim(),
    fromDay: Number(payload.fromDay),
    toDay: Number(payload.toDay),
    minAmount: payload.minAmount == null ? null : Number(payload.minAmount),
    maxAmount: payload.maxAmount == null ? null : Number(payload.maxAmount),
    categoryId: String(payload.categoryId ?? '').trim(),
    subcategoryId: payload.subcategoryId ? String(payload.subcategoryId).trim() : null,
  }
  const parsed = parseManualRules([next])[0]
  if (!parsed) throw ApiError.badRequest(ERROR_CODES.VALIDATION_FAILED, 'Regla manual inválida')

  const cat = await Category.findOne({ where: { id: parsed.categoryId, userId }, attributes: ['id'] })
  if (!cat) throw ApiError.badRequest(ERROR_CODES.CATEGORY_NOT_FOUND, 'Categoría inválida')
  if (parsed.subcategoryId) {
    const sub = await Subcategory.findOne({ where: { id: parsed.subcategoryId, userId }, attributes: ['id', 'categoryId'] })
    if (!sub || sub.categoryId !== parsed.categoryId) {
      throw ApiError.badRequest(ERROR_CODES.CATEGORY_NOT_FOUND, 'Subcategoría inválida para la categoría seleccionada')
    }
  }
  const all = parseManualRules(user.recurringManualRules as unknown)
  all.push(parsed)
  await user.update({ recurringManualRules: all })
  return parsed
}

export async function updateRecurringManualRule(
  userId: string,
  ruleIdRaw: string,
  payload: Partial<RecurringManualRuleDto>,
): Promise<RecurringManualRuleDto> {
  const ruleId = String(ruleIdRaw ?? '').trim()
  if (!ruleId) throw ApiError.badRequest(ERROR_CODES.VALIDATION_FAILED, 'ruleId inválido')
  const user = await User.findByPk(userId, { attributes: ['id', 'recurringManualRules'] })
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')
  const all = parseManualRules(user.recurringManualRules as unknown)
  const idx = all.findIndex((r) => r.id === ruleId)
  if (idx < 0) throw ApiError.notFound(ERROR_CODES.VALIDATION_FAILED, 'Regla manual no encontrada')
  const current = all[idx]!
  const merged: RecurringManualRuleDto = {
    ...current,
    ...payload,
    id: current.id,
    conceptPattern: payload.conceptPattern != null ? String(payload.conceptPattern).trim() : current.conceptPattern,
    categoryId: payload.categoryId != null ? String(payload.categoryId).trim() : current.categoryId,
    subcategoryId: payload.subcategoryId === undefined
      ? current.subcategoryId
      : (payload.subcategoryId ? String(payload.subcategoryId).trim() : null),
    fromDay: payload.fromDay == null ? current.fromDay : Number(payload.fromDay),
    toDay: payload.toDay == null ? current.toDay : Number(payload.toDay),
    minAmount: payload.minAmount === undefined ? current.minAmount : (payload.minAmount == null ? null : Number(payload.minAmount)),
    maxAmount: payload.maxAmount === undefined ? current.maxAmount : (payload.maxAmount == null ? null : Number(payload.maxAmount)),
  }
  const parsed = parseManualRules([merged])[0]
  if (!parsed) throw ApiError.badRequest(ERROR_CODES.VALIDATION_FAILED, 'Regla manual inválida')
  const cat = await Category.findOne({ where: { id: parsed.categoryId, userId }, attributes: ['id'] })
  if (!cat) throw ApiError.badRequest(ERROR_CODES.CATEGORY_NOT_FOUND, 'Categoría inválida')
  if (parsed.subcategoryId) {
    const sub = await Subcategory.findOne({ where: { id: parsed.subcategoryId, userId }, attributes: ['id', 'categoryId'] })
    if (!sub || sub.categoryId !== parsed.categoryId) {
      throw ApiError.badRequest(ERROR_CODES.CATEGORY_NOT_FOUND, 'Subcategoría inválida para la categoría seleccionada')
    }
  }
  all[idx] = parsed
  await user.update({ recurringManualRules: all })
  return parsed
}

export async function deleteRecurringManualRule(userId: string, ruleIdRaw: string): Promise<void> {
  const ruleId = String(ruleIdRaw ?? '').trim()
  if (!ruleId) throw ApiError.badRequest(ERROR_CODES.VALIDATION_FAILED, 'ruleId inválido')
  const user = await User.findByPk(userId, { attributes: ['id', 'recurringManualRules'] })
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')
  const all = parseManualRules(user.recurringManualRules as unknown)
  const next = all.filter((r) => r.id !== ruleId)
  if (next.length === all.length) throw ApiError.notFound(ERROR_CODES.VALIDATION_FAILED, 'Regla manual no encontrada')
  await user.update({ recurringManualRules: next })
}

const CADENCES: PlannedCommitmentCadence[] = ['monthly', 'quarterly', 'semiannual', 'annual']

function parsePlannedCommitments(raw: unknown): PlannedCommitmentDto[] {
  if (!Array.isArray(raw)) return []
  const out: PlannedCommitmentDto[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = String(row.id ?? '').trim()
    const label = String(row.label ?? '').trim()
    const amount = Number(row.amount)
    const kind = String(row.kind ?? '') as PlannedCommitmentDto['kind']
    if (!id || !label || !Number.isFinite(amount) || amount < 0) continue
    if (kind !== 'one_shot' && kind !== 'recurring') continue
    const categoryId = row.categoryId == null ? null : String(row.categoryId).trim()
    const subcategoryId = row.subcategoryId == null ? null : String(row.subcategoryId).trim()
    if (kind === 'one_shot') {
      const dueYm = String(row.dueYm ?? '').trim()
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(dueYm)) continue
      const dueDay = row.dueDay == null ? null : Number(row.dueDay)
      if (dueDay != null && (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31)) continue
      out.push({
        id, label, amount, categoryId: categoryId || null, subcategoryId: subcategoryId || null,
        kind: 'one_shot', dueYm, dueDay,
      })
      continue
    }
    const cadence = String(row.cadence ?? '') as PlannedCommitmentCadence
    if (!CADENCES.includes(cadence) || cadence === 'monthly') continue
    const anchorYm = row.anchorYm == null ? null : String(row.anchorYm).trim()
    if (anchorYm && !/^\d{4}-(0[1-9]|1[0-2])$/.test(anchorYm)) continue
    const anchorDay = row.anchorDay == null ? null : Number(row.anchorDay)
    if (anchorDay != null && (!Number.isFinite(anchorDay) || anchorDay < 1 || anchorDay > 31)) continue
    out.push({
      id, label, amount, categoryId: categoryId || null, subcategoryId: subcategoryId || null,
      kind: 'recurring', cadence, anchorYm: anchorYm || null, anchorDay,
    })
  }
  return out
}

export async function listPlannedCommitments(userId: string): Promise<PlannedCommitmentDto[]> {
  const user = await User.findByPk(userId, { attributes: ['id', 'plannedCommitments'] })
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')
  return parsePlannedCommitments(user.plannedCommitments as unknown)
}

export async function createPlannedCommitment(userId: string, payload: Partial<PlannedCommitmentDto>): Promise<PlannedCommitmentDto> {
  const user = await User.findByPk(userId, { attributes: ['id', 'plannedCommitments'] })
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')
  const next: PlannedCommitmentDto = {
    id: randomUUID(),
    label: String(payload.label ?? '').trim(),
    amount: Number(payload.amount),
    categoryId: payload.categoryId ? String(payload.categoryId).trim() : null,
    subcategoryId: payload.subcategoryId ? String(payload.subcategoryId).trim() : null,
    kind: (payload.kind === 'recurring' ? 'recurring' : 'one_shot'),
    dueYm: payload.dueYm ? String(payload.dueYm).trim() : null,
    dueDay: payload.dueDay == null ? null : Number(payload.dueDay),
    cadence: payload.cadence ?? null,
    anchorYm: payload.anchorYm ? String(payload.anchorYm).trim() : null,
    anchorDay: payload.anchorDay == null ? null : Number(payload.anchorDay),
  }
  const parsed = parsePlannedCommitments([{ ...next } as Record<string, unknown>])[0]
  if (!parsed) throw ApiError.badRequest(ERROR_CODES.VALIDATION_FAILED, 'Compromiso planificado inválido')
  const all = parsePlannedCommitments(user.plannedCommitments as unknown)
  all.push(parsed)
  await user.update({ plannedCommitments: all as unknown as User['plannedCommitments'] })
  return parsed
}

export async function updatePlannedCommitment(
  userId: string,
  idRaw: string,
  payload: Partial<PlannedCommitmentDto>,
): Promise<PlannedCommitmentDto> {
  const cid = String(idRaw ?? '').trim()
  if (!cid) throw ApiError.badRequest(ERROR_CODES.VALIDATION_FAILED, 'id inválido')
  const user = await User.findByPk(userId, { attributes: ['id', 'plannedCommitments'] })
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')
  const all = parsePlannedCommitments(user.plannedCommitments as unknown)
  const idx = all.findIndex((c) => c.id === cid)
  if (idx < 0) throw ApiError.notFound(ERROR_CODES.VALIDATION_FAILED, 'Compromiso no encontrado')
  const cur = all[idx]!
  const merged: PlannedCommitmentDto = {
    ...cur,
    ...payload,
    id: cur.id,
    label: payload.label != null ? String(payload.label).trim() : cur.label,
    amount: payload.amount == null ? cur.amount : Number(payload.amount),
  }
  const parsed = parsePlannedCommitments([merged as unknown as Record<string, unknown>])[0]
  if (!parsed) throw ApiError.badRequest(ERROR_CODES.VALIDATION_FAILED, 'Compromiso planificado inválido')
  all[idx] = parsed
  await user.update({ plannedCommitments: all as unknown as User['plannedCommitments'] })
  return parsed
}

export async function deletePlannedCommitment(userId: string, idRaw: string): Promise<void> {
  const cid = String(idRaw ?? '').trim()
  if (!cid) throw ApiError.badRequest(ERROR_CODES.VALIDATION_FAILED, 'id inválido')
  const user = await User.findByPk(userId, { attributes: ['id', 'plannedCommitments'] })
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')
  const all = parsePlannedCommitments(user.plannedCommitments as unknown)
  const next = all.filter((c) => c.id !== cid)
  if (next.length === all.length) throw ApiError.notFound(ERROR_CODES.VALIDATION_FAILED, 'Compromiso no encontrado')
  await user.update({ plannedCommitments: next as unknown as User['plannedCommitments'] })
}

function calendarDaysInMonth(ym: string): number {
  const m = /^(\d{4})-(\d{2})$/.exec(ym)
  if (!m) return 31
  const y = parseInt(m[1]!, 10)
  const mo = parseInt(m[2]!, 10)
  return new Date(y, mo, 0).getDate()
}

function buildRecurringDueCalendar(
  month: string,
  recurringExpenses: StatsRecurringExpenseDto[],
  manualRules: RecurringManualRuleDto[],
  planned: PlannedCommitmentDto[],
): StatsRecurringDueItemDto[] {
  const dim = calendarDaysInMonth(month)
  const out: StatsRecurringDueItemDto[] = []
  for (const p of recurringExpenses) {
    const d = Math.min(p.dayOfMonth, dim)
    out.push({
      dueDate: `${month}-${String(d).padStart(2, '0')}`,
      label: p.description,
      amount: p.amount,
      source: 'auto',
      patternKey: p.patternKey,
    })
  }
  for (const r of manualRules) {
    const mid = Math.min(31, Math.max(1, Math.round((r.fromDay + r.toDay) / 2)))
    const d = Math.min(mid, dim)
    const amt = r.maxAmount ?? r.minAmount ?? 0
    out.push({
      dueDate: `${month}-${String(d).padStart(2, '0')}`,
      label: r.conceptPattern,
      amount: roundMoney2(Number(amt) || 0),
      source: 'manual',
      ruleId: r.id,
    })
  }
  for (const c of planned) {
    if (c.kind === 'one_shot' && c.dueYm === month) {
      const dd = Math.min(c.dueDay ?? 15, dim)
      out.push({
        dueDate: `${month}-${String(dd).padStart(2, '0')}`,
        label: c.label,
        amount: c.amount,
        source: 'planned',
        commitmentId: c.id,
      })
    }
  }
  out.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  return out
}

function addDaysToYmd(ymd: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return ymd
  const y = parseInt(m[1]!, 10)
  const mo = parseInt(m[2]!, 10)
  const d = parseInt(m[3]!, 10)
  const dt = new Date(y, mo - 1, d + days)
  return toDateOnlyString(dt)
}

function addMonthsToYm(ym: string, add: number): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim())
  if (!m) return null
  const y = parseInt(m[1]!, 10)
  const mo = parseInt(m[2]!, 10)
  const dt = new Date(y, mo - 1 + add, 1)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`
}

/**
 * Primer día en [today, today+horizonDays) donde |día_civil − ancla| ≤ 1 (misma lógica relajada que patrones auto).
 * Una fila por patrón / regla / puntual planificado en la ventana.
 */
function buildRecurringDueUpcomingWindow(
  recurringExpenses: StatsRecurringExpenseDto[],
  manualRules: RecurringManualRuleDto[],
  planned: PlannedCommitmentDto[],
  todayYmd: string,
  horizonDays: number,
): StatsRecurringDueItemDto[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayYmd)) return []
  const lastYmd = addDaysToYmd(todayYmd, Math.max(0, horizonDays - 1))
  const out: StatsRecurringDueItemDto[] = []

  for (const p of recurringExpenses) {
    const anchor = p.dayOfMonth
    if (anchor < 1 || anchor > 31) continue
    for (let i = 0; i < horizonDays; i++) {
      const ymd = addDaysToYmd(todayYmd, i)
      const ym = ymd.slice(0, 7)
      const dom = Number(ymd.slice(8, 10))
      const dim = calendarDaysInMonth(ym)
      if (dom < 1 || dom > dim) continue
      if (Math.abs(dom - anchor) > 1) continue
      out.push({
        dueDate: ymd,
        label: p.description,
        amount: p.amount,
        source: 'auto',
        patternKey: p.patternKey,
      })
      break
    }
  }

  for (const r of manualRules) {
    for (let i = 0; i < horizonDays; i++) {
      const ymd = addDaysToYmd(todayYmd, i)
      const ym = ymd.slice(0, 7)
      const dom = Number(ymd.slice(8, 10))
      const dim = calendarDaysInMonth(ym)
      const mid = Math.min(31, Math.max(1, Math.round((r.fromDay + r.toDay) / 2)))
      const dDue = Math.min(mid, dim)
      if (dom !== dDue) continue
      const amt = r.maxAmount ?? r.minAmount ?? 0
      out.push({
        dueDate: ymd,
        label: r.conceptPattern,
        amount: roundMoney2(Number(amt) || 0),
        source: 'manual',
        ruleId: r.id,
      })
      break
    }
  }

  for (const c of planned) {
    if (c.kind === 'one_shot' && c.dueYm && isYm(c.dueYm)) {
      const ym = c.dueYm
      const dim = calendarDaysInMonth(ym)
      const dd = Math.min(c.dueDay ?? 15, dim)
      const ymd = `${ym}-${String(dd).padStart(2, '0')}`
      if (ymd >= todayYmd && ymd <= lastYmd) {
        out.push({
          dueDate: ymd,
          label: c.label,
          amount: c.amount,
          source: 'planned',
          commitmentId: c.id,
        })
      }
    } else if (c.kind === 'recurring' && c.cadence && c.cadence !== 'monthly' && c.anchorYm && isYm(c.anchorYm)) {
      const monthsStep = c.cadence === 'quarterly' ? 3 : c.cadence === 'semiannual' ? 6 : 12
      let curYm: string | null = c.anchorYm
      const dom0 = c.anchorDay == null
        ? 15
        : Math.min(Math.max(1, c.anchorDay), calendarDaysInMonth(c.anchorYm))
      for (let guard = 0; guard < 120 && curYm; guard++) {
        const dimC = calendarDaysInMonth(curYm)
        const dom = Math.min(dom0, dimC)
        const ymdR = `${curYm}-${String(dom).padStart(2, '0')}`
        if (ymdR > lastYmd) break
        if (ymdR >= todayYmd) {
          out.push({
            dueDate: ymdR,
            label: c.label,
            amount: c.amount,
            source: 'planned',
            commitmentId: c.id,
          })
          break
        }
        curYm = addMonthsToYm(curYm, monthsStep)
      }
    }
  }

  out.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.label.localeCompare(b.label))
  return out
}

export async function simulateExpenseForecast(
  userId: string,
  month: string,
  expenseMultiplierPct: number,
): Promise<StatsForecastSimulateDto> {
  if (!isYm(month)) throw ApiError.badRequest(ERROR_CODES.VALIDATION_FAILED, 'Mes inválido')
  const patternCategoryOverrides = transactionService.buildPatternCategoryOverrideMap(
    (await User.findByPk(userId, { attributes: ['recurringPatternCategoryOverrides'] }))?.recurringPatternCategoryOverrides as unknown,
  )
  const rows = await transactionService.categoryBreakdown(userId, month, { patternCategoryOverrides })
  const baseline = roundMoney2(Math.abs(rows.reduce((s, r) => s + (Number.isFinite(r.total) ? r.total : 0), 0)))
  const mult = 1 + (Number(expenseMultiplierPct) || 0) / 100
  return {
    month,
    expenseMultiplierPct: Number(expenseMultiplierPct) || 0,
    baselineMonthExpenseTotal: baseline,
    simulatedMonthExpenseTotal: roundMoney2(Math.max(0, baseline * mult)),
  }
}

export async function setRecurringPatternSavings(userId: string, patternKeyRaw: string, isSavings: boolean): Promise<void> {
  const patternKey = patternKeyRaw.trim().slice(0, 400)
  if (!patternKey) throw ApiError.badRequest(ERROR_CODES.IMPORT_PATTERN_KEY_REQUIRED, 'patternKey es obligatorio')
  const user = await User.findByPk(userId, { attributes: ['id', 'recurringSavingsPatternKeys'] })
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')
  const current = new Set(Array.isArray(user.recurringSavingsPatternKeys) ? user.recurringSavingsPatternKeys : [])
  if (isSavings) current.add(patternKey)
  else current.delete(patternKey)
  await user.update({ recurringSavingsPatternKeys: [...current] })
}

export async function setRecurringPatternCategory(
  userId: string,
  patternKeyRaw: string,
  categoryId: string | null,
  subcategoryId: string | null,
): Promise<void> {
  const patternKey = patternKeyRaw.trim().slice(0, 400)
  if (!patternKey) throw ApiError.badRequest(ERROR_CODES.IMPORT_PATTERN_KEY_REQUIRED, 'patternKey es obligatorio')
  const user = await User.findByPk(userId, { attributes: ['id', 'recurringPatternCategoryOverrides'] })
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')

  if (!categoryId) {
    const current = transactionService.buildPatternCategoryOverrideMap(user.recurringPatternCategoryOverrides as unknown)
    current.delete(patternKey)
    await user.update({ recurringPatternCategoryOverrides: [...current.values()] })
    return
  }

  const cat = await Category.findOne({ where: { id: categoryId, userId }, attributes: ['id'] })
  if (!cat) throw ApiError.badRequest(ERROR_CODES.CATEGORY_NOT_FOUND, 'Categoría inválida para reclasificación')
  let nextSubcategoryId: string | null = null
  if (subcategoryId) {
    const sub = await Subcategory.findOne({ where: { id: subcategoryId, userId }, attributes: ['id', 'categoryId'] })
    if (!sub || sub.categoryId !== categoryId) {
      throw ApiError.badRequest(ERROR_CODES.CATEGORY_NOT_FOUND, 'Subcategoría inválida para la categoría seleccionada')
    }
    nextSubcategoryId = sub.id
  }
  const current = transactionService.buildPatternCategoryOverrideMap(user.recurringPatternCategoryOverrides as unknown)
  current.set(patternKey, { patternKey, categoryId, subcategoryId: nextSubcategoryId })
  await user.update({ recurringPatternCategoryOverrides: [...current.values()] })
}

/**
 * Oculta un patrón recurrente hasta que exista un movimiento en un mes natural **posterior**
 * al mes calendario en que se descartó (`dismissedYm`). No borra transacciones.
 */
export async function dismissRecurringPattern(userId: string, patternKeyRaw: string): Promise<void> {
  const patternKey = patternKeyRaw.trim().slice(0, 400)
  if (!patternKey) throw ApiError.badRequest(ERROR_CODES.IMPORT_PATTERN_KEY_REQUIRED, 'patternKey es obligatorio')

  const dismissedYm = calendarYmToday()
  const existing = await RecurringPatternDismissal.findOne({ where: { userId, patternKey } })
  if (existing) await existing.update({ dismissedYm })
  else await RecurringPatternDismissal.create({ userId, patternKey, dismissedYm })
}

/**
 * Payload dedicado a la vista Estadísticas: barras anuales, desglose del mes (gasto/presupuesto/ingreso por categoría) y totales.
 * No depende de que existan filas de `Budget` por categoría: el gasto viene de transacciones del mes.
 */
export async function monthOverview(userId: string, monthOverride?: string): Promise<StatsMonthOverviewDto> {
  const month = monthOverride && isYm(monthOverride)
    ? monthOverride
    : await defaultFiscalYmForUser(userId)
  const [yStr, mStr] = month.split('-')
  const year = parseInt(yStr, 10)
  const selectedMm = mStr

  const [
    summaryRows,
    allCategories,
    budgets,
    subBudgets,
    recurringExpenses,
    recurringManualMatches,
    recurringManualRules,
    monthCycleCfg,
    userPrefs,
    budgetPace,
  ] =
    await Promise.all([
      transactionService.monthlySummary(userId, year),
      Category.findAll({
        where: { userId },
        order: [['name', 'ASC']],
        include: [{
          model: Subcategory,
          as: 'subcategories',
          attributes: ['id', 'name', 'icon', 'color'],
          required: false,
        }],
      }),
      Budget.findAll({ where: { userId, month } }),
      SubcategoryBudget.findAll({ where: { userId, month } }),
      findRecurringExpensePatterns(userId),
      findRecurringManualMatches(userId),
      listRecurringManualRules(userId),
      getMonthCycleConfigForUser(userId),
      User.findByPk(userId, {
        attributes: [
          'id',
          'recurringSavingsPatternKeys',
          'recurringSavingsCategoryIds',
          'recurringSavingsSubcategoryIds',
          'recurringPatternCategoryOverrides',
          'plannedCommitments',
        ],
      }),
      budgetService.getBudgetPace(userId, month).catch(() => null),
    ])
  const patternCategoryOverrides = transactionService.buildPatternCategoryOverrideMap(
    userPrefs?.recurringPatternCategoryOverrides as unknown
  )
  const [expenseRows, incomeRows, expenseSubRows, incomeSubRows, yearAvgs] = await Promise.all([
    transactionService.categoryBreakdown(userId, month, { patternCategoryOverrides }),
    transactionService.categoryIncomeBreakdownMonth(userId, month, { patternCategoryOverrides }),
    transactionService.subcategoryBreakdownMonth(userId, month, 'expense', { patternCategoryOverrides }),
    transactionService.subcategoryBreakdownMonth(userId, month, 'income', { patternCategoryOverrides }),
    transactionService.rolling12ByCategoryAndSubcategory(userId, month, {
      includeTransferPatternKeys: userPrefs?.recurringSavingsPatternKeys ?? [],
      includeTransferCategoryIds: userPrefs?.recurringSavingsCategoryIds ?? [],
      includeTransferSubcategoryIds: userPrefs?.recurringSavingsSubcategoryIds ?? [],
      patternCategoryOverrides,
    }),
  ])
  const bestExpenseMonthRolling = await bestMonthRolling(userId, month, monthCycleCfg, 'expense')
  const bestIncomeMonthRolling = await bestMonthRolling(userId, month, monthCycleCfg, 'income')

  const expenseMap = new Map<string, number>()
  const expenseMeta = new Map<string, { name: string; icon: string; color: string }>()
  for (const r of expenseRows) {
    const id = r.categoryId ?? 'uncategorized'
    expenseMap.set(id, r.total)
    expenseMeta.set(id, { name: r.name, icon: r.icon, color: r.color })
  }
  const incomeMap = new Map<string, number>()
  for (const r of incomeRows) {
    const id = r.categoryId ?? 'uncategorized'
    incomeMap.set(id, r.total)
  }
  const budgetMap = new Map<string, number>()
  for (const b of budgets) {
    budgetMap.set(b.categoryId, roundMoney2(Number(b.amount)))
  }
  const subBudgetMap = new Map<string, number>()
  for (const b of subBudgets) {
    subBudgetMap.set(b.subcategoryId, roundMoney2(Number(b.amount)))
  }
  const excludedSubcategorySet = new Set(userPrefs?.budgetExcludedSubcategoryIds ?? [])
  const expSubByCat = new Map<string, typeof expenseSubRows>()
  for (const r of expenseSubRows) {
    const cid = r.categoryId ?? 'uncategorized'
    expSubByCat.set(cid, [...(expSubByCat.get(cid) ?? []), r])
  }
  const incSubByCat = new Map<string, typeof incomeSubRows>()
  for (const r of incomeSubRows) {
    const cid = r.categoryId ?? 'uncategorized'
    incSubByCat.set(cid, [...(incSubByCat.get(cid) ?? []), r])
  }

  const catById = new Map(allCategories.map(c => [c.id, c]))
  const rowIds = new Set<string>()
  for (const c of allCategories) rowIds.add(c.id)
  for (const b of budgets) rowIds.add(b.categoryId)
  for (const r of expenseRows) rowIds.add(r.categoryId ?? 'uncategorized')
  for (const r of incomeRows) rowIds.add(r.categoryId ?? 'uncategorized')

  const categories: StatsMonthOverviewDto['categories'] = []
  for (const id of rowIds) {
    if (id === 'uncategorized') {
      const spent = expenseMap.get('uncategorized') ?? 0
      const inc = incomeMap.get('uncategorized') ?? 0
      if (spent <= 0 && inc <= 0) continue
      const meta = expenseMeta.get('uncategorized') ?? { name: 'Sin categoría', icon: '💸', color: '#888' }
      categories.push({
        id: 'uncategorized',
        name: meta.name,
        icon: meta.icon,
        color: meta.color,
        spent,
        budget: 0,
        incomeInCategory: inc,
        subcategories: [],
      })
      continue
    }
    const cat = catById.get(id)
    const spent = expenseMap.get(id) ?? 0
    const bud = budgetMap.get(id) ?? 0
    const inc = incomeMap.get(id) ?? 0
    if (!cat && spent <= 0 && bud <= 0 && inc <= 0) continue
    categories.push({
      id,
      name: cat?.name ?? expenseMeta.get(id)?.name ?? 'Categoría',
      icon: cat?.icon ?? expenseMeta.get(id)?.icon ?? '💰',
      color: cat?.color ?? expenseMeta.get(id)?.color ?? '#1A8CFF',
      spent,
      budget: bud,
      incomeInCategory: inc,
      subcategories: (() => {
        const catSubs = (cat?.subcategories ?? []).filter((s) => !excludedSubcategorySet.has(s.id))
        const expRows = expSubByCat.get(id) ?? []
        const incRows = incSubByCat.get(id) ?? []
        const byId = new Map<string, {
          id: string
          name: string
          icon: string
          color: string
          spent: number
          budget: number
          incomeInCategory: number
        }>()
        for (const r of expRows) {
          if (!r.subcategoryId) continue
          byId.set(r.subcategoryId, {
            id: r.subcategoryId,
            name: r.name,
            icon: r.icon,
            color: r.color,
            spent: roundMoney2(r.total),
            budget: roundMoney2(subBudgetMap.get(r.subcategoryId) ?? 0),
            incomeInCategory: 0,
          })
        }
        for (const s of catSubs) {
          if (byId.has(s.id)) continue
          byId.set(s.id, {
            id: s.id,
            name: s.name,
            icon: s.icon,
            color: s.color,
            spent: 0,
            budget: roundMoney2(subBudgetMap.get(s.id) ?? 0),
            incomeInCategory: 0,
          })
        }
        for (const r of incRows) {
          if (!r.subcategoryId) continue
          const prev = byId.get(r.subcategoryId)
          byId.set(r.subcategoryId, {
            id: r.subcategoryId,
            name: prev?.name ?? r.name,
            icon: prev?.icon ?? r.icon,
            color: prev?.color ?? r.color,
            spent: prev?.spent ?? 0,
            budget: prev?.budget ?? roundMoney2(subBudgetMap.get(r.subcategoryId) ?? 0),
            incomeInCategory: roundMoney2(r.total),
          })
        }
        return [...byId.values()].sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name))
      })(),
    })
  }
  categories.sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name))

  const now = new Date()
  const cy = now.getFullYear()
  const cm = String(now.getMonth() + 1).padStart(2, '0')

  const monthlyBars = summaryRows.map(row => ({
    month: row.month,
    label: monthLabelEs(row.month),
    expenses: row.expenses,
    income:   row.income,
    net:      row.net,
    isSelectedMonth: row.month === selectedMm,
    isCurrentSystemMonth: year === cy && row.month === cm,
  }))

  const yearExpenseTotal = roundMoney2(yearAvgs.expenseTotalWindow)
  const yearIncomeTotal = roundMoney2(yearAvgs.incomeTotalWindow)
  const yearlyAverageExpense = roundMoney2(yearExpenseTotal / Math.max(1, yearAvgs.expenseMonthsDivisor))
  const yearlyAverageIncome = roundMoney2(yearIncomeTotal / Math.max(1, yearAvgs.incomeMonthsDivisor))
  const yearIncomeAvgPerMonth = roundMoney2(yearIncomeTotal / Math.max(1, yearAvgs.incomeMonthsDivisor))

  const monthExpenseTotal = roundMoney2(expenseRows.reduce((s, r) => s + r.total, 0))
  const monthIncomeTotal = roundMoney2(incomeRows.reduce((s, r) => s + r.total, 0))
  const monthBudgetTotal = roundMoney2([...budgetMap.values()].reduce((s, v) => s + v, 0))

  const plannedList = parsePlannedCommitments(userPrefs?.plannedCommitments as unknown)
  const recurringDueCalendar = buildRecurringDueCalendar(month, recurringExpenses, recurringManualRules, plannedList)
  const recurringForecastTotal = roundMoney2(
    recurringExpenses.reduce((s, r) => s + r.amount, 0)
      + recurringManualMatches.reduce((s, m) => s + m.latestAmount, 0),
  )
  const absMonthExpense = Math.abs(monthExpenseTotal) || 0
  const recurringAutoSum = recurringExpenses.reduce((s, r) => s + r.amount, 0)
  const kpiRecurringCoveragePct = absMonthExpense > 0
    ? roundMoney2(Math.min(100, (recurringAutoSum / absMonthExpense) * 100))
    : null

  const nowYmd = toDateOnlyString(new Date())
  const recurringDueUpcoming = buildRecurringDueUpcomingWindow(
    recurringExpenses,
    recurringManualRules,
    plannedList,
    nowYmd,
    21,
  )
  const currentFiscalYm = dateToFiscalYm(nowYmd, monthCycleCfg)
  let recurringMissed: StatsRecurringMissedDto[] = []
  if (currentFiscalYm === month && absMonthExpense > 0) {
    const { from: mFrom, to: mTo } = ymToDateBounds(month, monthCycleCfg)
    const todayD = dayOfMonthFromDateOnly(nowYmd)
    const monthTxs = await Transaction.findAll({
      where: {
        userId,
        isExcluded: false,
        type: { [Op.in]: ['expense', 'transfer'] as const },
        date: { [Op.between]: [mFrom, mTo] },
      },
      attributes: ['categoryId', 'subcategoryId', 'description', 'amount', 'date'],
    })
    for (const row of recurringExpenses) {
      if (row.isSavings) continue
      const hit = monthTxs.some((tx) => transactionService.transactionMatchesRecurringPatternKey(tx, row.patternKey))
      if (!hit && todayD >= row.dayOfMonth + 2) {
        recurringMissed.push({
          patternKey: row.patternKey,
          description: row.description,
          dayOfMonth: row.dayOfMonth,
        })
      }
    }
  }

  return {
    month,
    year,
    monthlyBars,
    categories,
    totals: {
      monthExpenseTotal,
      monthIncomeTotal,
      monthBudgetTotal,
      yearlyAverageExpense,
      yearlyAverageIncome,
      bestMonthLabel: bestExpenseMonthRolling.label,
      bestMonthAmount: bestExpenseMonthRolling.amount,
      bestIncomeMonthLabel: bestIncomeMonthRolling.label,
      bestIncomeMonthAmount: bestIncomeMonthRolling.amount,
      yearExpenseTotal,
      yearIncomeTotal,
      yearIncomeAvgPerMonth,
    },
    expenseCategoryYearAvg: yearAvgs.expenseCategories,
    expenseSubcategoryYearAvg: yearAvgs.expenseSubcategories,
    incomeCategoryYearAvg: yearAvgs.incomeCategories,
    incomeSubcategoryYearAvg: yearAvgs.incomeSubcategories,
    recurringExpenses,
    recurringManualMatches,
    recurringManualRules,
    budgetPace,
    recurringDueCalendar,
    recurringDueUpcoming,
    recurringForecastTotal,
    recurringMissed,
    kpiRecurringCoveragePct,
    plannedCommitments: plannedList,
  }
}

/**
 * @param monthOverride `YYYY-MM` desde el cliente para alinear ingresos/gastos con el calendario del usuario.
 */
export async function dashboard(userId: string, monthOverride?: string) {
  const month = monthOverride && isYm(monthOverride)
    ? monthOverride
    : await defaultFiscalYmForUser(userId)
  const [yStr] = month.split('-')
  const y = parseInt(yStr, 10)

  const [totalBalance, allTimeTxs, categoryBreakdown, categoryIncomeBreakdown, monthlySummary, userPrefs] =
    await Promise.all([
      accountService.totalBalance(userId),
      Transaction.findAll({
        where:      { userId, isExcluded: false },
        attributes: ['type', 'amount'],
      }),
      transactionService.categoryBreakdownAllTime(userId),
      transactionService.categoryIncomeBreakdownAllTime(userId),
      transactionService.monthlySummary(userId, y),
      User.findByPk(userId, {
        attributes: [
          'id',
          'recurringSavingsPatternKeys',
          'recurringSavingsCategoryIds',
          'recurringSavingsSubcategoryIds',
          'recurringPatternCategoryOverrides',
        ],
      }),
    ])
  const yearAvgs = await transactionService.rolling12ByCategoryAndSubcategory(userId, month, {
    includeTransferPatternKeys: userPrefs?.recurringSavingsPatternKeys ?? [],
    includeTransferCategoryIds: userPrefs?.recurringSavingsCategoryIds ?? [],
    includeTransferSubcategoryIds: userPrefs?.recurringSavingsSubcategoryIds ?? [],
    patternCategoryOverrides: transactionService.buildPatternCategoryOverrideMap(userPrefs?.recurringPatternCategoryOverrides as unknown),
  })

  let income = 0, expenses = 0
  for (const tx of allTimeTxs) {
    const amt = Number(tx.amount)
    if (!Number.isFinite(amt)) continue
    if (tx.type === 'income') income += amt
    else expenses += amt
  }

  /** ingresos − gastos (los gastos incluyen movimientos negativos del extracto, p. ej. traspasos a ahorro). */
  const netCashflow = Math.round((income - expenses) * 100) / 100
  const transfersToSavings = 0

  let statementSnapshot: {
    openingSaldo: number
    closingSaldo: number
    delta: number
    firstDate: string | null
    lastDate: string | null
  } | null = null
  const stmtAccount = await Account.findOne({
    where: {
      userId,
      isActive: true,
      statementClosingSaldo: { [Op.ne]: null },
    },
    order: [['updatedAt', 'DESC']],
  })
  if (stmtAccount) {
    const o = stmtAccount.statementOpeningSaldo
    const c = stmtAccount.statementClosingSaldo
    if (o != null && c != null && Number.isFinite(o) && Number.isFinite(c)) {
      const delta = Math.round((c - o) * 100) / 100
      statementSnapshot = {
        openingSaldo: o,
        closingSaldo: c,
        delta,
        firstDate: stmtAccount.statementPeriodFirstDate ?? null,
        lastDate: stmtAccount.statementPeriodLastDate ?? null,
      }
    }
  }

  const sumYearExpenses = roundMoney2(yearAvgs.expenseTotalWindow)
  /** Misma fórmula que `monthOverview.totals.yearlyAverageExpense`: total gastos de los últimos 12 meses con datos / meses con gasto (1..12). */
  const yearlyAverageExpense = roundMoney2(
    sumYearExpenses / Math.max(1, yearAvgs.expenseMonthsDivisor),
  )

  if (process.env.DEBUG_DASHBOARD === '1') {
    const uidShort = typeof userId === 'string' ? userId.slice(0, 8) : '?'
    console.log('[stats/dashboard]', {
      userId: uidShort,
      txCount: allTimeTxs.length,
      income,
      expenses,
      transfersToSavings: 0,
      netCashflow,
      statementDelta: statementSnapshot?.delta,
      balanceAccounts: totalBalance,
      categoryRows: categoryBreakdown.length,
      month,
    })
  }

  return {
    balance: totalBalance,
    month,
    income,
    expenses,
    netCashflow,
    transfersToSavings,
    statementSnapshot,
    categoryBreakdown,
    categoryIncomeBreakdown,
    monthlySummary,
    yearlyAverageExpense,
    /** Meses fiscales del año con al menos un gasto (divisor de la media anterior). */
    expenseMonthsWithData: yearAvgs.expenseMonthsDivisor,
  }
}
