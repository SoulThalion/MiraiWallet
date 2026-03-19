<template>
  <div :class="['mw-card flex items-center gap-3 !p-3 hover:border-brand-blue/20 transition-colors cursor-default']">
    <div :class="['w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0', isDark ? 'bg-dark-surf' : 'bg-light-surf']">
      {{ tx.icon }}
    </div>
    <div class="flex-1 min-w-0">
      <p :class="['text-sm font-semibold truncate', isDark ? 'text-dark-txt' : 'text-light-txt']">{{ tx.name }}</p>
      <p :class="['text-[10px] mt-0.5', isDark ? 'text-dark-txt2' : 'text-light-txt2']">{{ tx.category }}</p>
    </div>
    <div class="text-right flex-shrink-0">
      <p :class="['text-sm font-bold', amountColor(tx.amount)]">{{ formatEuro(tx.amount, true) }}</p>
      <p :class="['text-[10px] mt-0.5', isDark ? 'text-dark-txt3' : 'text-light-txt3']">{{ tx.date }}</p>
    </div>
  </div>
</template>

<script setup>
import { useTheme }    from '@/composables/useTheme'
import { useCurrency } from '@/composables/useCurrency'
defineProps({ tx: { type: Object, required: true } })
const { isDark }                  = useTheme()
const { formatEuro, amountColor } = useCurrency()
</script>
