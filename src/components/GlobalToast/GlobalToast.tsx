import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { toast, type ToastItem, type ToastType } from '@/utils/toast'
import styles from './GlobalToast.module.css'

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

function ToastCard({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false)
  const Icon = ICONS[item.type]

  useEffect(() => {
    if (paused || item.durationMs <= 0) return
    const timer = setTimeout(() => {
      toast.dismiss(item.id)
    }, item.durationMs)
    return () => clearTimeout(timer)
  }, [item.id, item.durationMs, item.createdAt, paused])

  return (
    <div
      className={`${styles.toast} ${styles[item.type]}`}
      role={item.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Icon size={18} strokeWidth={2.2} className={styles.icon} />
      <span className={styles.message}>{item.message}</span>
      {item.action && (
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => {
            item.action?.onClick()
            toast.dismiss(item.id)
          }}
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        className={styles.closeBtn}
        onClick={() => toast.dismiss(item.id)}
        aria-label="Cerrar notificación"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function GlobalToast() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    return toast.subscribe(setItems)
  }, [])

  if (items.length === 0) return null

  return (
    <div className={styles.viewport} aria-live="polite">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  )
}
