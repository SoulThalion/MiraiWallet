<template>
  <div :class="['rounded-[' + radius + 'px] bg-gradient-to-br from-brand-blue-dark to-brand-blue flex items-center justify-center flex-shrink-0', sizeClass]"
       :style="{ boxShadow: '0 4px 16px rgba(0,71,204,0.4)' }">
    <svg :width="svgSize" :height="Math.round(svgSize * 0.87)"
         viewBox="0 0 60 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Wallet body -->
      <rect x="4" y="16" width="50" height="32" rx="6" fill="white" fill-opacity="0.92"/>
      <!-- Wallet flap -->
      <rect x="4" y="10" width="50" height="10" rx="4" fill="white" fill-opacity="0.65"/>
      <!-- Button -->
      <circle cx="30" cy="38" r="4" fill="#1A8CFF" fill-opacity="0.75"/>
      <!-- Coins -->
      <ellipse cx="22" cy="13" rx="6" ry="6" fill="#F5C842"/>
      <ellipse cx="22" cy="13" rx="4.5" ry="4.5" fill="#FFD95A"/>
      <ellipse cx="30" cy="10" rx="6" ry="6" fill="#F5C842"/>
      <ellipse cx="30" cy="10" rx="4.5" ry="4.5" fill="#FFD95A"/>
      <ellipse cx="38" cy="13" rx="5" ry="5" fill="#F0BA2A"/>
      <!-- Arrow trend line -->
      <polyline points="10,34 20,24 28,30 44,14"
                stroke="#2EC776" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <polygon points="44,14 50,12 48,18" fill="#2EC776"/>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: { type: String, default: 'md' } // sm | md | lg
})

const sizeClass = computed(() => ({
  sm: 'w-9 h-9',
  md: 'w-14 h-14',
  lg: 'w-24 h-24',
}[props.size]))

const svgSize = computed(() => ({ sm: 20, md: 32, lg: 56 }[props.size]))
const radius  = computed(() => ({ sm: 10, md: 14, lg: 24 }[props.size]))
</script>
