import axios, { AxiosInstance, AxiosError } from 'axios'

// ── Types from Backend ───────────────────────────────────

export interface ApiTransaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  date: string
  /** Origen del movimiento; solo `manual` es editable vía API. */
  importSource?: 'manual' | 'csv' | 'bank_api'
  /** Si true, se conserva para deduplicación/imports pero se ignora en estadísticas y alertas. */
  isExcluded?: boolean
  notes?: string | null
  category?: {
    id: string
    name: string
    icon: string
    color: string
  }
  subcategory?: {
    id: string
    name: string
    icon: string
    color: string
  }
  account?: {
    id: string
    name: string
    color: string
  }
  createdAt: string
  updatedAt: string
}

export interface ApiCategory {
  id: string
  name: string
  icon: string
  color: string
  /** `income` = categoría de ingresos (nómina, etc.); `expense` = gastos. */
  type?: 'income' | 'expense'
  monthlyBudget?: number
  budget?: number
  spent?: number
  subcategories?: { id: string; name: string; icon: string; color: string }[]
}

export interface ApiAlertAction {
  label: string
  style: 'primary' | 'secondary' | 'success' | 'gold'
}

export interface ApiAlert {
  id: string
  type: 'danger' | 'success' | 'warning' | 'info'
  badge: string
  title: string
  body: string
  amount?: string | null
  actions?: ApiAlertAction[] | null
  isRead: boolean
  isDismissed: boolean
  createdAt: string
}

export interface ApiBudget {
  id: string
  categoryId: string
  month: string
  amount: number
  notes?: string | null
  category?: ApiCategory
  spent?: number
}

export interface ApiSubcategoryBudget {
  id: string
  subcategoryId: string
  month: string
  amount: number
  spent?: number
  subcategory?: {
    id: string
    name: string
    icon: string
    color: string
    categoryId: string
    category?: {
      id: string
      name: string
      icon: string
      color: string
    }
  }
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

export interface BudgetRecommendationSubLine {
  subcategoryId: string
  name: string
  icon: string
  color: string
  currentBudget: number
  monthlyAverageSpent: number
  suggestedBudget: number
  delta: number
  confidence: number
  reasons: string[]
}

export interface BudgetRecommendationLine {
  categoryId: string
  name: string
  icon: string
  color: string
  currentBudget: number
  monthlyAverageSpent: number
  suggestedBudget: number
  delta: number
  confidence: number
  reasons: string[]
  subcategories: BudgetRecommendationSubLine[]
}

export interface BudgetRecommendationResult {
  month: string
  profile: BudgetRecommendationProfile
  targetSavingsRate: number
  incomeAverage: number
  expenseAverage: number
  suggestedTotalBudget: number
  estimatedSavingsAmount: number
  lines: BudgetRecommendationLine[]
  /** Piso mensual por categoría: patrones auto + manuales + compromisos H (EUR). */
  recurringFloorByCategoryId?: Record<string, number>
  horizons?: {
    monthlySuggestedTotal: number
    semesterSuggestedTotal: number
    annualSuggestedTotal: number
    linearScaledFromMonthly: boolean
  }
}

export interface ApiAccount {
  id: string
  name: string
  type: string
  balance: number
  currency: string
  color?: string
}

/** Datos del último extracto ING guardados al importar (cuenta con columnas de saldo). */
export interface StatementSnapshot {
  openingSaldo: number
  closingSaldo: number
  /** Variación del periodo del extracto (cierre − apertura). */
  delta: number
  firstDate: string | null
  lastDate: string | null
}

export interface DashboardData {
  balance: number
  month: string
  income: number
  expenses: number
  /** Ingresos − gastos (los gastos incluyen importes negativos del extracto, p. ej. ahorro). */
  netCashflow: number
  /** Reservado; siempre 0 (traspasos van dentro de gastos). */
  transfersToSavings: number
  /** Null si aún no has importado un Excel con columna Saldo en una cuenta. */
  statementSnapshot: StatementSnapshot | null
  categoryBreakdown: {
    categoryId: string | null
    name: string
    icon: string
    color: string
    total: number
  }[]
  /** Ingresos acumulados por categoría (misma forma que `categoryBreakdown`). */
  categoryIncomeBreakdown: {
    categoryId: string | null
    name: string
    icon: string
    color: string
    total: number
  }[]
  monthlySummary: {
    month: string
    income: number
    expenses: number
    transfers: number
    net: number
  }[]
  /**
   * Total gastos de la ventana móvil (últimos 12 meses con datos) ÷ meses con gasto en esa ventana.
   * No es la media de los 12 huecos del año ni el gasto del periodo actual.
   */
  yearlyAverageExpense: number
  /** Cantidad de meses con gasto usados en el divisor (1..12). */
  expenseMonthsWithData: number
}

/** `GET /stats/month-overview` — solo lo que consume la vista Estadísticas. */
export interface StatsMonthBarDto {
  month: string
  label: string
  expenses: number
  income: number
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
  subcategoryId: string | null
  categoryName: string
  name: string
  icon: string
  color: string
  totalYear: number
  avgPerMonth: number
}

export interface StatsRecurringExpenseDto {
  categoryId: string | null
  subcategoryId: string | null
  categoryName: string
  subcategoryName: string | null
  categoryIcon: string
  categoryColor: string
  description: string
  amount: number
  dayOfMonth: number
  occurrenceCount: number
  distinctMonthCount: number
  firstDate: string
  lastDate: string
  patternKey: string
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
  dueYm?: string | null
  dueDay?: number | null
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

export interface RecurringPatternCategoryOverride {
  patternKey: string
  categoryId: string
  subcategoryId?: string | null
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
    yearExpenseTotal: number
    yearIncomeTotal: number
    yearIncomeAvgPerMonth: number
  }
  expenseCategoryYearAvg: StatsYearAvgCategoryDto[]
  expenseSubcategoryYearAvg: StatsYearAvgSubcategoryDto[]
  incomeCategoryYearAvg: StatsYearAvgCategoryDto[]
  incomeSubcategoryYearAvg: StatsYearAvgSubcategoryDto[]
  recurringExpenses: StatsRecurringExpenseDto[]
  recurringManualMatches: StatsRecurringManualMatchDto[]
  recurringManualRules: RecurringManualRuleDto[]
  budgetPace?: BudgetPaceDto | null
  recurringDueCalendar?: StatsRecurringDueItemDto[]
  recurringDueUpcoming?: StatsRecurringDueItemDto[]
  recurringForecastTotal?: number
  recurringMissed?: StatsRecurringMissedDto[]
  kpiRecurringCoveragePct?: number | null
  plannedCommitments?: PlannedCommitmentDto[]
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext?: boolean
  hasPrev?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface SessionUser {
  id: string
  name: string
  email: string
  role?: string
  /** `calendar` = mes natural; `custom` = rango con inicio/fin/ancla. */
  monthCycleMode?: 'calendar' | 'custom'
  /** Día de inicio del periodo (1–31); en `calendar` se ignora para el corte. */
  monthCycleStartDay?: number
  /** Día de fin del periodo (1–31); en `calendar` se ignora. */
  monthCycleEndDay?: number
  /**
   * `previous` = el periodo «M» va del `startDay` del mes anterior a M al `endDay` del mes M.
   * `current` = rango dentro de M o, si inicio > fin, cruza al mes siguiente.
   */
  monthCycleAnchor?: 'previous' | 'current'
  /** Categorías de gasto excluidas del detector de recurrentes (UUIDs). */
  recurringExcludedCategoryIds?: string[]
  /** Subcategorías excluidas del detector de recurrentes (UUIDs). */
  recurringExcludedSubcategoryIds?: string[]
  /** Categorías excluidas de presupuestos. */
  budgetExcludedCategoryIds?: string[]
  /** Subcategorías excluidas de presupuestos. */
  budgetExcludedSubcategoryIds?: string[]
  /** Pattern keys recurrentes marcados como ahorro. */
  recurringSavingsPatternKeys?: string[]
  /** Categorías marcadas globalmente como ahorro. */
  recurringSavingsCategoryIds?: string[]
  /** Subcategorías marcadas globalmente como ahorro. */
  recurringSavingsSubcategoryIds?: string[]
  recurringPatternCategoryOverrides?: RecurringPatternCategoryOverride[]
  recurringManualRules?: RecurringManualRuleDto[]
  budgetPaceMode?: BudgetPaceMode
  budgetPaceThresholds?: BudgetPaceThresholds | null
}

export interface IngBankImportResult {
  imported: number
  /** Movimientos que ya existían (misma fecha, importe y concepto). */
  skippedDuplicates: number
  firstDateImported: string | null
  lastDateImported: string | null
  /** Saldo según la columna «Saldo» del último movimiento (si el Excel la traía). */
  balanceFromStatement: number | null
}

export interface WipeFinancialDataResult {
  transactions: number
  budgets: number
  subcategories: number
  categories: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: string
}

export interface AuthResult extends AuthTokens {
  user: SessionUser
}

/** URL base del API (sin barra final). Obligatoria vía `VITE_API_URL` en `.env`. */
export function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error(
      'VITE_API_URL no está definida. Copia frontend/.env.example a frontend/.env y asigna la URL del API (p. ej. http://localhost:3000/api/v1).'
    )
  }
  return raw.replace(/\/$/, '')
}

interface ApiSuccessBody<T> {
  success: boolean
  data: T
  meta?: PaginationMeta
}

export interface ApiErrorBody {
  success: false
  error: {
    code?: number | string
    message?: string
    details?: unknown
  }
}

function unwrapPaginated<T>(body: ApiSuccessBody<T[]>): PaginatedResponse<T> {
  return { data: body.data, meta: body.meta ?? { page: 1, limit: 20, total: body.data.length, totalPages: 1 } }
}

// ── API Client ───────────────────────────────────────────

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: resolveApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        delete config.headers['Content-Type']
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          const url = error.config?.url ?? ''
          const isPublicAuth =
            url.includes('/auth/login') ||
            url.includes('/auth/register') ||
            url.includes('/auth/refresh')
          if (!isPublicAuth) {
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            if (!window.location.pathname.startsWith('/login')) {
              window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
            }
          }
        }
        return Promise.reject(error)
      }
    )
  }

  /** @param month `YYYY-MM` del calendario del usuario (debe coincidir con presupuestos y copy «este mes»). */
  async getDashboard(month?: string): Promise<DashboardData> {
    const response = await this.client.get<ApiSuccessBody<DashboardData>>('/stats/dashboard', {
      params: month ? { month } : {},
    })
    return response.data.data
  }

  async getStatsMonthOverview(month?: string): Promise<StatsMonthOverviewDto> {
    const response = await this.client.get<ApiSuccessBody<StatsMonthOverviewDto>>('/stats/month-overview', {
      params: month ? { month } : {},
    })
    return response.data.data
  }

  /** Oculta un patrón recurrente hasta que haya un cargo en un mes natural posterior al mes del descarte. */
  async dismissRecurringPattern(patternKey: string): Promise<void> {
    await this.client.post('/stats/recurring-dismiss', { patternKey })
  }

  async setRecurringPatternSavings(patternKey: string, isSavings: boolean): Promise<void> {
    await this.client.post('/stats/recurring-savings', { patternKey, isSavings })
  }

  async setRecurringPatternCategory(patternKey: string, categoryId: string | null, subcategoryId: string | null): Promise<void> {
    await this.client.post('/stats/recurring-category', { patternKey, categoryId, subcategoryId })
  }

  async getRecurringManualRules(): Promise<RecurringManualRuleDto[]> {
    const response = await this.client.get<ApiSuccessBody<RecurringManualRuleDto[]>>('/stats/recurring-manual-rules')
    return response.data.data
  }

  async createRecurringManualRule(payload: {
    conceptPattern: string
    fromDay: number
    toDay: number
    minAmount?: number | null
    maxAmount?: number | null
    categoryId: string
    subcategoryId?: string | null
  }): Promise<RecurringManualRuleDto> {
    const response = await this.client.post<ApiSuccessBody<RecurringManualRuleDto>>('/stats/recurring-manual-rules', payload)
    return response.data.data
  }

  async updateRecurringManualRule(ruleId: string, payload: Partial<{
    conceptPattern: string
    fromDay: number
    toDay: number
    minAmount: number | null
    maxAmount: number | null
    categoryId: string
    subcategoryId: string | null
  }>): Promise<RecurringManualRuleDto> {
    const response = await this.client.patch<ApiSuccessBody<RecurringManualRuleDto>>(`/stats/recurring-manual-rules/${ruleId}`, payload)
    return response.data.data
  }

  async deleteRecurringManualRule(ruleId: string): Promise<void> {
    await this.client.delete(`/stats/recurring-manual-rules/${ruleId}`)
  }

  async getForecastSimulate(params: { month: string; expenseMultiplierPct?: number }): Promise<StatsForecastSimulateDto> {
    const response = await this.client.get<ApiSuccessBody<StatsForecastSimulateDto>>('/stats/forecast-simulate', {
      params: { month: params.month, expenseMultiplierPct: params.expenseMultiplierPct ?? 0 },
    })
    return response.data.data
  }

  async getPlannedCommitments(): Promise<PlannedCommitmentDto[]> {
    const response = await this.client.get<ApiSuccessBody<PlannedCommitmentDto[]>>('/stats/planned-commitments')
    return response.data.data
  }

  async createPlannedCommitment(payload: {
    label: string
    amount: number
    kind: PlannedCommitmentKind
    dueYm?: string | null
    dueDay?: number | null
    cadence?: PlannedCommitmentCadence | null
    anchorYm?: string | null
    anchorDay?: number | null
    categoryId?: string | null
    subcategoryId?: string | null
  }): Promise<PlannedCommitmentDto> {
    const response = await this.client.post<ApiSuccessBody<PlannedCommitmentDto>>('/stats/planned-commitments', payload)
    return response.data.data
  }

  async updatePlannedCommitment(
    commitmentId: string,
    payload: Partial<{
      label: string
      amount: number
      kind: PlannedCommitmentKind
      dueYm: string | null
      dueDay: number | null
      cadence: PlannedCommitmentCadence | null
      anchorYm: string | null
      anchorDay: number | null
      categoryId: string | null
      subcategoryId: string | null
    }>,
  ): Promise<PlannedCommitmentDto> {
    const response = await this.client.patch<ApiSuccessBody<PlannedCommitmentDto>>(
      `/stats/planned-commitments/${commitmentId}`,
      payload,
    )
    return response.data.data
  }

  async deletePlannedCommitment(commitmentId: string): Promise<void> {
    await this.client.delete(`/stats/planned-commitments/${commitmentId}`)
  }

  async getTransactions(params?: {
    page?: number
    limit?: number
    type?: 'income' | 'expense' | 'transfer'
    categoryId?: string
    from?: string
    to?: string
    description?: string
    importSource?: 'manual' | 'csv' | 'bank_api'
    isExcluded?: boolean
    minAmount?: number
    maxAmount?: number
    sortBy?: 'date' | 'amount' | 'description' | 'type' | 'importSource' | 'category'
    sortOrder?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<ApiTransaction>> {
    const response = await this.client.get<ApiSuccessBody<ApiTransaction[]>>('/transactions', { params })
    return unwrapPaginated(response.data)
  }

  async createTransaction(data: {
    description: string
    amount: number
    type: 'income' | 'expense' | 'transfer'
    date: string
    accountId: string
    categoryId?: string
    subcategoryId?: string
    notes?: string
    importSource?: 'manual' | 'csv' | 'bank_api'
  }): Promise<ApiTransaction> {
    const response = await this.client.post<ApiSuccessBody<ApiTransaction>>('/transactions', data)
    return response.data.data
  }

  async updateTransaction(
    id: string,
    data: {
      description?: string
      amount?: number
      type?: 'income' | 'expense' | 'transfer'
      date?: string
      categoryId?: string | null
      subcategoryId?: string | null
      notes?: string | null
    }
  ): Promise<ApiTransaction> {
    const response = await this.client.patch<ApiSuccessBody<ApiTransaction>>(`/transactions/${id}`, data)
    return response.data.data
  }

  async setTransactionExcluded(id: string, isExcluded: boolean): Promise<ApiTransaction> {
    const response = await this.client.patch<ApiSuccessBody<ApiTransaction>>(`/transactions/${id}/exclude`, { isExcluded })
    return response.data.data
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.client.delete(`/transactions/${id}`)
  }

  async getCategories(): Promise<ApiCategory[]> {
    const response = await this.client.get<ApiSuccessBody<ApiCategory[]>>('/categories')
    return response.data.data
  }

  async getBudgets(month?: string): Promise<ApiBudget[]> {
    const response = await this.client.get<ApiSuccessBody<ApiBudget[]>>('/budgets', { params: { month } })
    return response.data.data
  }

  async upsertBudget(data: {
    categoryId: string
    amount: number
    month: string
    notes?: string
  }): Promise<ApiBudget> {
    const response = await this.client.put<ApiSuccessBody<ApiBudget>>('/budgets', data)
    return response.data.data
  }

  async getSubcategoryBudgets(month?: string): Promise<ApiSubcategoryBudget[]> {
    const response = await this.client.get<ApiSuccessBody<ApiSubcategoryBudget[]>>('/budgets/subcategories', { params: { month } })
    return response.data.data
  }

  async upsertSubcategoryBudget(data: {
    subcategoryId: string
    amount: number
    month: string
  }): Promise<ApiSubcategoryBudget> {
    const response = await this.client.put<ApiSuccessBody<ApiSubcategoryBudget>>('/budgets/subcategories', data)
    return response.data.data
  }

  async getBudgetRecommendations(params: {
    month: string
    profile?: BudgetRecommendationProfile
    targetSavingsRate?: number
  }): Promise<BudgetRecommendationResult> {
    const response = await this.client.get<ApiSuccessBody<BudgetRecommendationResult>>('/budgets/recommendations', { params })
    return response.data.data
  }

  async applyBudgetRecommendations(payload: {
    month: string
    profile?: BudgetRecommendationProfile
    targetSavingsRate?: number
    mode?: 'all' | 'categories' | 'subcategories'
    categoryIds?: string[]
    subcategoryIds?: string[]
  }): Promise<{ appliedCategories: number; appliedSubcategories: number; month: string }> {
    const response = await this.client.post<ApiSuccessBody<{ appliedCategories: number; appliedSubcategories: number; month: string }>>(
      '/budgets/recommendations/apply',
      payload
    )
    return response.data.data
  }

  async getBudgetPace(month?: string): Promise<BudgetPaceDto> {
    const response = await this.client.get<ApiSuccessBody<BudgetPaceDto>>('/budgets/pace', { params: month ? { month } : {} })
    return response.data.data
  }

  async getAccounts(): Promise<ApiAccount[]> {
    const response = await this.client.get<ApiSuccessBody<ApiAccount[]>>('/accounts')
    return response.data.data
  }

  async getAlerts(params?: {
    page?: number
    limit?: number
    type?: string
  }): Promise<PaginatedResponse<ApiAlert>> {
    const response = await this.client.get<ApiSuccessBody<ApiAlert[]>>('/alerts', { params })
    return unwrapPaginated(response.data)
  }

  /** El backend expone descartar como DELETE /alerts/:id */
  async dismissAlert(id: string): Promise<void> {
    await this.client.delete(`/alerts/${id}`)
  }

  async markAlertRead(id: string): Promise<void> {
    await this.client.patch(`/alerts/${id}/read`)
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const response = await this.client.post<ApiSuccessBody<AuthResult>>('/auth/login', { email, password })
    return response.data.data
  }

  async register(payload: { name: string; email: string; password: string }): Promise<AuthResult> {
    const response = await this.client.post<ApiSuccessBody<AuthResult>>('/auth/register', payload)
    return response.data.data
  }

  async getMe(): Promise<SessionUser> {
    const response = await this.client.get<ApiSuccessBody<SessionUser>>('/auth/me')
    return response.data.data
  }

  async updateProfile(payload: {
    name?: string
    monthCycleMode?: 'calendar' | 'custom'
    monthCycleStartDay?: number
    monthCycleEndDay?: number
    monthCycleAnchor?: 'previous' | 'current'
    recurringExcludedCategoryIds?: string[] | null
    recurringExcludedSubcategoryIds?: string[] | null
    budgetExcludedCategoryIds?: string[] | null
    budgetExcludedSubcategoryIds?: string[] | null
    recurringSavingsPatternKeys?: string[] | null
    recurringSavingsCategoryIds?: string[] | null
    recurringSavingsSubcategoryIds?: string[] | null
    budgetPaceMode?: BudgetPaceMode
    budgetPaceThresholds?: BudgetPaceThresholds | null
  }): Promise<SessionUser> {
    const response = await this.client.patch<ApiSuccessBody<SessionUser>>('/auth/me', payload)
    return response.data.data
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout')
  }

  /** Borra todos los movimientos, categorías, subcategorías y presupuestos del usuario (tras validar contraseña). */
  async wipeFinancialData(password: string): Promise<WipeFinancialDataResult> {
    const response = await this.client.post<ApiSuccessBody<WipeFinancialDataResult>>(
      '/auth/me/wipe-financial-data',
      { password }
    )
    return response.data.data
  }

  /** Excel export ING «Movimientos de la Cuenta» (.xlsx). Importa todas las filas válidas del archivo. */
  async importIngBankXlsx(accountId: string, file: File): Promise<IngBankImportResult> {
    const body = new FormData()
    body.append('file', file)
    body.append('accountId', accountId)
    const response = await this.client.post<ApiSuccessBody<IngBankImportResult>>(
      '/transactions/import-ing-xlsx',
      body
    )
    return response.data.data
  }

  /** Solo actualiza el saldo de la cuenta leyendo la columna «Saldo» del último movimiento (no crea filas). */
  async syncBalanceIngBankXlsx(accountId: string, file: File): Promise<{ balance: number }> {
    const body = new FormData()
    body.append('file', file)
    body.append('accountId', accountId)
    const response = await this.client.post<ApiSuccessBody<{ balance: number }>>(
      '/transactions/sync-balance-ing-xlsx',
      body
    )
    return response.data.data
  }
}

export const api = new ApiClient()
