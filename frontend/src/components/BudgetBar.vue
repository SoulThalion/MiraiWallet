<template>
  <div class="mb-3 last:mb-0">
    <div class="flex justify-between items-center mb-1">
      <span :class="['text-[11px]', isDark ? 'text-dark-txt2' : 'text-light-txt2']">
        {{ category.icon }} {{ category.name }}
      </span>
      <span :class="['text-[11px] font-semibold', overBudget ? 'text-red-400' : (isDark ? 'text-dark-txt' : 'text-light-txt')]">
        €{{ category.spent }} / €{{ category.budget }}
      </span>
    </div>
    <div :class="['h-[5px] rounded-full overflow-hidden', isDark ? 'bg-dark-surf' : 'bg-light-surf']">
      <div
        class="h-full rounded-full transition-all duration-500"
        :style="{ width: pct + '%', background: barColor }">
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  category: { type: Object, required: true }
})

const { isDark } = useTheme()

const pct        = computed(() => Math.min(100, Math.round((props.category.spent / props.category.budget) * 100)))
const overBudget = computed(() => props.category.spent > props.category.budget)
const barColor   = computed(() => overBudget.value ? '#E04545' : props.category.color)
</script>
