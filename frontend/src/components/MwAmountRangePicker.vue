<template>
  <div ref="rootRef" class="relative inline-block w-full min-w-0">
    <button
      type="button"
      :class="[
        'flex w-full min-w-0 items-center justify-between gap-1 rounded-lg border px-1.5 py-1 text-left text-xs transition-colors',
        'border-brand-blue/15 bg-light-surf text-light-txt hover:border-brand-blue/30 dark:border-white/[0.07] dark:bg-dark-surf dark:text-dark-txt dark:hover:border-brand-blue/30',
        open && 'border-brand-blue ring-1 ring-brand-blue/30 dark:ring-brand-blue/40',
      ]"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggleOpen"
    >
      <span class="truncate">{{ summaryLabel }}</span>
      <span class="flex-shrink-0 text-[10px] opacity-60" aria-hidden="true">▾</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelRef"
        class="fixed z-[100] w-[min(100vw-1.5rem,18.5rem)] rounded-2xl border p-3 shadow-xl dark:border-white/[0.07] dark:bg-dark-card bg-light-card border-brand-blue/15"
        :style="panelStyle"
        role="dialog"
        :aria-label="t('amountRange.dialogAria')"
        @click.stop
      >
        <p class="mb-2 text-xs font-bold dark:text-dark-txt text-light-txt">{{ t('amountRange.title') }}</p>

        <div class="flex flex-col gap-2">
          <div>
            <label class="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">{{ t('amountRange.min') }}</label>
            <input
              v-model="draftMin"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              :placeholder="t('amountRange.exampleMin')"
              :class="filterInputClass"
            />
          </div>
          <div>
            <label class="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide dark:text-dark-txt3 text-light-txt3">{{ t('amountRange.max') }}</label>
            <input
              v-model="draftMax"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              :placeholder="t('amountRange.exampleMax')"
              :class="filterInputClass"
            />
          </div>
        </div>

        <p class="mt-2 text-[10px] leading-snug dark:text-dark-txt3 text-light-txt3">
          {{ t('amountRange.hint') }}
        </p>

        <div class="mt-3 flex gap-2 border-t border-brand-blue/10 pt-3 dark:border-white/[0.07]">
          <button
            type="button"
            class="flex-1 rounded-xl border py-2 text-xs font-semibold transition-colors dark:border-white/[0.07] dark:text-dark-txt2 dark:hover:bg-white/5"
            @click="clearRange"
          >
            {{ t('amountRange.clear') }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-gradient-to-br from-brand-blue-dark to-brand-blue py-2 text-xs font-semibold text-white shadow-glow hover:opacity-90"
            @click="applyAndClose"
          >
            {{ t('amountRange.done') }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

export interface AmountRangeValue {
  /** Número como texto (p. ej. `12.5` o vacío). */
  min: string
  max: string
}

const props = defineProps<{
  modelValue: AmountRangeValue
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AmountRangeValue]
}>()
const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const open = ref(false)
const panelTop = ref(0)
const panelLeft = ref(0)

const draftMin = ref('')
const draftMax = ref('')

const filterInputClass =
  'w-full min-w-0 rounded-lg border border-brand-blue/15 bg-light-surf px-2 py-1.5 text-sm text-light-txt dark:border-white/[0.07] dark:bg-dark-surf dark:text-dark-txt'

function formatEuroLabel(n: number): string {
  return `${n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`
}

function parseEuro(s: string): number | undefined {
  let t = s.trim().replace(/\s/g, '')
  if (t === '') return undefined
  if (t.includes(',') && t.includes('.')) {
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) t = t.replace(/\./g, '').replace(',', '.')
    else t = t.replace(/,/g, '')
  } else if (t.includes(',')) {
    t = t.replace(',', '.')
  }
  const n = parseFloat(t)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

const summaryLabel = computed(() => {
  const minS = props.modelValue.min.trim()
  const maxS = props.modelValue.max.trim()
  if (!minS && !maxS) return t('amountRange.placeholder')
  const minN = parseEuro(minS)
  const maxN = parseEuro(maxS)
  if (minN !== undefined && maxN !== undefined) {
    if (minN === maxN) return formatEuroLabel(minN)
    return `${formatEuroLabel(minN)} – ${formatEuroLabel(maxN)}`
  }
  if (minN !== undefined) return `≥ ${formatEuroLabel(minN)}`
  if (maxN !== undefined) return `≤ ${formatEuroLabel(maxN)}`
  return t('amountRange.placeholder')
})

const panelStyle = computed(() => ({
  top: `${panelTop.value}px`,
  left: `${panelLeft.value}px`,
}))

function syncDraftsFromModel(): void {
  draftMin.value = props.modelValue.min
  draftMax.value = props.modelValue.max
}

function positionPanel(): void {
  const el = rootRef.value
  if (!el) return
  const w = Math.min(window.innerWidth - 24, 296)
  let left = el.getBoundingClientRect().left
  if (left + w > window.innerWidth - 12) left = window.innerWidth - w - 12
  if (left < 12) left = 12
  panelTop.value = el.getBoundingClientRect().bottom + 6
  panelLeft.value = left
}

function toggleOpen(): void {
  open.value = !open.value
  if (open.value) {
    syncDraftsFromModel()
    void nextTick(() => positionPanel())
  }
}

function close(): void {
  open.value = false
}

function applyAndClose(): void {
  let minN = parseEuro(draftMin.value)
  let maxN = parseEuro(draftMax.value)
  if (minN !== undefined && maxN !== undefined && minN > maxN) {
    const t = minN
    minN = maxN
    maxN = t
  }
  emit('update:modelValue', {
    min: minN !== undefined ? String(minN) : '',
    max: maxN !== undefined ? String(maxN) : '',
  })
  close()
}

function clearRange(): void {
  draftMin.value = ''
  draftMax.value = ''
  emit('update:modelValue', { min: '', max: '' })
  close()
}

function onDocPointerDown(e: MouseEvent | TouchEvent): void {
  if (!open.value) return
  const t = e.target as Node
  if (rootRef.value?.contains(t)) return
  if (panelRef.value?.contains(t)) return
  close()
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && open.value) {
    e.preventDefault()
    close()
  }
}

function onWinChange(): void {
  if (open.value) positionPanel()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onWinChange)
  window.addEventListener('scroll', onWinChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onWinChange)
  window.removeEventListener('scroll', onWinChange, true)
})
</script>
