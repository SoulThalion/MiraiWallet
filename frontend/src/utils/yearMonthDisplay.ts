import { getCurrentLocale } from '@/i18n'

/** Etiqueta corta en español: `ene 2026` a partir de `YYYY-MM`. */
export function formatYearMonthEs(ym: string): string {
  const br = /^(\d{4})-(\d{2})$/.exec(ym.trim())
  if (!br) return ym
  const y = parseInt(br[1]!, 10)
  const m = parseInt(br[2]!, 10)
  if (!Number.isFinite(y) || m < 1 || m > 12) return ym
  const locale = getCurrentLocale() === 'en' ? 'en-US' : getCurrentLocale() === 'de' ? 'de-DE' : 'es-ES'
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'short', year: 'numeric' })
}

export function ymKeyFromParts(y: number, month1to12: number): string {
  return `${y}-${String(month1to12).padStart(2, '0')}`
}
