<template>
  <div :class="['alert-card', borderColor]">
    <!-- Left accent bar -->
    <div :class="['absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[3px]', accentColor]"></div>

    <!-- Icon -->
    <div :class="['w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0', iconBg]">
      {{ icon }}
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Badge -->
      <span :class="['absolute top-3 right-3 px-2 py-0.5 rounded-md text-[9px] font-bold', badgeClass]">
        {{ alert.badge }}
      </span>

      <p class="text-[13px] font-bold pr-14 dark:text-dark-txt text-light-txt">
        {{ alert.title }}
      </p>
      <p class="text-[11px] mt-1 leading-relaxed dark:text-dark-txt2 text-light-txt2">
        {{ alert.body }}
      </p>
      <p :class="['font-display font-extrabold text-sm mt-2', amountColor]">
        {{ alert.amount }}
      </p>

      <!-- Actions -->
      <div class="flex gap-2 mt-3">
        <button
          v-for="action in alert.actions" :key="action.label"
          :class="['flex-1 py-1.5 rounded-[9px] text-[11px] font-semibold transition-opacity active:opacity-80', actionClass(action.style)]"
          @click="action.style !== 'secondary' ? $emit('action', { alertId: alert.id, action: action.label }) : $emit('dismiss', alert.id)">
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Alert } from '@/stores/wallet'

interface Props {
  alert: Alert
}

interface TypeStyle {
  icon: string
  accent: string
  iconBg: string
  border: string
  amount: string
  badge: string
}

const props = defineProps<Props>()
defineEmits<{
  dismiss: [alertId: number]
  action: [{ alertId: number, action: string }]
}>()

const typeMap: Record<string, TypeStyle> = {
  danger: { icon: '⚠️', accent: 'bg-red-400', iconBg: 'bg-red-400/10', border: 'border-red-400/30', amount: 'text-red-400', badge: 'bg-red-400/10 text-red-400' },
  success: { icon: '💡', accent: 'bg-brand-green', iconBg: 'bg-brand-green/10', border: 'border-brand-green/30', amount: 'text-brand-green', badge: 'bg-brand-green/10 text-brand-green' },
  warning: { icon: '📈', accent: 'bg-brand-gold', iconBg: 'bg-brand-gold/10', border: 'border-brand-gold/30', amount: 'text-brand-gold', badge: 'bg-brand-blue/10 text-brand-blue' },
  info: { icon: 'ℹ️', accent: 'bg-brand-blue', iconBg: 'bg-brand-blue/10', border: 'border-brand-blue/30', amount: 'text-brand-blue', badge: 'bg-brand-blue/10 text-brand-blue' },
}

const t = computed<TypeStyle>(() => typeMap[props.alert.type] || typeMap.info)
const icon = computed<string>(() => t.value.icon)
const accentColor = computed<string>(() => t.value.accent)
const iconBg = computed<string>(() => t.value.iconBg)
const borderColor = computed<string>(() => t.value.border)
const amountColor = computed<string>(() => t.value.amount)
const badgeClass = computed<string>(() => t.value.badge)

function actionClass(style: string): string {
  return {
    primary: 'bg-gradient-to-r from-brand-blue-dark to-brand-blue text-white',
    success: 'bg-gradient-to-r from-brand-green-dark to-brand-green text-white',
    gold: 'bg-gradient-to-r from-yellow-600 to-brand-gold text-dark-bg',
    secondary: 'dark:bg-dark-surf dark:text-dark-txt2 bg-light-surf text-light-txt2',
  }[style] || ''
}
</script>
