import { AlarmClock, VolumeX, Clock, Trash2, CheckCircle2 } from 'lucide-react'
import type { ReminderItem } from '@/db/laryko.db'
import styles from './AlarmOverlay.module.css'

export interface AlarmOverlayProps {
  alarm: ReminderItem
  onSnooze: (alarm: ReminderItem, minutes?: number) => void
  onStop: (alarm: ReminderItem) => void
  onDelete: (alarm: ReminderItem) => void
}

export function AlarmOverlay({ alarm, onSnooze, onStop, onDelete }: AlarmOverlayProps) {
  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-label="Alarma activa">
      <div className={styles.card}>
        <div className={styles.pulseRing}>
          <AlarmClock size={40} strokeWidth={2.2} />
        </div>

        <span className={styles.badge}>ALARMA ACTIVA</span>
        <h2 className={styles.title}>{alarm.title}</h2>
        {alarm.notes && <p className={styles.notes}>{alarm.notes}</p>}
        <p className={styles.time}>Programada: {alarm.dueAt.toLocaleString()}</p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.snoozeBtn}
            onClick={() => onSnooze(alarm, 5)}
          >
            <Clock size={16} />
            <span>Posponer 5 min</span>
          </button>

          <button
            type="button"
            className={styles.stopBtn}
            onClick={() => onStop(alarm)}
          >
            <CheckCircle2 size={16} />
            <span>Completar y Apagar</span>
          </button>
        </div>

        <div className={styles.secondaryActions}>
          <button
            type="button"
            className={styles.silenceBtn}
            onClick={() => onStop(alarm)}
          >
            <VolumeX size={14} />
            <span>Apagar alarma</span>
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => onDelete(alarm)}
          >
            <Trash2 size={14} />
            <span>Borrar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
