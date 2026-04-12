<template>
  <div
    :class="['relative flex max-w-full', wrapperClass]"
    @mouseenter="onMouseEnter"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <slot />
    <Teleport to="body">
      <Transition name="mw-tooltip">
        <div
          v-if="open"
          :id="tipId"
          role="tooltip"
          :style="panelStyle"
          :class="[
            'pointer-events-none fixed z-[100] min-w-[10rem] max-w-[16rem] rounded-lg border px-2.5 py-2 text-left shadow-lg',
            'border-brand-blue/15 bg-light-card text-light-txt dark:border-white/[0.08] dark:bg-dark-surf dark:text-dark-txt',
          ]"
        >
          <slot name="content" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

let _tipSeq = 0

/** Ancho máximo aproximado (max-w-[16rem]) para recortar contra el borde de la ventana. */
const TIP_MAX_W = 272
const TIP_MAX_H = 140

const props = withDefaults(
  defineProps<{
    showDelayMs?: number
    hideDelayMs?: number
    disabled?: boolean
    wrapperClass?: string | string[] | Record<string, boolean>
    /** Desplazamiento en px respecto al puntero (esquina superior izquierda del tooltip). */
    offsetX?: number
    offsetY?: number
  }>(),
  {
    showDelayMs: 100,
    hideDelayMs: 80,
    disabled: false,
    wrapperClass: undefined,
    offsetX: 14,
    offsetY: 14,
  }
)

const open = ref(false)
const cursorX = ref(0)
const cursorY = ref(0)
const tipId = `mw-tip-${++_tipSeq}`
let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

const panelStyle = computed(() => {
  const pad = 8
  let left = cursorX.value + props.offsetX
  let top = cursorY.value + props.offsetY
  if (typeof window !== 'undefined') {
    left = Math.min(left, window.innerWidth - TIP_MAX_W - pad)
    top = Math.min(top, window.innerHeight - TIP_MAX_H - pad)
  }
  left = Math.max(pad, left)
  top = Math.max(pad, top)
  return { left: `${left}px`, top: `${top}px` }
})

function clearTimers(): void {
  if (showTimer != null) {
    clearTimeout(showTimer)
    showTimer = null
  }
  if (hideTimer != null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function setCursor(e: MouseEvent): void {
  cursorX.value = e.clientX
  cursorY.value = e.clientY
}

function onMouseEnter(e: MouseEvent): void {
  if (props.disabled) return
  setCursor(e)
  clearTimers()
  showTimer = setTimeout(() => {
    open.value = true
  }, props.showDelayMs)
}

function onMouseMove(e: MouseEvent): void {
  setCursor(e)
}

function onMouseLeave(): void {
  clearTimers()
  hideTimer = setTimeout(() => {
    open.value = false
  }, props.hideDelayMs)
}

function onFocusIn(e: FocusEvent): void {
  if (props.disabled) return
  const t = e.currentTarget as HTMLElement | null
  if (t) {
    const r = t.getBoundingClientRect()
    cursorX.value = r.left + r.width / 2
    cursorY.value = r.top
  }
  clearTimers()
  showTimer = setTimeout(() => {
    open.value = true
  }, props.showDelayMs)
}

function onFocusOut(): void {
  clearTimers()
  hideTimer = setTimeout(() => {
    open.value = false
  }, props.hideDelayMs)
}

onUnmounted(() => clearTimers())
</script>

<style scoped>
.mw-tooltip-enter-active,
.mw-tooltip-leave-active {
  transition: opacity 0.1s ease;
}
.mw-tooltip-enter-from,
.mw-tooltip-leave-to {
  opacity: 0;
}
</style>
