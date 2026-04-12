<template>
  <div class="mb-3 last:mb-0">
    <div class="flex justify-between items-center mb-1">
      <span class="text-[11px] dark:text-dark-txt2 text-light-txt2">
        {{ category.icon }} {{ category.name }}
      </span>
      <span :class="['text-[11px] font-semibold', overBudget ? 'text-red-400' : 'dark:text-dark-txt text-light-txt']">
        €{{ category.spent }} / €{{ category.budget }}
      </span>
    </div>
    <div class="h-[5px] rounded-full overflow-hidden dark:bg-dark-surf bg-light-surf">
      <div
        class="h-full rounded-full transition-all duration-500"
        :style="{ width: pct + '%', background: barColor }">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Category } from '@/stores/wallet'

interface Props {
  category: Category
}

const props = defineProps<Props>()

const pct = computed<number>(() => Math.min(100, Math.round((props.category.spent / props.category.budget) * 100)))
const overBudget = computed<boolean>(() => props.category.spent > props.category.budget)
const barColor = computed<string>(() => overBudget.value ? '#E04545' : props.category.color)
</script>
