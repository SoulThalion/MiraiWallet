<template>
  <div class="!p-0 overflow-hidden">
    <div class="flex flex-wrap items-end justify-start gap-1 px-0 pt-0">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="relative -mb-px rounded-t-xl border px-3 py-2 text-xs font-semibold transition-colors"
        :class="modelValue === tab.id
          ? 'border-b-transparent border-brand-blue/35 bg-brand-blue/12 text-brand-blue shadow-sm'
          : 'dark:border-white/[0.10] border-brand-blue/15 dark:bg-dark-surf/40 bg-light-surf/70 dark:text-dark-txt2 text-light-txt2 hover:border-brand-blue/30'"
        @click="emit('update:modelValue', tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface BookmarkTabItem {
  id: string
  label: string
}

defineProps<{
  tabs: BookmarkTabItem[]
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>
