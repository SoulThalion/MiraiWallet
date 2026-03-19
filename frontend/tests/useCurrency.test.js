import { describe, it, expect } from 'vitest'
import { useCurrency }          from '@/composables/useCurrency'

describe('useCurrency', () => {
  const { formatEuro, amountColor, formatPct } = useCurrency()

  describe('formatEuro(value)', () => {
    it('formats a positive number with € prefix', () => {
      expect(formatEuro(1000)).toBe('€1.000,00')
    })

    it('formats a decimal correctly', () => {
      expect(formatEuro(87.4)).toBe('€87,40')
    })

    it('always shows absolute value (no sign by default)', () => {
      expect(formatEuro(-200)).toBe('€200,00')
    })

    it('adds + sign for positives when showSign = true', () => {
      expect(formatEuro(3200, true)).toBe('+€3.200,00')
    })

    it('adds − sign for negatives when showSign = true', () => {
      expect(formatEuro(-87.4, true)).toBe('-€87,40')
    })

    it('handles zero', () => {
      expect(formatEuro(0)).toBe('€0,00')
    })
  })

  describe('amountColor(value)', () => {
    it('returns green class for positive value', () => {
      expect(amountColor(100)).toContain('green')
    })

    it('returns red class for negative value', () => {
      expect(amountColor(-50)).toContain('red')
    })

    it('returns green class for zero', () => {
      expect(amountColor(0)).toContain('green')
    })
  })

  describe('formatPct(value)', () => {
    it('returns rounded percentage string', () => {
      expect(formatPct(34.7)).toBe('35%')
    })

    it('handles integer input', () => {
      expect(formatPct(50)).toBe('50%')
    })

    it('handles zero', () => {
      expect(formatPct(0)).toBe('0%')
    })
  })
})
