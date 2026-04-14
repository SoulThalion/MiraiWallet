import { getCurrentLocale } from '@/i18n'

/**
 * Format a number as euros
 * @param value - The numeric value to format
 * @param showSign - Whether to prefix + for positive values
 */
export function useCurrency() {
  /** Evita artefactos de coma flotante (movimientos siempre ≤ 2 decimales). */
  function roundMoney(value: number): number {
    return Math.round(value * 100) / 100
  }

  function formatEuro(value: number, showSign = false): string {
    const locale = getCurrentLocale() === 'en' ? 'en-US' : getCurrentLocale() === 'de' ? 'de-DE' : 'es-ES'
    const abs = Math.abs(value)
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(abs)
    if (showSign) return value >= 0 ? `+€${formatted}` : `-€${formatted}`
    return `€${formatted}`
  }

  /**
   * Return Tailwind color class based on sign of value
   */
  function amountColor(value: number): string {
    return value >= 0 ? 'text-brand-green' : 'text-red-400'
  }

  /**
   * Return percentage string
   */
  function formatPct(value: number): string {
    return `${Math.round(value)}%`
  }

  /**
   * Fecha solo-día desde el API (`YYYY-MM-DD` o ISO completo). Evita Invalid Date al no concatenar otra hora a un ISO.
   */
  function formatDateOnlyEs(raw: string | null | undefined): string {
    if (raw == null || raw === '') return ''
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw).trim())
    if (!m) return ''
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    const date = new Date(y, mo - 1, d)
    if (Number.isNaN(date.getTime())) return ''
    const locale = getCurrentLocale() === 'en' ? 'en-US' : getCurrentLocale() === 'de' ? 'de-DE' : 'es-ES'
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return { formatEuro, amountColor, formatPct, formatDateOnlyEs, roundMoney }
}
