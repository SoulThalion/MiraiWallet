<template>
  <Tooltip wrapper-class="inline-flex">
    <button
      type="button"
      :aria-label="ariaLabel"
      class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-brand-blue/25 text-[10px] font-bold text-brand-blue/90 dark:border-white/[0.2] dark:text-dark-txt2"
    >i</button>
    <template #content>
      <p class="text-[11px] leading-relaxed">{{ text }}</p>
    </template>
  </Tooltip>
</template>

<script setup lang="ts">
import Tooltip from '@/components/Tooltip.vue'

withDefaults(
  defineProps<{
    text: string
    ariaLabel?: string
  }>(),
  {
    ariaLabel: 'Info',
  }
)
</script>
