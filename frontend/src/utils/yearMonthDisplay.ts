const MONTH_SHORT_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const

/** Etiqueta corta en español: `ene 2026` a partir de `YYYY-MM`. */
export function formatYearMonthEs(ym: string): string {
  const br = /^(\d{4})-(\d{2})$/.exec(ym.trim())
  if (!br) return ym
  const y = parseInt(br[1]!, 10)
  const m = parseInt(br[2]!, 10)
  if (!Number.isFinite(y) || m < 1 || m > 12) return ym
  return `${MONTH_SHORT_ES[m - 1]!} ${y}`
}

export function ymKeyFromParts(y: number, month1to12: number): string {
  return `${y}-${String(month1to12).padStart(2, '0')}`
}
