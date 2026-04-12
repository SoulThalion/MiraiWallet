<template>
  <div class="flex h-full min-h-[6rem] w-full items-stretch gap-1 sm:gap-2">
    <Tooltip
      v-for="bar in bars"
      :key="bar.month"
      :wrapper-class="['mw-bar-col', 'min-h-0', 'min-w-0', 'flex-1', 'flex-col', 'items-stretch', 'gap-0.5']"
    >
      <span class="shrink-0 text-center text-[9px] leading-none dark:text-dark-txt3 text-light-txt3">
        {{ formatK(bar.amount) }}
      </span>
      <div class="relative flex min-h-0 w-full flex-1 flex-col justify-end">
        <div
          data-testid="bar-fill"
          :class="['w-full rounded-t-[5px] transition-all duration-300',
                   bar.selected ? 'ring-2 ring-amber-400/90 ring-offset-1 ring-offset-light-card dark:ring-offset-dark-card' : '',
                   bar.current && !bar.selected ? 'border border-brand-blue/50' : '']"
          :style="barBlockStyle(bar)"
          class="dark:!bg-[#0E2340]">
        </div>
      </div>
      <span
        :class="['shrink-0 text-center text-[9px] font-semibold leading-none',
                 bar.current || bar.selected
                   ? 'text-brand-blue'
                   : 'dark:text-dark-txt2 text-light-txt2']">
        {{ bar.month }}
      </span>

      <template #content>
        <div class="space-y-1 text-[10px] leading-snug">
          <p class="font-display font-bold text-light-txt dark:text-dark-txt">{{ bar.month }}</p>
          <p class="text-light-txt2 dark:text-dark-txt2">
            Gastos
            <span class="ml-1 tabular-nums font-semibold text-light-txt dark:text-dark-txt">{{ formatEuro(bar.amount, false) }}</span>
          </p>
          <template v-if="hasMonthFinance(bar)">
            <p class="text-light-txt2 dark:text-dark-txt2">
              Ingresos
              <span class="ml-1 tabular-nums font-semibold text-light-txt dark:text-dark-txt">{{ formatEuro(monthIncome(bar), false) }}</span>
            </p>
            <p class="text-light-txt2 dark:text-dark-txt2">
              Neto
              <span
                class="ml-1 tabular-nums font-semibold"
                :class="amountColor(monthNet(bar))"
              >{{ formatEuro(monthNet(bar), true) }}</span>
            </p>
          </template>
        </div>
      </template>
    </Tooltip>
  </div>
</template>

<script setup lang="ts">
import type { MonthlyData } from '@/stores/wallet'
import { useCurrency } from '@/composables/useCurrency'
import Tooltip from '@/components/Tooltip.vue'

interface Props {
  bars: MonthlyData[]
  maxVal: number
}

const props = defineProps<Props>()
const { formatEuro, amountColor } = useCurrency()

function hasMonthFinance(bar: MonthlyData): boolean {
  return typeof bar.income === 'number' || typeof bar.net === 'number'
}

function monthIncome(bar: MonthlyData): number {
  return typeof bar.income === 'number' ? bar.income : 0
}

function monthNet(bar: MonthlyData): number {
  if (typeof bar.net === 'number') return bar.net
  if (typeof bar.income === 'number') return bar.income - bar.amount
  return 0
}

function barFillPercent(amount: number): number {
  const denom = Math.max(props.maxVal, 1)
  return Math.min(100, Math.round((amount / denom) * 1000) / 10)
}

function barBlockStyle(bar: MonthlyData): Record<string, string> {
  const pct = barFillPercent(bar.amount)
  const h = pct <= 0 ? '0%' : `${pct}%`
  const minH = bar.amount > 0 && pct < 1 ? '3px' : '0'
  return {
    height: h,
    minHeight: minH,
    background:
      bar.current || bar.selected
        ? 'linear-gradient(0deg,#0047CC,#1A8CFF)'
        : 'var(--bar-bg, #D4E4F5)',
  }
}
function formatK(val: number): string {
  return val >= 1000 ? (val / 1000).toFixed(1).replace('.0', '') + 'k' : String(val)
}
</script>
