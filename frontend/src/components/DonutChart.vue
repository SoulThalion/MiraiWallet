<template>
  <div class="flex items-center gap-4">
    <!-- SVG Donut -->
    <svg width="108" height="108" viewBox="0 0 108 108" class="flex-shrink-0">
      <!-- Track -->
      <circle cx="54" cy="54" r="36" fill="none"
              :stroke="isDark ? '#112238' : '#D4E4F5'"
              stroke-width="16"/>
      <!-- Segments -->
      <circle v-for="(seg, i) in segments" :key="i"
              cx="54" cy="54" r="36" fill="none"
              :stroke="seg.color"
              stroke-width="16"
              :stroke-dasharray="`${seg.dash} ${circumference - seg.dash}`"
              :stroke-dashoffset="-seg.offset"
              transform="rotate(-90 54 54)"/>
      <!-- Center label -->
      <text x="54" y="50" text-anchor="middle"
            :fill="isDark ? '#EEF5FF' : '#0D1F38'"
            font-size="13" font-weight="700" font-family="Nunito,sans-serif">
        {{ centerLabel }}
      </text>
      <text x="54" y="63" text-anchor="middle"
            :fill="isDark ? '#6A9CC4' : '#4A6E95'"
            font-size="9" font-family="DM Sans,sans-serif">total</text>
    </svg>

    <!-- Legend -->
    <div class="flex-1 flex flex-col gap-2">
      <div v-for="seg in segments" :key="seg.name" class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-[2px] flex-shrink-0" :style="{ background: seg.color }"></span>
        <span :class="['text-[11px] flex-1', isDark ? 'text-dark-txt2' : 'text-light-txt2']">{{ seg.name }}</span>
        <span :class="['text-[11px] font-bold', isDark ? 'text-dark-txt' : 'text-light-txt']">{{ seg.pct }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme }    from '@/composables/useTheme'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  segments:    { type: Array,  required: true },
  centerLabel: { type: String, default: '' },
})

const { isDark }      = useTheme()
const { formatEuro }  = useCurrency()
const circumference   = 2 * Math.PI * 36
</script>
