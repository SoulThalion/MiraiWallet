import { Request } from 'express'
import { User } from '../models/User'

// ── HTTP ──────────────────────────────────────────────────
export interface AuthRequest extends Request {
  user: User
}

// ── JWT ───────────────────────────────────────────────────
export interface JwtPayload {
  sub:  string
  role: UserRole
  iat?: number
  exp?: number
}

// ── Domain enums ──────────────────────────────────────────
export type UserRole           = 'user' | 'admin'
export type AccountType        = 'checking' | 'savings' | 'investment' | 'cash'
export type TransactionType    = 'income' | 'expense' | 'transfer'
export type RecurringPeriod    = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ImportSource       = 'manual' | 'csv' | 'bank_api'
export type AlertType          = 'danger' | 'warning' | 'success' | 'info'
export type CategoryType       = 'expense' | 'income'

// ── Service DTOs ──────────────────────────────────────────
export interface RegisterDto {
  name:     string
  email:    string
  password: string
}

export interface LoginDto {
  email:    string
  password: string
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword:     string
}

export interface CreateTransactionDto {
  accountId:       string
  categoryId?:     string
  subcategoryId?:  string
  description:     string
  amount:          number
  type:            TransactionType
  date:            string
  notes?:          string
  isRecurring?:    boolean
  recurringPeriod?: RecurringPeriod
  importSource?:   ImportSource
}

export interface UpdateTransactionDto {
  description?:    string
  amount?:         number
  type?:           TransactionType
  date?:           string
  notes?:          string
  categoryId?:     string
  subcategoryId?:  string | null
  isRecurring?:    boolean
  recurringPeriod?: RecurringPeriod
}

export interface SetTransactionExcludedDto {
  isExcluded: boolean
}

export type TransactionListSortBy =
  'date' | 'amount' | 'description' | 'type' | 'importSource' | 'category'

export interface TransactionQuery {
  page?:          string
  limit?:         string
  type?:          TransactionType
  accountId?:     string
  categoryId?:    string
  from?:          string
  to?:            string
  /** Contiene (LIKE) en `description`, insensible a mayúsculas en MySQL utf8mb4_unicode_ci. */
  description?:  string
  importSource?:  ImportSource
  /** `true` solo excluidos, `false` solo activos; vacío = ambos. */
  isExcluded?:    'true' | 'false' | string
  minAmount?:     string
  maxAmount?:     string
  sortBy?:       TransactionListSortBy | string
  sortOrder?:    'asc' | 'desc' | string
}

export interface CreateAccountDto {
  name:         string
  type?:        AccountType
  balance?:     number
  currency?:    string
  institution?: string
  color?:       string
}

export interface CreateCategoryDto {
  name:           string
  icon?:          string
  color?:         string
  monthlyBudget?: number
  type?:          CategoryType
}

export interface UpsertBudgetDto {
  categoryId: string
  amount:     number
  month:      string
  notes?:     string
}

export interface UpsertSubcategoryBudgetDto {
  subcategoryId: string
  amount: number
  month: string
}

export type BudgetRecommendationProfile = 'conservative' | 'balanced' | 'flexible'
export type BudgetPaceMode = 'flexible' | 'strict' | 'custom'
export type BudgetPaceStatus = 'ok' | 'warn' | 'risk' | 'critical'

export interface BudgetPaceThresholds {
  warnPct: number
  riskPct: number
  criticalPct: number
}

export interface BudgetPaceCategoryDto {
  categoryId: string
  name: string
  icon: string
  color: string
  budget: number
  actualSpent: number
  expectedSpentLinear: number
  expectedSpentWeighted: number
  pacePctLinear: number
  pacePctWeighted: number
  statusLinear: BudgetPaceStatus
  statusWeighted: BudgetPaceStatus
}

export interface BudgetPaceDto {
  month: string
  asOfDate: string
  daysElapsed: number
  daysTotal: number
  daysRemaining: number
  periodProgressPct: number
  budgetPaceMode: BudgetPaceMode
  thresholds: BudgetPaceThresholds
  actualSpent: number
  totalBudget: number
  expectedSpentLinear: number
  expectedSpentWeighted: number
  paceDeltaLinear: number
  paceDeltaWeighted: number
  pacePctLinear: number
  pacePctWeighted: number
  statusLinear: BudgetPaceStatus
  statusWeighted: BudgetPaceStatus
  categories: BudgetPaceCategoryDto[]
}

export interface BudgetRecommendationQueryDto {
  month: string
  profile?: BudgetRecommendationProfile
  targetSavingsRate?: number
}

export interface ApplyBudgetRecommendationDto extends BudgetRecommendationQueryDto {
  mode?: 'all' | 'categories' | 'subcategories'
  categoryIds?: string[]
  subcategoryIds?: string[]
}

/** Respuesta de `GET /stats/month-overview` (solo datos para la vista Estadísticas). */
export interface StatsMonthBarDto {
  month: string
  label: string
  expenses: number
  /** Ingresos del mismo mes (calendario del año de la vista). */
  income: number
  /** Ingresos − gastos del mes (misma convención que `monthlySummary`). */
  net: number
  isSelectedMonth: boolean
  isCurrentSystemMonth: boolean
}

export interface StatsMonthCategoryDto {
  id: string
  name: string
  icon: string
  color: string
  spent: number
  budget: number
  incomeInCategory: number
  subcategories?: Array<{
    id: string
    name: string
    icon: string
    color: string
    spent: number
    budget: number
    incomeInCategory: number
  }>
}

/**
 * `avgPerMonth` = `totalYear` / meses fiscales con datos dentro de la ventana móvil
 * de los últimos 12 meses con movimiento del tipo (gasto o ingreso), hasta el mes consultado.
 */
export interface StatsYearAvgCategoryDto {
  categoryId: string
  name: string
  icon: string
  color: string
  totalYear: number
  avgPerMonth: number
}

export interface StatsYearAvgSubcategoryDto {
  categoryId: string
  /** `null` = movimientos de la categoría sin subcategoría. */
  subcategoryId: string | null
  categoryName: string
  name: string
  icon: string
  color: string
  totalYear: number
  avgPerMonth: number
}

/** Gasto repetido: misma categoría, subcategoría, concepto (normalizado), importe y día del mes en ≥2 meses distintos. */
export interface StatsRecurringExpenseDto {
  categoryId: string | null
  subcategoryId: string | null
  categoryName: string
  subcategoryName: string | null
  categoryIcon: string
  categoryColor: string
  description: string
  amount: number
  /** Día del mes en que se repite (1–31). */
  dayOfMonth: number
  occurrenceCount: number
  distinctMonthCount: number
  firstDate: string
  lastDate: string
  /** Clave interna del agrupado; sirve para ocultar el patrón hasta que haya un mes con movimiento posterior al cierre. */
  patternKey: string
  /** Marcado por el usuario para considerar este patrón como ahorro en presupuestos/sugerencias. */
  isSavings: boolean
}

export interface RecurringManualRuleDto {
  id: string
  conceptPattern: string
  fromDay: number
  toDay: number
  minAmount: number | null
  maxAmount: number | null
  categoryId: string
  subcategoryId: string | null
}

export interface StatsRecurringManualMatchDto {
  ruleId: string
  conceptPattern: string
  categoryId: string
  subcategoryId: string | null
  categoryName: string
  subcategoryName: string | null
  categoryIcon: string
  categoryColor: string
  fromDay: number
  toDay: number
  minAmount: number | null
  maxAmount: number | null
  sampleDescription: string
  latestAmount: number
  matchCount: number
  firstDate: string
  lastDate: string
}

export type PlannedCommitmentKind = 'one_shot' | 'recurring'
export type PlannedCommitmentCadence = 'monthly' | 'quarterly' | 'semiannual' | 'annual'

export interface PlannedCommitmentDto {
  id: string
  label: string
  amount: number
  categoryId?: string | null
  subcategoryId?: string | null
  kind: PlannedCommitmentKind
  /** Obligatorio si `kind === 'one_shot'` */
  dueYm?: string | null
  dueDay?: number | null
  /** Si `kind === 'recurring'` */
  cadence?: PlannedCommitmentCadence | null
  anchorYm?: string | null
  anchorDay?: number | null
}

export interface StatsRecurringDueItemDto {
  dueDate: string
  label: string
  amount: number
  source: 'auto' | 'manual' | 'planned'
  patternKey?: string
  ruleId?: string
  commitmentId?: string
}

export interface StatsRecurringMissedDto {
  patternKey: string
  description: string
  dayOfMonth: number
}

export interface StatsForecastSimulateDto {
  month: string
  expenseMultiplierPct: number
  simulatedMonthExpenseTotal: number
  baselineMonthExpenseTotal: number
}

export interface StatsMonthOverviewDto {
  month: string
  year: number
  monthlyBars: StatsMonthBarDto[]
  categories: StatsMonthCategoryDto[]
  totals: {
    monthExpenseTotal: number
    monthIncomeTotal: number
    monthBudgetTotal: number
    yearlyAverageExpense: number
    yearlyAverageIncome: number
    bestMonthLabel: string
    bestMonthAmount: number
    bestIncomeMonthLabel: string
    bestIncomeMonthAmount: number
    /** Suma de gastos de la ventana móvil de 12 meses con datos (no necesariamente un único año). */
    yearExpenseTotal: number
    /** Suma de ingresos de esa misma ventana móvil. */
    yearIncomeTotal: number
    /** Media mensual de ingresos (total de ventana ÷ meses con ingresos en la ventana). */
    yearIncomeAvgPerMonth: number
  }
  /** Gastos de la ventana móvil: total y media mensual por categoría. */
  expenseCategoryYearAvg: StatsYearAvgCategoryDto[]
  expenseSubcategoryYearAvg: StatsYearAvgSubcategoryDto[]
  /** Ingresos de la misma ventana móvil. */
  incomeCategoryYearAvg: StatsYearAvgCategoryDto[]
  incomeSubcategoryYearAvg: StatsYearAvgSubcategoryDto[]
  /** Patrones de gasto repetido (últimos 36 meses, máx. 60 filas). */
  recurringExpenses: StatsRecurringExpenseDto[]
  recurringManualMatches: StatsRecurringManualMatchDto[]
  recurringManualRules: RecurringManualRuleDto[]
  budgetPace?: BudgetPaceDto | null
  /** Vencimientos del mes (auto + manual + planificado puntual en este mes). */
  recurringDueCalendar: StatsRecurringDueItemDto[]
  /** Próximos vencimientos en ventana de días civiles desde hoy (auto ±1 día, manual, puntual H). */
  recurringDueUpcoming: StatsRecurringDueItemDto[]
  /** Estimación bruta de cargos recurrentes en el mes (auto + manual). */
  recurringForecastTotal: number
  /** Patrones auto con día ya pasado en el mes fiscal actual sin movimiento detectado (heurística simple). */
  recurringMissed: StatsRecurringMissedDto[]
  /** % del gasto del mes que coincide con importes de patrones auto (0–100 o null). */
  kpiRecurringCoveragePct: number | null
  plannedCommitments: PlannedCommitmentDto[]
}

export interface TokenPair {
  accessToken:  string
  refreshToken: string
  tokenType:    string
  expiresIn:    string
}

export interface PaginationMeta {
  page:       number
  limit:      number
  total:      number
  totalPages: number
  hasNext:    boolean
  hasPrev:    boolean
}
