<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed bottom-3 right-3 z-[100] flex w-[min(92vw,24rem)] flex-col gap-2 md:bottom-5 md:right-6">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto rounded-xl border px-3 py-2 shadow-xl backdrop-blur-sm"
          :class="toast.type === 'success'
            ? 'border-brand-green/35 bg-brand-green/12 text-brand-green'
            : 'border-red-500/35 bg-red-500/12 text-red-400'"
          role="status"
          aria-live="polite"
        >
          <div class="flex items-start gap-2">
            <p class="flex-1 text-xs font-semibold leading-relaxed">{{ toast.message }}</p>
            <button
              type="button"
              class="rounded-md px-1.5 py-0.5 text-[10px] font-bold opacity-80 transition-opacity hover:opacity-100"
              @click="dismiss(toast.id)"
            >
              ×
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.18s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
