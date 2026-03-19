// composables/useCurrency.js
export function useCurrency() {
  /**
   * Format a number as euros
   * @param {number} value
   * @param {boolean} showSign - prefix + for positives
   */
  function formatEuro(value, showSign = false) {
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
  function amountColor(value) {
    return value >= 0 ? 'text-brand-green' : 'text-red-400'
  }

  /**
   * Return percentage string
   */
  function formatPct(value) {
    return `${Math.round(value)}%`
  }

  return { formatEuro, amountColor, formatPct }
}
