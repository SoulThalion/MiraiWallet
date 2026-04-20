import type { StatsRecurringDueItemDto } from '@/services/api'

export type CalCell = {
  dayNum: number | null
  ymd: string | null
  items: StatsRecurringDueItemDto[]
  isToday: boolean
}

export function calWeekdayHeaders(t: (key: string) => string): string[] {
  return [
    t('stats.calWeek0'),
    t('stats.calWeek1'),
    t('stats.calWeek2'),
    t('stats.calWeek3'),
    t('stats.calWeek4'),
    t('stats.calWeek5'),
    t('stats.calWeek6'),
  ]
}

export function dueByYmdFromList(dueList: StatsRecurringDueItemDto[]): Map<string, StatsRecurringDueItemDto[]> {
  const m = new Map<string, StatsRecurringDueItemDto[]>()
  for (const row of dueList) {
    const arr = m.get(row.dueDate) ?? []
    arr.push(row)
    m.set(row.dueDate, arr)
  }
  return m
}

export function buildCalendarMonthGrid(
  ym: string,
  dueList: StatsRecurringDueItemDto[],
  todayYmd: string,
  t: (key: string) => string,
): { headers: string[]; weekRows: CalCell[][] } {
  const headers = calWeekdayHeaders(t)
  const match = /^(\d{4})-(\d{2})$/.exec(ym)
  if (!match) return { headers, weekRows: [] }
  const y = parseInt(match[1]!, 10)
  const mo = parseInt(match[2]!, 10) - 1
  const first = new Date(y, mo, 1)
  const dim = new Date(y, mo + 1, 0).getDate()
  const dow = first.getDay()
  const startPad = (dow + 6) % 7
  const cells: CalCell[] = []
  for (let i = 0; i < startPad; i++) {
    cells.push({ dayNum: null, ymd: null, items: [], isToday: false })
  }
  const map = dueByYmdFromList(dueList)
  for (let d = 1; d <= dim; d++) {
    const ymd = `${ym}-${String(d).padStart(2, '0')}`
    cells.push({ dayNum: d, ymd, items: map.get(ymd) ?? [], isToday: ymd === todayYmd })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dayNum: null, ymd: null, items: [], isToday: false })
  }
  const weekRows: CalCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weekRows.push(cells.slice(i, i + 7))
  }
  return { headers, weekRows }
}

export function dueSourceStripeClass(source: string): string {
  if (source === 'manual') return 'border-l-brand-green bg-brand-green/5 dark:bg-brand-green/10'
  if (source === 'planned') return 'border-l-violet-500 bg-violet-500/5 dark:bg-violet-400/10'
  return 'border-l-brand-blue bg-brand-blue/5 dark:bg-brand-blue/10'
}

export function shiftYm(ym: string, deltaMonths: number): string {
  const br = /^(\d{4})-(\d{2})$/.exec(ym.trim())
  if (!br) return ym
  const y = parseInt(br[1]!, 10)
  const m = parseInt(br[2]!, 10) - 1
  const d = new Date(y, m + deltaMonths, 1)
  const ny = d.getFullYear()
  const nm = String(d.getMonth() + 1).padStart(2, '0')
  return `${ny}-${nm}`
}
