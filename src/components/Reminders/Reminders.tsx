import { useState } from 'react'
import {
  Bell,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Pencil,
  X,
  Mail,
  Clock,
  Volume2,
  AlarmClock,
  Repeat,
  Play,
} from 'lucide-react'
import { useReminders } from '@/hooks/useReminders'
import { triggerNativeHaptic } from '@/utils/nativeIOSBridge'
import { playNotificationSound } from '@/utils/soundEngine'
import { toast } from '@/utils/toast'
import type {
  NotificationSoundPreset,
  RecurrenceUnit,
  ReminderItem,
  ReminderRecurrence,
} from '@/db/laryko.db'
import type { UserIntegrationsVault } from '@/utils/vaultCrypto'
import type { Platform } from '@/types'
import styles from './Reminders.module.css'

export interface RemindersProps {
  platform: Platform
  vault?: UserIntegrationsVault
  onLocalChange?: () => void
  remindersState?: ReturnType<typeof useReminders>
}

function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function defaultDateTimeLocal(): string {
  return toDateTimeLocal(new Date(Date.now() + 15 * 60 * 1000))
}

export function Reminders({ platform, vault, onLocalChange, remindersState }: RemindersProps) {
  const internalState = useReminders(platform, vault, onLocalChange, !remindersState)
  const {
    reminders,
    addReminder,
    updateReminder,
    toggleCompleted,
    deleteReminder,
    clearCompleted,
    testNativeAlert,
  } = remindersState ?? internalState

  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [editingItem, setEditingItem] = useState<ReminderItem | null>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueLocal, setDueLocal] = useState(defaultDateTimeLocal)
  const [notifyNative, setNotifyNative] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [persistent, setPersistent] = useState(false)
  const [isAlarm, setIsAlarm] = useState(false)
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(2)
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('days')
  const [soundPreset, setSoundPreset] = useState<NotificationSoundPreset | 'default'>('default')

  const completedCount = reminders.filter((r) => r.completed).length
  const filteredReminders = reminders.filter((r) => {
    if (filter === 'pending') return !r.completed
    if (filter === 'done') return r.completed
    return true
  })

  const resetForm = () => {
    setEditingItem(null)
    setTitle('')
    setNotes('')
    setDueLocal(defaultDateTimeLocal())
    setNotifyNative(true)
    setNotifyEmail(false)
    setPersistent(false)
    setIsAlarm(false)
    setRecurrence('none')
    setRecurrenceInterval(2)
    setRecurrenceUnit('days')
    setSoundPreset('default')
  }

  const startEdit = (item: ReminderItem) => {
    triggerNativeHaptic('selection')
    setEditingItem(item)
    setTitle(item.title)
    setNotes(item.notes)
    setDueLocal(toDateTimeLocal(item.dueAt))
    setNotifyNative(item.notifyNative)
    setNotifyEmail(item.notifyEmail)
    setPersistent(Boolean(item.persistent))
    setIsAlarm(Boolean(item.isAlarm))
    setRecurrence(item.recurrence ?? 'none')
    setRecurrenceInterval(item.recurrenceInterval ?? 2)
    setRecurrenceUnit(item.recurrenceUnit ?? 'days')
    setSoundPreset(item.soundPreset ?? 'default')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const due = new Date(dueLocal)
    if (Number.isNaN(due.getTime())) return

    const ok = editingItem
      ? await updateReminder(editingItem, {
          title,
          notes,
          dueAt: due,
          notifyNative,
          notifyEmail,
          persistent,
          isAlarm,
          recurrence,
          recurrenceInterval,
          recurrenceUnit,
          soundPreset,
        })
      : await addReminder({
          title,
          notes,
          dueAt: due,
          notifyNative,
          notifyEmail,
          persistent,
          isAlarm,
          recurrence,
          recurrenceInterval,
          recurrenceUnit,
          soundPreset,
        })

    if (ok) {
      toast.success(
        editingItem ? 'Recordatorio actualizado.' : 'Recordatorio programado en LocalDB.'
      )
      resetForm()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <div className={styles.titleIcon}>
            <Bell size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className={styles.title}>Agenda & Recordatorios</h2>
            <p className={styles.subtitle}>
              100% offline-first en LocalDB · Sincroniza con Neon al reconectar
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.testBtn}
          onClick={() => {
            triggerNativeHaptic('selection')
            testNativeAlert()
          }}
        >
          <Volume2 size={15} />
          <span>Probar Alerta</span>
        </button>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.input}
          placeholder="¿Qué necesitas recordar? (ej. Reunión cliente / Pagar factura)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className={styles.row2}>
          <input
            type="datetime-local"
            className={styles.input}
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
            required
          />
          <input
            type="text"
            className={styles.input}
            placeholder="Nota o detalle (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className={styles.row2}>
          <select
            className={styles.input}
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as ReminderRecurrence)}
            aria-label="Repetición"
          >
            <option value="none">Repetición: Una sola vez</option>
            <option value="daily">Repetir: Todos los días</option>
            <option value="weekly">Repetir: Cada semana</option>
            <option value="monthly">Repetir: Cada mes</option>
            <option value="yearly">Repetir: Cada año</option>
            <option value="custom">Repetir: Personalizado...</option>
          </select>

          <div className={styles.soundSelectRow}>
            <select
              className={styles.input}
              value={soundPreset}
              onChange={(e) =>
                setSoundPreset(e.target.value as NotificationSoundPreset | 'default')
              }
              aria-label="Sonido del recordatorio"
            >
              <option value="default">Sonido: Por defecto (Preferencias)</option>
              <option value="chime">Sonido: Cristal</option>
              <option value="bell">Sonido: Campana</option>
              <option value="alarm">Sonido: Alarma doble</option>
              <option value="siren">Sonido: Sirena fuerte</option>
              <option value="soft">Sonido: Suave</option>
              <option value="custom">Sonido: Audio Custom (subido)</option>
              <option value="mute">Sonido: Silenciado</option>
            </select>
            <button
              type="button"
              className={styles.previewSoundBtn}
              title="Probar sonido elegido"
              onClick={() =>
                playNotificationSound(
                  soundPreset === 'default' ? 'chime' : soundPreset,
                  isAlarm ? 100 : 80,
                  isAlarm
                )
              }
            >
              <Play size={14} />
            </button>
          </div>
        </div>

        {recurrence === 'custom' && (
          <div className={styles.customRecurrenceRow}>
            <span>Repetir cada</span>
            <input
              type="number"
              min={1}
              max={999}
              className={styles.intervalInput}
              value={recurrenceInterval}
              onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))}
            />
            <select
              className={styles.input}
              value={recurrenceUnit}
              onChange={(e) => setRecurrenceUnit(e.target.value as RecurrenceUnit)}
            >
              <option value="minutes">minutos</option>
              <option value="hours">horas</option>
              <option value="days">días</option>
              <option value="weeks">semanas</option>
              <option value="months">meses</option>
              <option value="years">años</option>
            </select>
          </div>
        )}

        <div className={styles.togglesRow}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={notifyNative}
              onChange={(e) => setNotifyNative(e.target.checked)}
            />
            <Bell size={14} />
            <span>Notificación nativa (sin internet)</span>
          </label>

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={isAlarm}
              onChange={(e) => {
                const checked = e.target.checked
                setIsAlarm(checked)
                if (checked) setNotifyNative(true)
              }}
            />
            <AlarmClock size={14} />
            <span>Alarma (sonido continuo alto)</span>
          </label>

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={persistent}
              onChange={(e) => {
                const checked = e.target.checked
                setPersistent(checked)
                if (checked) setNotifyNative(true)
              }}
            />
            <span>Persistente (repetir hasta ver)</span>
          </label>

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
            />
            <Mail size={14} />
            <span>Enviar copia a mi correo (Resend)</span>
          </label>

          <div className={styles.submitGroup}>
            {editingItem && (
              <button type="button" className={styles.cancelBtn} onClick={resetForm}>
                <X size={15} />
                <span>Cancelar</span>
              </button>
            )}
            <button type="submit" className={styles.primaryBtn}>
              <Plus size={16} />
              <span>{editingItem ? 'Guardar cambios' : 'Programar'}</span>
            </button>
          </div>
        </div>
      </form>

      <div className={styles.filterBar}>
        <div className={styles.filterChips}>
          <button
            type="button"
            className={`${styles.chip} ${filter === 'all' ? styles.chipActive : ''}`}
            onClick={() => setFilter('all')}
          >
            Todas ({reminders.length})
          </button>
          <button
            type="button"
            className={`${styles.chip} ${filter === 'pending' ? styles.chipActive : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pendientes ({reminders.length - completedCount})
          </button>
          <button
            type="button"
            className={`${styles.chip} ${filter === 'done' ? styles.chipActive : ''}`}
            onClick={() => setFilter('done')}
          >
            Completadas ({completedCount})
          </button>
        </div>

        {completedCount > 0 && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => {
              triggerNativeHaptic('warning')
              clearCompleted()
            }}
          >
            <Trash2 size={13} />
            <span>Limpiar completadas</span>
          </button>
        )}
      </div>

      <div className={styles.list}>
        {filteredReminders.length === 0 ? (
          <div className={styles.empty}>
            <Clock size={28} strokeWidth={1.8} />
            <p>Sin recordatorios en esta vista</p>
            <span>
              Crea tareas o alarmas aquí. Se guardan en LocalDB y suenan en tu dispositivo incluso sin internet.
            </span>
          </div>
        ) : (
          filteredReminders.map((item) => {
            const isPast = !item.completed && item.dueAt.getTime() < Date.now()
            return (
              <div
                key={item.uuid}
                className={`${styles.itemCard} ${item.completed ? styles.itemDone : ''}`}
              >
                <button
                  type="button"
                  className={styles.checkBtn}
                  onClick={() => {
                    triggerNativeHaptic('light')
                    toggleCompleted(item)
                  }}
                  aria-label="Completar tarea"
                >
                  {item.completed ? (
                    <CheckCircle2 size={20} color="#10b981" />
                  ) : (
                    <Circle size={20} />
                  )}
                </button>

                <div className={styles.itemMeta}>
                  <div className={styles.itemTitle}>{item.title}</div>
                  {item.notes && <div className={styles.itemNotes}>{item.notes}</div>}
                  <div className={styles.itemBadges}>
                    <span className={`${styles.timeBadge} ${isPast ? styles.timeLate : ''}`}>
                      <Clock size={12} />
                      {item.dueAt.toLocaleString()}
                    </span>
                    {item.recurrence && item.recurrence !== 'none' && (
                      <span className={styles.miniTag}>
                        <Repeat size={11} />{' '}
                        {item.recurrence === 'daily'
                          ? 'Diario'
                          : item.recurrence === 'weekly'
                            ? 'Semanal'
                            : item.recurrence === 'monthly'
                              ? 'Mensual'
                              : item.recurrence === 'yearly'
                                ? 'Anual'
                                : `Cada ${item.recurrenceInterval ?? 1} ${
                                    item.recurrenceUnit === 'minutes'
                                      ? 'min'
                                      : item.recurrenceUnit === 'hours'
                                        ? 'h'
                                        : item.recurrenceUnit === 'weeks'
                                          ? 'sem'
                                          : item.recurrenceUnit === 'months'
                                            ? 'meses'
                                            : item.recurrenceUnit === 'years'
                                              ? 'años'
                                              : 'días'
                                  }`}
                      </span>
                    )}
                    {item.isAlarm ? (
                      <span className={styles.timeLate}>
                        <AlarmClock size={11} /> Alarma
                      </span>
                    ) : (
                      (item.notifyNative || item.persistent) && (
                        <span className={styles.miniTag}>
                          <Bell size={11} /> {item.persistent ? 'Persistente' : 'Nativa'}
                        </span>
                      )
                    )}
                    {item.notifyEmail && (
                      <span className={styles.miniTag}>
                        <Mail size={11} /> Email
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => startEdit(item)}
                    title="Editar registro"
                    aria-label="Editar recordatorio"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => {
                      triggerNativeHaptic('warning')
                      if (editingItem?.uuid === item.uuid) resetForm()
                      deleteReminder(item)
                    }}
                    title="Eliminar registro"
                    aria-label="Eliminar recordatorio"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
