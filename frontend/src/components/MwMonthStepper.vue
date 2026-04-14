<template>
  <div class="flex items-center gap-1 rounded-xl border border-brand-blue/15 px-1 py-1 dark:border-white/[0.1]">
    <button
      type="button"
      class="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-brand-blue/[0.08] dark:hover:bg-white/[0.06]"
      :aria-label="prevAriaLabel"
      @click="step(-1)"
    >
      ◀
    </button>
    <span class="min-w-[5.8rem] text-center text-xs font-semibold capitalize dark:text-dark-txt text-light-txt">
      {{ displayLabel }}
    </span>
    <button
      type="button"
      class="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-brand-blue/[0.08] dark:hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35"
      :aria-label="nextAriaLabel"
      :disabled="!canStep(1)"
      @click="step(1)"
    >
      ▶
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatYearMonthEs } from '@/utils/yearMonthDisplay'
import { fiscalYmForDate, monthCycleConfigFromSession } from '@/utils/monthPeriod'
import { useWalletStore } from '@/stores/wallet'

const props = withDefaults(defineProps<{
  modelValue: string | number
  mode?: 'month' | 'year'
  minYm?: string
  maxYm?: string
  minYear?: number
  maxYear?: number
  prevAriaLabel?: string
  nextAriaLabel?: string
}>(), {
  mode: 'month',
  minYm: '2000-01',
  maxYm: '',
  minYear: 2000,
  maxYear: undefined,
  prevAriaLabel: 'Mes anterior',
  nextAriaLabel: 'Mes siguiente',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const wallet = useWalletStore()

const effectiveMaxYm = computed(() => {
  if (props.maxYm && /^\d{4}-(0[1-9]|1[0-2])$/.test(props.maxYm)) return props.maxYm
  return fiscalYmForDate(new Date(), monthCycleConfigFromSession(wallet.user))
})

const effectiveMinYear = computed(() => props.minYear ?? 2000)
const effectiveMaxYear = computed(() => props.maxYear ?? new Date().getFullYear() + 1)

const displayLabel = computed(() => {
  if (props.mode === 'year') {
    const y = typeof props.modelValue === 'number' ? props.modelValue : parseInt(String(props.modelValue), 10)
    return Number.isFinite(y) ? String(y) : String(new Date().getFullYear())
  }
  const label = formatYearMonthEs(String(props.modelValue))
  const [m, y] = label.split(' ')
  return y ? `${m} ${y}` : label
})

function shiftYm(ym: string, deltaMonths: number): string {
  const br = /^(\d{4})-(\d{2})$/.exec(ym)
  if (!br) return ym
  const y = parseInt(br[1]!, 10)
  const m = parseInt(br[2]!, 10) - 1
  const d = new Date(y, m + deltaMonths, 1)
  const ny = d.getFullYear()
  const nm = String(d.getMonth() + 1).padStart(2, '0')
  return `${ny}-${nm}`
}

function canStep(delta: number): boolean {
  if (props.mode === 'year') {
    const y = typeof props.modelValue === 'number' ? props.modelValue : parseInt(String(props.modelValue), 10)
    if (!Number.isFinite(y)) return false
    const next = y + delta
    return next >= effectiveMinYear.value && next <= effectiveMaxYear.value
  }
  const next = shiftYm(String(props.modelValue), delta)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(next)) return false
  return next >= props.minYm && next <= effectiveMaxYm.value
}

function step(delta: number): void {
  if (!canStep(delta)) return
  if (props.mode === 'year') {
    const y = typeof props.modelValue === 'number' ? props.modelValue : parseInt(String(props.modelValue), 10)
    emit('update:modelValue', y + delta)
    return
  }
  emit('update:modelValue', shiftYm(String(props.modelValue), delta))
}
</script>
