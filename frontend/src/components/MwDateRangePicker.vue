<template>
  <div ref="rootRef" class="relative inline-block w-full min-w-0">
    <button
      type="button"
      :class="[
        'flex w-full min-w-0 items-center justify-between gap-1 rounded-lg border px-1.5 py-1 text-left text-xs transition-colors',
        'border-brand-blue/15 bg-light-surf text-light-txt hover:border-brand-blue/30 dark:border-white/[0.07] dark:bg-dark-surf dark:text-dark-txt dark:hover:border-brand-blue/30',
        open && 'border-brand-blue ring-1 ring-brand-blue/30 dark:ring-brand-blue/40',
      ]"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggleOpen"
    >
      <span class="truncate">{{ summaryLabel }}</span>
      <span class="flex-shrink-0 text-[10px] opacity-60" aria-hidden="true">▾</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelRef"
        class="fixed z-[100] w-[min(100vw-1.5rem,18.5rem)] rounded-2xl border p-3 shadow-xl dark:border-white/[0.07] dark:bg-dark-card bg-light-card border-brand-blue/15"
        :style="panelStyle"
        role="dialog"
        aria-label="Seleccionar rango de fechas"
        @click.stop
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-sm font-semibold transition-colors hover:bg-brand-blue/10 dark:hover:bg-white/5"
            aria-label="Mes anterior"
            :disabled="!canGoPrevMonth"
            :class="{ 'cursor-not-allowed opacity-30': !canGoPrevMonth }"
            @click="prevMonth"
          >
            ‹
          </button>
          <span class="text-center text-xs font-bold capitalize dark:text-dark-txt text-light-txt">
            {{ monthTitle }}
          </span>
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-sm font-semibold transition-colors hover:bg-brand-blue/10 dark:hover:bg-white/5"
            aria-label="Mes siguiente"
            :disabled="!canGoNextMonth"
            :class="{ 'cursor-not-allowed opacity-30': !canGoNextMonth }"
            @click="nextMonth"
          >
            ›
          </button>
        </div>

        <div class="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">
          <span v-for="d in weekDayLabels" :key="d">{{ d }}</span>
        </div>

        <div class="grid grid-cols-7 gap-0.5">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            :disabled="cell.disabled"
            :class="cellButtonClass(cell)"
            @click="onPickDay(cell)"
          >
            {{ cell.label }}
          </button>
        </div>

        <p class="mt-2 text-[10px] leading-snug dark:text-dark-txt3 text-light-txt3">
          {{ hintText }}
        </p>

        <div class="mt-3 flex gap-2 border-t border-brand-blue/10 pt-3 dark:border-white/[0.07]">
          <button
            type="button"
            class="flex-1 rounded-xl border py-2 text-xs font-semibold transition-colors dark:border-white/[0.07] dark:text-dark-txt2 dark:hover:bg-white/5"
            @click="clearRange"
          >
            Borrar rango
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-gradient-to-br from-brand-blue-dark to-brand-blue py-2 text-xs font-semibold text-white shadow-glow hover:opacity-90"
            @click="close"
          >
            Listo
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

export interface DateRangeValue {
  /** `YYYY-MM-DD` o cadena vacía */
  from: string
  /** `YYYY-MM-DD` o cadena vacía */
  to: string
}

const props = withDefaults(
  defineProps<{
    modelValue: DateRangeValue
    /** Límite superior (inclusive); por defecto hoy en calendario local. */
    maxDate?: string
    /** Límite inferior (inclusive), `YYYY-MM-DD`. */
    minDate?: string
  }>(),
  {
    maxDate: undefined,
    minDate: undefined,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: DateRangeValue]
}>()

const rootRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const open = ref(false)
const panelTop = ref(0)
const panelLeft = ref(0)

const viewYear = ref(0)
const viewMonth = ref(0)
const pendingFrom = ref<string | null>(null)

const weekDayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function todayYmd(): string {
  const d = new Date()
  return toYmd(d)
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const y = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10) - 1
  const da = parseInt(m[3], 10)
  const d = new Date(y, mo, da)
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== da) return null
  return d
}

const effectiveMax = computed(() => props.maxDate?.trim() || todayYmd())
const effectiveMin = computed(() => props.minDate?.trim() || '')

function clampViewToMax(): void {
  const maxD = parseYmd(effectiveMax.value)
  if (!maxD) return
  const cur = new Date(viewYear.value, viewMonth.value, 1)
  if (cur > maxD) {
    viewYear.value = maxD.getFullYear()
    viewMonth.value = maxD.getMonth()
  }
}

function syncViewFromModel(): void {
  const from = props.modelValue.from.trim()
  const to = props.modelValue.to.trim()
  const anchor = from || to
  if (anchor) {
    const d = parseYmd(anchor)
    if (d) {
      viewYear.value = d.getFullYear()
      viewMonth.value = d.getMonth()
      clampViewToMax()
      return
    }
  }
  const now = new Date()
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
  clampViewToMax()
}

watch(
  () => [props.modelValue.from, props.modelValue.to],
  () => {
    if (!open.value) syncViewFromModel()
  }
)

const monthTitle = computed(() => `${monthNames[viewMonth.value]} ${viewYear.value}`)

const canGoNextMonth = computed(() => {
  const maxD = parseYmd(effectiveMax.value)
  if (!maxD) return true
  const nextMonthFirst = new Date(viewYear.value, viewMonth.value + 1, 1)
  const maxMonthFirst = new Date(maxD.getFullYear(), maxD.getMonth(), 1)
  return nextMonthFirst <= maxMonthFirst
})

const canGoPrevMonth = computed(() => {
  const minS = effectiveMin.value
  if (!minS) return true
  const minD = parseYmd(minS)
  if (!minD) return true
  const curFirst = new Date(viewYear.value, viewMonth.value, 1)
  const minFirst = new Date(minD.getFullYear(), minD.getMonth(), 1)
  return curFirst > minFirst
})

interface CalendarCell {
  key: string
  ymd: string
  label: number
  inMonth: boolean
  disabled: boolean
}

const calendarCells = computed<CalendarCell[]>(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  const mondayIndex = (d: Date) => (d.getDay() + 6) % 7
  const pad = mondayIndex(first)
  const cells: CalendarCell[] = []
  const iter = new Date(y, m, 1 - pad)
  for (let i = 0; i < 42; i++) {
    const ymd = toYmd(iter)
    const inMonth = iter.getMonth() === m
    const maxD = parseYmd(effectiveMax.value)
    const minOk = !effectiveMin.value || ymd >= effectiveMin.value
    const maxOk = !maxD || iter <= maxD
    const disabled = !minOk || !maxOk
    cells.push({
      key: `${ymd}-${i}`,
      ymd,
      label: iter.getDate(),
      inMonth,
      disabled,
    })
    iter.setDate(iter.getDate() + 1)
  }
  return cells
})

const summaryLabel = computed(() => {
  const f = props.modelValue.from.trim()
  const t = props.modelValue.to.trim()
  if (!f && !t) return 'Rango de fechas'
  if (f && !t) return formatShort(f)
  if (!f && t) return formatShort(t)
  if (f === t) return formatShort(f)
  return `${formatShort(f)} – ${formatShort(t)}`
})

const hintText = computed(() => {
  if (pendingFrom.value) return 'Elige el último día del rango.'
  return 'Elige el primer día; luego el último. Mismo día = un solo día.'
})

function formatShort(ymd: string): string {
  const d = parseYmd(ymd)
  if (!d) return ymd
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isInRange(ymd: string): boolean {
  const f = props.modelValue.from.trim()
  const t = props.modelValue.to.trim()
  if (!f || !t) return false
  const a = f <= t ? f : t
  const b = f <= t ? t : f
  return ymd >= a && ymd <= b
}

function isRangeStart(ymd: string): boolean {
  const f = props.modelValue.from.trim()
  const t = props.modelValue.to.trim()
  if (!f) return false
  const a = f <= t ? f : t
  return ymd === a
}

function isRangeEnd(ymd: string): boolean {
  const f = props.modelValue.from.trim()
  const t = props.modelValue.to.trim()
  if (!t) return f === ymd
  const b = f <= t ? t : f
  return ymd === b
}

function isPending(ymd: string): boolean {
  return pendingFrom.value === ymd
}

function cellButtonClass(cell: CalendarCell): string {
  const base =
    'aspect-square max-h-9 rounded-lg text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-25 '
  if (!cell.inMonth) return `${base} dark:text-dark-txt3 text-light-txt3`
  const ymd = cell.ymd
  const inR = isInRange(ymd)
  const rs = isRangeStart(ymd)
  const re = isRangeEnd(ymd)
  const pen = isPending(ymd)
  if (pen) return `${base} bg-brand-blue text-white shadow-glow`
  if (inR) {
    if (rs || re) return `${base} bg-brand-blue text-white dark:bg-brand-blue`
    return `${base} bg-brand-blue/15 text-brand-blue dark:bg-brand-blue/20 dark:text-brand-blue`
  }
  return `${base} dark:text-dark-txt text-light-txt hover:bg-brand-blue/10 dark:hover:bg-white/5`
}

function positionPanel(): void {
  const el = rootRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const w = Math.min(window.innerWidth - 24, 296)
  let left = r.left
  if (left + w > window.innerWidth - 12) left = window.innerWidth - w - 12
  if (left < 12) left = 12
  panelTop.value = r.bottom + 6
  panelLeft.value = left
}

function toggleOpen(): void {
  open.value = !open.value
  if (open.value) {
    pendingFrom.value = null
    syncViewFromModel()
    void nextTick(() => {
      positionPanel()
    })
  }
}

function close(): void {
  open.value = false
  pendingFrom.value = null
}

function prevMonth(): void {
  if (!canGoPrevMonth.value) return
  if (viewMonth.value === 0) {
    viewYear.value -= 1
    viewMonth.value = 11
  } else {
    viewMonth.value -= 1
  }
}

function nextMonth(): void {
  if (!canGoNextMonth.value) return
  if (viewMonth.value === 11) {
    viewYear.value += 1
    viewMonth.value = 0
  } else {
    viewMonth.value += 1
  }
}

function onPickDay(cell: CalendarCell): void {
  if (cell.disabled || !cell.inMonth) return
  const ymd = cell.ymd
  if (pendingFrom.value === null) {
    pendingFrom.value = ymd
    return
  }
  let a = pendingFrom.value
  let b = ymd
  if (b < a) [a, b] = [b, a]
  emit('update:modelValue', { from: a, to: b })
  pendingFrom.value = null
}

function clearRange(): void {
  pendingFrom.value = null
  emit('update:modelValue', { from: '', to: '' })
}

const panelStyle = computed(() => ({
  top: `${panelTop.value}px`,
  left: `${panelLeft.value}px`,
}))

function onDocPointerDown(e: MouseEvent | TouchEvent): void {
  if (!open.value) return
  const t = e.target as Node
  if (rootRef.value?.contains(t)) return
  if (panelRef.value?.contains(t)) return
  close()
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && open.value) {
    e.preventDefault()
    close()
  }
}

function onWinChange(): void {
  if (open.value) positionPanel()
}

onMounted(() => {
  syncViewFromModel()
  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onWinChange)
  window.addEventListener('scroll', onWinChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onWinChange)
  window.removeEventListener('scroll', onWinChange, true)
})
</script>
