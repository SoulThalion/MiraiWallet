<template>
  <div class="inline-flex flex-col gap-2">
    <button
      type="button"
      class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-blue/20 bg-light-card px-4 py-2.5 text-left text-sm font-semibold shadow-sm transition-colors hover:border-brand-blue/40 hover:bg-brand-blue/[0.06] dark:border-white/[0.1] dark:bg-dark-card dark:text-dark-txt dark:hover:border-white/[0.18] dark:hover:bg-white/[0.04] sm:min-w-[11rem]"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="openPicker"
    >
      <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/15">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-[10px] font-medium uppercase tracking-wide opacity-70">{{ buttonCaption }}</span>
        <span class="block truncate capitalize">{{ displayLabel }}</span>
      </span>
      <span class="shrink-0 text-[10px] opacity-60" aria-hidden="true">▼</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="close"
      >
        <div
          class="w-full max-h-[85dvh] overflow-y-auto rounded-t-2xl border border-brand-blue/12 bg-light-card shadow-2xl dark:border-white/[0.08] dark:bg-dark-card sm:max-w-md sm:rounded-2xl"
          @click.stop
        >
          <div class="flex items-center justify-between gap-2 border-b border-brand-blue/10 px-4 py-3 dark:border-white/[0.06]">
            <p :id="titleId" class="font-display text-sm font-bold dark:text-dark-txt text-light-txt">
              {{ dialogTitle }}
            </p>
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-xs font-semibold text-brand-blue hover:underline"
              @click="close"
            >
              Cerrar
            </button>
          </div>
          <div class="p-4">
            <div class="mb-4 flex items-center justify-between gap-2">
              <button
                type="button"
                class="rounded-lg border border-brand-blue/15 px-3 py-2 text-sm font-semibold dark:border-white/[0.1] dark:text-dark-txt"
                :disabled="pickerYear <= minYearClamped"
                :class="pickerYear <= minYearClamped ? 'cursor-not-allowed opacity-35' : 'hover:bg-brand-blue/[0.08]'"
                aria-label="Año anterior"
                @click="stepYear(-1)"
              >
                ◀
              </button>
              <span class="font-display text-lg font-extrabold tabular-nums dark:text-dark-txt text-light-txt">{{
                pickerYear
              }}</span>
              <button
                type="button"
                class="rounded-lg border border-brand-blue/15 px-3 py-2 text-sm font-semibold dark:border-white/[0.1] dark:text-dark-txt"
                :disabled="pickerYear >= maxYearClamped"
                :class="pickerYear >= maxYearClamped ? 'cursor-not-allowed opacity-35' : 'hover:bg-brand-blue/[0.08]'"
                aria-label="Año siguiente"
                @click="stepYear(1)"
              >
                ▶
              </button>
            </div>
            <p v-if="disableFutureMonths" class="mb-3 text-[10px] leading-snug dark:text-dark-txt3 text-light-txt3">
              {{ futureHint }}
            </p>
            <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <button
                v-for="mn in monthNumbers"
                :key="mn"
                type="button"
                :disabled="!isMonthSelectable(pickerYear, mn)"
                :class="[
                  'rounded-xl border py-3 text-center text-xs font-semibold capitalize transition-colors',
                  modelValue === ymKeyFromParts(pickerYear, mn)
                    ? 'border-brand-blue bg-brand-blue/15 text-brand-blue'
                    : 'border-brand-blue/10 dark:border-white/[0.08] dark:text-dark-txt2 text-light-txt2',
                  isMonthSelectable(pickerYear, mn)
                    ? 'hover:border-brand-blue/35 hover:bg-brand-blue/[0.06] dark:hover:bg-white/[0.04]'
                    : 'cursor-not-allowed opacity-35',
                ]"
                @click="selectMonth(mn)"
              >
                {{ monthShort[mn - 1] }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { formatYearMonthEs, ymKeyFromParts } from '@/utils/yearMonthDisplay'

const props = withDefaults(
  defineProps<{
    /** `YYYY-MM` */
    modelValue: string
    /** Texto pequeño sobre el valor en el botón. */
    buttonCaption?: string
    /** Título del diálogo. */
    dialogTitle?: string
    /** Aviso bajo el selector de año si `disableFutureMonths` es true. */
    futureHint?: string
    /** No permitir meses posteriores al mes calendario actual. */
    disableFutureMonths?: boolean
    /** Años hacia atrás desde `maxYear` (por defecto año actual). */
    yearsBack?: number
    /** Límite superior de año (inclusive). Por defecto año actual. */
    maxYear?: number
    /** Límite inferior de año (inclusive). Si no se pasa, `maxYear - yearsBack`. */
    minYear?: number
  }>(),
  {
    buttonCaption: 'Periodo',
    dialogTitle: 'Elegir mes',
    futureHint: 'Solo se pueden elegir meses hasta el actual (meses futuros no tienen datos).',
    disableFutureMonths: true,
    yearsBack: 25,
    maxYear: undefined,
    minYear: undefined,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const titleId = `mw-ym-picker-${Math.random().toString(36).slice(2, 9)}`

const monthShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const
const monthNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

const open = ref(false)
const pickerYear = ref(new Date().getFullYear())

const maxYearClamped = computed(() => props.maxYear ?? new Date().getFullYear())
const minYearClamped = computed(() => {
  if (props.minYear != null) return Math.min(props.minYear, maxYearClamped.value)
  return Math.min(maxYearClamped.value - props.yearsBack, maxYearClamped.value)
})

const displayLabel = computed(() => formatYearMonthEs(props.modelValue))

function isMonthSelectable(y: number, month1to12: number): boolean {
  if (!props.disableFutureMonths) return y >= minYearClamped.value && y <= maxYearClamped.value
  const now = new Date()
  const cy = now.getFullYear()
  const cm = now.getMonth() + 1
  if (y > cy) return false
  if (y < cy) return true
  return month1to12 <= cm
}

function openPicker(): void {
  const br = /^(\d{4})-(\d{2})$/.exec(props.modelValue)
  if (br) {
    const y = parseInt(br[1]!, 10)
    if (Number.isFinite(y)) {
      pickerYear.value = Math.min(Math.max(y, minYearClamped.value), maxYearClamped.value)
    }
  }
  open.value = true
}

function close(): void {
  open.value = false
}

function stepYear(delta: number): void {
  const next = pickerYear.value + delta
  pickerYear.value = Math.min(Math.max(next, minYearClamped.value), maxYearClamped.value)
}

function selectMonth(month1to12: number): void {
  if (!isMonthSelectable(pickerYear.value, month1to12)) return
  emit('update:modelValue', ymKeyFromParts(pickerYear.value, month1to12))
  close()
}

function onEscape(e: KeyboardEvent): void {
  if (e.key === 'Escape' && open.value) close()
}

watch(open, (isOpen) => {
  if (isOpen) window.addEventListener('keydown', onEscape)
  else window.removeEventListener('keydown', onEscape)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onEscape)
})
</script>
