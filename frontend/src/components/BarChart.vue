<template>
  <div class="flex items-end gap-2" style="height: 96px;">
    <div v-for="bar in bars" :key="bar.month" class="flex-1 flex flex-col items-center gap-1">
      <span :class="['text-[9px]', isDark ? 'text-dark-txt3' : 'text-light-txt3']">
        {{ formatK(bar.amount) }}
      </span>
      <div class="w-full relative flex items-end" style="height: 72px;">
        <div
          :class="['w-full rounded-t-[5px] transition-all duration-300',
                   bar.current ? 'border border-brand-blue/50' : '']"
          :style="{
            height: barHeight(bar.amount) + 'px',
            background: bar.current
              ? 'linear-gradient(0deg,#0047CC,#1A8CFF)'
              : (isDark ? '#0E2340' : '#D4E4F5')
          }">
        </div>
      </div>
      <span :class="['text-[9px] font-semibold',
                     bar.current
                       ? 'text-brand-blue'
                       : (isDark ? 'text-dark-txt2' : 'text-light-txt2')]">
        {{ bar.month }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  bars:   { type: Array,  required: true },
  maxVal: { type: Number, required: true },
})

const { isDark } = useTheme()
const MAX_H = 72

function barHeight(amount) {
  return Math.round((amount / props.maxVal) * MAX_H)
}
function formatK(val) {
  return val >= 1000 ? (val / 1000).toFixed(1).replace('.0', '') + 'k' : val
}
</script>
