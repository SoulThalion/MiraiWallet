/** Misma semántica que `backend/src/utils/monthPeriod.ts` (sin acceso a BD). */

export type MonthCycleMode = 'calendar' | 'custom'
export type MonthCycleAnchor = 'previous' | 'current'

export interface MonthCycleConfig {
  mode: MonthCycleMode
  startDay: number
  endDay: number
  anchor: MonthCycleAnchor
}

export const DEFAULT_MONTH_CYCLE: MonthCycleConfig = {
  mode: 'calendar',
  startDay: 1,
  endDay: 31,
  anchor: 'previous',
}

export interface SessionMonthCycleSource {
  monthCycleMode?: string
  monthCycleStartDay?: number
  monthCycleEndDay?: number
  monthCycleAnchor?: string
}

export function monthCycleConfigFromSession(u: SessionMonthCycleSource | null | undefined): MonthCycleConfig {
  if (!u) return { ...DEFAULT_MONTH_CYCLE }
  const mode: MonthCycleMode = u.monthCycleMode === 'custom' ? 'custom' : 'calendar'
  const sd = Number(u.monthCycleStartDay)
  const ed = Number(u.monthCycleEndDay)
  const anchor: MonthCycleAnchor = u.monthCycleAnchor === 'current' ? 'current' : 'previous'
  const startDay = Number.isInteger(sd) && sd >= 1 && sd <= 31 ? sd : 1
  const endDay = Number.isInteger(ed) && ed >= 1 && ed <= 31 ? ed : 31
  return { mode, startDay, endDay, anchor }
}

export function toDateOnlyString(dateVal: unknown): string {
  if (dateVal == null || dateVal === '') return ''
  if (typeof dateVal === 'string') {
    const s = dateVal.trim().slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
  }
  if (dateVal instanceof Date && !Number.isNaN(dateVal.getTime())) {
    const y = dateVal.getFullYear()
    const m = String(dateVal.getMonth() + 1).padStart(2, '0')
    const d = String(dateVal.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(dateVal))
  return m ? m[1]! : ''
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function daysInMonth(y: number, m1to12: number): number {
  return new Date(y, m1to12, 0).getDate()
}

export function ymdInMonth(y: number, m1to12: number, day: number): string {
  const last = daysInMonth(y, m1to12)
  const d = Math.min(Math.max(1, Math.floor(day)), last)
  return `${y}-${pad2(m1to12)}-${pad2(d)}`
}

function prevMonth(y: number, m1to12: number): { y: number; m: number } {
  if (m1to12 <= 1) return { y: y - 1, m: 12 }
  return { y, m: m1to12 - 1 }
}

function nextMonth(y: number, m1to12: number): { y: number; m: number } {
  if (m1to12 >= 12) return { y: y + 1, m: 1 }
  return { y, m: m1to12 + 1 }
}

function naturalMonthBounds(y: number, month: number): { from: string; to: string } {
  const from = `${y}-${pad2(month)}-01`
  const to = ymdInMonth(y, month, 31)
  return { from, to }
}

export function ymToDateBounds(ym: string, cfg: MonthCycleConfig): { from: string; to: string } {
  const br = /^(\d{4})-(\d{2})$/.exec(ym.trim())
  if (!br) throw new Error(`Invalid YYYY-MM: ${ym}`)
  const y = parseInt(br[1]!, 10)
  const month = parseInt(br[2]!, 10)
  if (month < 1 || month > 12) throw new Error(`Invalid month in ${ym}`)

  if (cfg.mode === 'calendar') {
    return naturalMonthBounds(y, month)
  }

  const sd = Math.min(31, Math.max(1, Math.floor(cfg.startDay) || 1))
  const ed = Math.min(31, Math.max(1, Math.floor(cfg.endDay) || 1))
  const anchor = cfg.anchor

  if (anchor === 'previous') {
    const { y: py, m: pm } = prevMonth(y, month)
    const from = ymdInMonth(py, pm, sd)
    const to = ymdInMonth(y, month, ed)
    if (from > to) {
      throw new Error(`Rango de mes inválido: inicio (${from}) posterior a fin (${to})`)
    }
    return { from, to }
  }

  if (sd <= ed) {
    return { from: ymdInMonth(y, month, sd), to: ymdInMonth(y, month, ed) }
  }
  const { y: ny, m: nm } = nextMonth(y, month)
  return { from: ymdInMonth(y, month, sd), to: ymdInMonth(ny, nm, ed) }
}

export function dateToFiscalYm(dateVal: unknown, cfg: MonthCycleConfig): string {
  const day = toDateOnlyString(dateVal)
  if (!day) return ''
  if (cfg.mode === 'calendar') {
    return day.slice(0, 7)
  }
  const y = parseInt(day.slice(0, 4), 10)
  for (const yy of [y - 1, y, y + 1]) {
    for (let mo = 1; mo <= 12; mo++) {
      const ymKey = `${yy}-${String(mo).padStart(2, '0')}`
      const { from, to } = ymToDateBounds(ymKey, cfg)
      if (day >= from && day <= to) return ymKey
    }
  }
  return ''
}

/** `YYYY-MM` del periodo que contiene la fecha local `d`. */
export function fiscalYmForDate(d: Date, cfg: MonthCycleConfig): string {
  const pad2n = (n: number) => String(n).padStart(2, '0')
  const ymd = `${d.getFullYear()}-${pad2n(d.getMonth() + 1)}-${pad2n(d.getDate())}`
  return dateToFiscalYm(ymd, cfg) || ymd.slice(0, 7)
}
