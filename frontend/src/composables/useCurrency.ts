/**
 * Format a number as euros
 * @param value - The numeric value to format
 * @param showSign - Whether to prefix + for positive values
 */
export function useCurrency() {
  function formatEuro(value: number, showSign = false): string {
    const abs = Math.abs(value)
    const formatted = new Intl.NumberFormat('es-ES', {
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

  return { formatEuro, amountColor, formatPct }
}
