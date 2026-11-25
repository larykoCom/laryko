import { triggerNativeHaptic } from '@/utils/nativeIOSBridge'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  durationMs: number
  action?: ToastAction
  createdAt: number
}

export interface ToastOptions {
  durationMs?: number
  action?: ToastAction
}

type ToastListener = (toasts: ToastItem[]) => void

const MAX_VISIBLE_TOASTS = 3
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3500,
  info: 3500,
  warning: 4500,
  error: 6000,
}

let currentToasts: ToastItem[] = []
const listeners = new Set<ToastListener>()

function emit() {
  const snapshot = [...currentToasts]
  listeners.forEach((fn) => fn(snapshot))
}

function pushToast(type: ToastType, message: string, options?: ToastOptions): string {
  const clean = message.trim()
  if (!clean) return ''

  // Deduplicación inteligente: si ya existe un toast idéntico, refrescarlo en vez de duplicar
  const existing = currentToasts.find((t) => t.type === type && t.message === clean)
  if (existing) {
    currentToasts = currentToasts.filter((t) => t.id !== existing.id)
  }

  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const item: ToastItem = {
    id,
    type,
    message: clean,
    durationMs: options?.durationMs ?? DEFAULT_DURATIONS[type],
    action: options?.action,
    createdAt: Date.now(),
  }

  currentToasts = [...currentToasts, item].slice(-MAX_VISIBLE_TOASTS)

  if (type === 'success') triggerNativeHaptic('success')
  else if (type === 'error') triggerNativeHaptic('error')
  else if (type === 'warning') triggerNativeHaptic('warning')
  else triggerNativeHaptic('light')

  emit()
  return id
}

export const toast = {
  success: (message: string, options?: ToastOptions) => pushToast('success', message, options),
  error: (message: string, options?: ToastOptions) => pushToast('error', message, options),
  warning: (message: string, options?: ToastOptions) => pushToast('warning', message, options),
  info: (message: string, options?: ToastOptions) => pushToast('info', message, options),
  dismiss: (id: string) => {
    const next = currentToasts.filter((t) => t.id !== id)
    if (next.length !== currentToasts.length) {
      currentToasts = next
      emit()
    }
  },
  clear: () => {
    if (currentToasts.length > 0) {
      currentToasts = []
      emit()
    }
  },
  subscribe: (listener: ToastListener) => {
    listeners.add(listener)
    listener([...currentToasts])
    return () => {
      listeners.delete(listener)
    }
  },
}
