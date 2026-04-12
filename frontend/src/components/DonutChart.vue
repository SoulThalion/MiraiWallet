<template>
  <div class="flex items-center gap-4">
    <!-- SVG Donut -->
    <svg width="108" height="108" viewBox="0 0 108 108" class="flex-shrink-0">
      <!-- Track -->
      <circle cx="54" cy="54" r="36" fill="none"
              class="dark:stroke-[#112238] stroke-[#D4E4F5]"
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
            class="dark:fill-[#EEF5FF] fill-[#0D1F38]"
            font-size="13" font-weight="700" font-family="Nunito,sans-serif">
        {{ centerLabel }}
      </text>
      <text x="54" y="63" text-anchor="middle"
            class="dark:fill-[#6A9CC4] fill-[#4A6E95]"
            font-size="9" font-family="DM Sans,sans-serif">total</text>
    </svg>

    <!-- Legend -->
    <div class="flex-1 flex flex-col gap-2">
      <div v-for="seg in segments" :key="seg.name" class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-[2px] flex-shrink-0" :style="{ background: seg.color }"></span>
        <span class="text-[11px] flex-1 dark:text-dark-txt2 text-light-txt2">{{ seg.name }}</span>
        <span class="text-[11px] font-bold dark:text-dark-txt text-light-txt">{{ seg.pct }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DonutSegment } from '@/stores/wallet'

interface Props {
  segments: DonutSegment[]
  centerLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  centerLabel: ''
})

const circumference = 2 * Math.PI * 36
</script>
