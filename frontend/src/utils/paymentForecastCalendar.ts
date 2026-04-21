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

/** Suma días a `YYYY-MM-DD` en calendario local. */
export function addDaysYmd(ymd: string, deltaDays: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return ymd.trim()
  const dt = new Date(parseInt(m[1]!, 10), parseInt(m[2]!, 10) - 1, parseInt(m[3]!, 10) + deltaDays)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** Lunes de la semana ISO (columna 0 = lunes, igual que el calendario mensual). */
export function mondayOfWeekContaining(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return ymd.trim()
  const dt = new Date(parseInt(m[1]!, 10), parseInt(m[2]!, 10) - 1, parseInt(m[3]!, 10))
  const dow = dt.getDay()
  const deltaToMonday = (dow + 6) % 7
  dt.setDate(dt.getDate() - deltaToMonday)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function weekYmdBoundsFromMonday(weekMondayYmd: string): { from: string; to: string } {
  return { from: weekMondayYmd.trim(), to: addDaysYmd(weekMondayYmd, 6) }
}

export function itemsDueInYmdRange(
  items: StatsRecurringDueItemDto[],
  fromYmd: string,
  toYmd: string,
): StatsRecurringDueItemDto[] {
  return items.filter((it) => it.dueDate >= fromYmd && it.dueDate <= toYmd)
}

/** Una fila de 7 días (lunes → domingo) con los mismos `CalCell` que el mes. */
export function buildCalendarWeekRow(
  weekMondayYmd: string,
  dueList: StatsRecurringDueItemDto[],
  todayYmd: string,
  t: (key: string) => string,
): { headers: string[]; row: CalCell[] } {
  const headers = calWeekdayHeaders(t)
  const map = dueByYmdFromList(dueList)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekMondayYmd.trim())
  if (!m) return { headers, row: [] }
  const start = new Date(parseInt(m[1]!, 10), parseInt(m[2]!, 10) - 1, parseInt(m[3]!, 10))
  const row: CalCell[] = []
  for (let i = 0; i < 7; i++) {
    const dt = new Date(start)
    dt.setDate(start.getDate() + i)
    const ymd = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    row.push({
      dayNum: dt.getDate(),
      ymd,
      items: map.get(ymd) ?? [],
      isToday: ymd === todayYmd,
    })
  }
  return { headers, row }
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
  if (source === 'movement') return 'border-l-slate-500 bg-slate-500/5 dark:bg-slate-400/10'
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

export type DetailedWeekCell = CalCell & {
  totalAmount: number
  incomeAmount: number
  expenseAmount: number
  itemCategories: { [key: string]: number }
}

export type DetailedWeekGrid = {
  headers: string[]
  days: DetailedWeekCell[]
  weekTotals: {
    totalIncome: number
    totalExpense: number
    netAmount: number
    itemCount: number
  }
}

/** Enhanced weekly grid with more detailed financial information for weekly view */
export function buildDetailedWeekGrid(
  weekMondayYmd: string,
  dueList: StatsRecurringDueItemDto[],
  todayYmd: string,
  t: (key: string) => string,
): DetailedWeekGrid {
  const headers = calWeekdayHeaders(t)
  const map = dueByYmdFromList(dueList)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekMondayYmd.trim())
  
  if (!m) return { headers, days: [], weekTotals: { totalIncome: 0, totalExpense: 0, netAmount: 0, itemCount: 0 } }
  
  const start = new Date(parseInt(m[1]!, 10), parseInt(m[2]!, 10) - 1, parseInt(m[3]!, 10))
  const days: DetailedWeekCell[] = []
  let totalIncome = 0
  let totalExpense = 0
  let totalItemCount = 0
  
  for (let i = 0; i < 7; i++) {
    const dt = new Date(start)
    dt.setDate(start.getDate() + i)
    const ymd = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    const dayItems = map.get(ymd) ?? []
    
    let dayIncome = 0
    let dayExpense = 0
    const categories: { [key: string]: number } = {}
    
    for (const item of dayItems) {
      // Determine if income or expense based on source and label patterns
      let isIncome = false
      
      if (item.source === 'movement') {
        // For movements, check the label prefix (↑ for income, ↓ for expense)
        isIncome = item.label.startsWith('↑')
      } else {
        // For recurring items (auto, manual, planned), treat as expenses by default
        // Only treat as income if explicitly marked with ↑ in the label
        isIncome = item.label.startsWith('↑')
      }
      
      if (isIncome) {
        dayIncome += item.amount
        totalIncome += item.amount
      } else {
        dayExpense += item.amount
        totalExpense += item.amount
      }
      
      // Group by source type for category breakdown
      const category = item.source
      categories[category] = (categories[category] || 0) + item.amount
    }
    
    totalItemCount += dayItems.length
    
    days.push({
      dayNum: dt.getDate(),
      ymd,
      items: dayItems,
      isToday: ymd === todayYmd,
      totalAmount: dayIncome - dayExpense,
      incomeAmount: dayIncome,
      expenseAmount: dayExpense,
      itemCategories: categories
    })
  }
  
  return {
    headers,
    days,
    weekTotals: {
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      itemCount: totalItemCount
    }
  }
}
