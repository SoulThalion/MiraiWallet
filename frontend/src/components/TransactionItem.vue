<template>
  <div :class="['mw-card flex items-center gap-3 !p-3 hover:border-brand-blue/20 transition-colors cursor-default']">
    <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 dark:bg-dark-surf bg-light-surf">
      {{ tx.icon }}
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold truncate dark:text-dark-txt text-light-txt">{{ tx.name }}</p>
      <p class="text-[10px] mt-0.5 dark:text-dark-txt2 text-light-txt2">{{ tx.category }}</p>
    </div>
    <div class="text-right flex-shrink-0">
      <p :class="['text-sm font-bold', amountColor(tx.amount)]">{{ formatEuro(tx.amount, true) }}</p>
      <p class="text-[10px] mt-0.5 dark:text-dark-txt3 text-light-txt3">{{ tx.date }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from '@/composables/useCurrency'
import type { Transaction } from '@/stores/wallet'

interface Props {
  tx: Transaction
}

defineProps<Props>()
const { formatEuro, amountColor } = useCurrency()
</script>
