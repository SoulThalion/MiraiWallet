import { describe, it, expect } from 'vitest'
import {
  ymToDateBounds,
  dateToFiscalYm,
  toDateOnlyString,
  type MonthCycleConfig,
} from '../../src/utils/monthPeriod'

const CAL: MonthCycleConfig = { mode: 'calendar', startDay: 1, endDay: 31, anchor: 'previous' }

describe('toDateOnlyString', () => {
  it('acepta string YYYY-MM-DD', () => {
    expect(toDateOnlyString('2026-04-15')).toBe('2026-04-15')
  })

  it('normaliza Date local a YYYY-MM-DD', () => {
    expect(toDateOnlyString(new Date(2026, 3, 15))).toBe('2026-04-15')
  })
})

describe('ymToDateBounds — calendar', () => {
  it('abril = mes natural', () => {
    expect(ymToDateBounds('2026-04', CAL)).toEqual({ from: '2026-04-01', to: '2026-04-30' })
  })
})

describe('ymToDateBounds — custom + previous (cobro fin de mes)', () => {
  const cfg: MonthCycleConfig = { mode: 'custom', startDay: 27, endDay: 26, anchor: 'previous' }

  it('abril = 27 mar – 26 abr', () => {
    expect(ymToDateBounds('2026-04', cfg)).toEqual({ from: '2026-03-27', to: '2026-04-26' })
  })

  it('enero cruza diciembre', () => {
    expect(ymToDateBounds('2026-01', cfg)).toEqual({ from: '2025-12-27', to: '2026-01-26' })
  })
})

describe('ymToDateBounds — custom + previous (inicio 2 fin 1)', () => {
  const cfg: MonthCycleConfig = { mode: 'custom', startDay: 2, endDay: 1, anchor: 'previous' }

  it('abril = 2 mar – 1 abr', () => {
    expect(ymToDateBounds('2026-04', cfg)).toEqual({ from: '2026-03-02', to: '2026-04-01' })
  })
})

describe('ymToDateBounds — custom + current', () => {
  it('inicio ≤ fin: todo en el mes etiquetado', () => {
    const cfg: MonthCycleConfig = { mode: 'custom', startDay: 5, endDay: 20, anchor: 'current' }
    expect(ymToDateBounds('2026-04', cfg)).toEqual({ from: '2026-04-05', to: '2026-04-20' })
  })

  it('inicio > fin: cruza al mes siguiente', () => {
    const cfg: MonthCycleConfig = { mode: 'custom', startDay: 27, endDay: 26, anchor: 'current' }
    expect(ymToDateBounds('2026-04', cfg)).toEqual({ from: '2026-04-27', to: '2026-05-26' })
  })
})

describe('dateToFiscalYm', () => {
  it('calendar = mes calendario', () => {
    expect(dateToFiscalYm('2026-04-10', CAL)).toBe('2026-04')
  })

  it('calendar con Date', () => {
    expect(dateToFiscalYm(new Date(2026, 3, 10), CAL)).toBe('2026-04')
  })

  const pay: MonthCycleConfig = { mode: 'custom', startDay: 27, endDay: 26, anchor: 'previous' }

  it('custom: fin de periodo abril', () => {
    expect(dateToFiscalYm('2026-04-26', pay)).toBe('2026-04')
    expect(dateToFiscalYm('2026-03-27', pay)).toBe('2026-04')
  })

  it('custom: ya es mayo', () => {
    expect(dateToFiscalYm('2026-04-27', pay)).toBe('2026-05')
  })
})
