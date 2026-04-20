import { ref } from 'vue'

export type ToastType = 'success' | 'error'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  durationMs: number
  createdAt: number
}

const toasts = ref<ToastItem[]>([])
let seq = 1

function push(type: ToastType, message: string, durationMs: number): number {
  const id = seq++
  toasts.value = [...toasts.value, { id, type, message, durationMs, createdAt: Date.now() }]
  if (durationMs > 0) {
    window.setTimeout(() => dismiss(id), durationMs)
  }
  return id
}

function dismiss(id: number): void {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

export function useToast() {
  return {
    toasts,
    success: (message: string) => push('success', message, 3000),
    error: (message: string) => push('error', message, 5000),
    dismiss,
  }
}
