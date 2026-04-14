export interface ApiErrorPayload {
  code?: number | string
  message?: string
  details?: unknown
}

export interface ApiErrorBody {
  success?: boolean
  error?: ApiErrorPayload
}

const ERROR_CODE_TO_I18N_KEY: Record<number, string> = {
  2006: 'errors.auth.invalidCredentials',
  2005: 'errors.auth.emailAlreadyRegistered',
  2002: 'errors.auth.tokenMissing',
  2003: 'errors.auth.tokenInvalid',
  2001: 'errors.auth.unauthorized',
  2004: 'errors.auth.forbidden',
  2009: 'errors.auth.currentPasswordInvalid',
  2007: 'errors.auth.refreshTokenInvalid',
  2008: 'errors.auth.refreshTokenRevoked',

  4001: 'errors.import.readFailed',
  4002: 'errors.import.noSheets',
  4003: 'errors.import.tableNotFound',
  4004: 'errors.import.headersIncomplete',
  4005: 'errors.import.noValidRows',
  4006: 'errors.import.balanceColumnInvalid',

  3005: 'errors.transaction.notFound',
  3101: 'errors.transaction.editOnlyManual',
  3102: 'errors.transaction.categoryRequiredForExpense',

  3001: 'errors.account.notFound',
  3002: 'errors.category.notFound',
  3003: 'errors.budget.notFound',
  3004: 'errors.alert.notFound',

  5001: 'errors.profile.monthCycleInvalid',
  5002: 'errors.profile.monthCycleDateRangeInvalid',
  5003: 'errors.profile.monthCycleModeInvalid',
  5004: 'errors.profile.monthCycleStartInvalid',
  5005: 'errors.profile.monthCycleEndInvalid',
  5006: 'errors.profile.monthCycleAnchorInvalid',
  5013: 'errors.profile.budgetExcludedCategoryIdsInvalid',
  5014: 'errors.profile.budgetExcludedCategoryIdInvalid',
  5015: 'errors.profile.budgetExcludedCategoryUnknown',
  5016: 'errors.profile.budgetExcludedSubcategoryIdsInvalid',
  5017: 'errors.profile.budgetExcludedSubcategoryIdInvalid',
  5018: 'errors.profile.budgetExcludedSubcategoryUnknown',

  1001: 'errors.validation.requestValidationFailed',
  1002: 'errors.validation.entityValidationFailed',
  1003: 'errors.common.routeNotFound',
  1004: 'errors.common.internalError',
  9001: 'errors.common.internalError',
}

export function extractApiErrorCode(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null
  const body = (err as { response?: { data?: ApiErrorBody } }).response?.data
  const code = body?.error?.code
  if (typeof code === 'number' && Number.isFinite(code)) return code
  if (typeof code === 'string' && code.trim()) {
    const parsed = Number(code)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function resolveApiErrorI18nKey(err: unknown, fallbackKey = 'errors.common.unknown'): string {
  const code = extractApiErrorCode(err)
  if (!code) return fallbackKey
  return ERROR_CODE_TO_I18N_KEY[code] ?? fallbackKey
}

