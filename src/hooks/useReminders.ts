import { useState, useEffect, useCallback, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  type NotificationSoundPreset,
  type RecurrenceUnit,
  type ReminderItem,
  type ReminderRecurrence,
} from '@/db/laryko.db'
import { generateSessionUuid } from '@/utils/pinCrypto'
import { notificationsBridge } from '@/utils/notificationsBridge'
import { integrationsBridge } from '@/utils/integrationsBridge'
import { playNotificationSound, startAlarmLoop, stopAlarmLoop } from '@/utils/soundEngine'
import type { UserIntegrationsVault } from '@/utils/vaultCrypto'
import type { Platform } from '@/types'

const PERSISTENT_REPEAT_MS = 60_000

function computeNextDueAt(
  from: Date,
  recurrence: ReminderRecurrence,
  interval = 1,
  unit: RecurrenceUnit = 'days'
): Date {
  const next = new Date(from.getTime())
  const nowMs = Date.now()
  const safeInterval = Math.max(1, interval)
  let guard = 0
  do {
    if (recurrence === 'daily') {
      next.setDate(next.getDate() + 1)
    } else if (recurrence === 'weekly') {
      next.setDate(next.getDate() + 7)
    } else if (recurrence === 'monthly') {
      next.setMonth(next.getMonth() + 1)
    } else if (recurrence === 'yearly') {
      next.setFullYear(next.getFullYear() + 1)
    } else if (recurrence === 'custom') {
      if (unit === 'minutes') {
        next.setMinutes(next.getMinutes() + safeInterval)
      } else if (unit === 'hours') {
        next.setHours(next.getHours() + safeInterval)
      } else if (unit === 'days') {
        next.setDate(next.getDate() + safeInterval)
      } else if (unit === 'weeks') {
        next.setDate(next.getDate() + safeInterval * 7)
      } else if (unit === 'months') {
        next.setMonth(next.getMonth() + safeInterval)
      } else if (unit === 'years') {
        next.setFullYear(next.getFullYear() + safeInterval)
      }
    }
    guard += 1
  } while (next.getTime() <= nowMs && guard < 1000)
  return next
}

export function useReminders(
  platform: Platform,
  vault?: UserIntegrationsVault,
  onLocalChange?: () => void,
  enableScheduler = true
) {
  const reminders =
    useLiveQuery(() => db.reminders.orderBy('dueAt').reverse().toArray(), []) ?? []
  const [activeAlarm, setActiveAlarm] = useState<ReminderItem | null>(null)
  const activeAlarmUuidRef = useRef<string | null>(null)

  useEffect(() => {
    activeAlarmUuidRef.current = activeAlarm?.uuid ?? null
  }, [activeAlarm])

  const markPendingSync = useCallback(async () => {
    const prefs = await db.userPrefs.get(1)
    if (prefs) {
      await db.userPrefs.update(1, { pendingSync: true, updatedAt: new Date() })
    }
    onLocalChange?.()
  }, [onLocalChange])

  const checkDue = useCallback(async () => {
    const now = Date.now()
    const all = await db.reminders.toArray()
    const prefs = await db.userPrefs.get(1)
    const soundPreset = prefs?.soundPreset ?? 'chime'
    const soundVolume = prefs?.soundVolume ?? 80

    for (const item of all) {
      if (item.completed || item.dueAt.getTime() > now) continue

      const wantsAlert = item.notifyNative || Boolean(item.persistent) || Boolean(item.isAlarm)
      const lastMs = item.lastNotifiedAt ? item.lastNotifiedAt.getTime() : 0
      const shouldRepeatPersistent =
        Boolean(item.persistent) && now - lastMs >= PERSISTENT_REPEAT_MS

      // Asegurar que todo recordatorio vencido tenga su entrada en el Centro de Notificaciones
      const existingNotif = await db.notifications
        .where('reminderUuid')
        .equals(item.uuid)
        .first()

      const isMissed = now - item.dueAt.getTime() > 5 * 60_000
      if (!existingNotif) {
        await db.notifications.add({
          uuid: generateSessionUuid(),
          reminderUuid: item.uuid,
          title: item.isAlarm ? `🚨 Alarma: ${item.title}` : item.title,
          body: item.notes || 'Recordatorio programado en Laryko',
          category: isMissed ? 'missed' : 'due',
          read: false,
          scheduledAt: item.dueAt,
          createdAt: new Date(),
        })
      } else if (shouldRepeatPersistent && existingNotif.id !== undefined) {
        await db.notifications.update(existingNotif.id, {
          read: false,
          createdAt: new Date(),
        })
      }

      const itemPreset: NotificationSoundPreset =
        item.soundPreset && item.soundPreset !== 'default'
          ? item.soundPreset
          : soundPreset

      if (item.isAlarm && !item.notifiedNative && item.id !== undefined) {
        if (activeAlarmUuidRef.current !== item.uuid) {
          setActiveAlarm(item)
          const alarmPreset =
            itemPreset === 'custom' || itemPreset === 'alarm' || itemPreset === 'bell'
              ? itemPreset
              : 'siren'
          const alarmVol = prefs?.alarmVolume ?? 100
          await startAlarmLoop(alarmPreset, alarmVol)
          await notificationsBridge.sendNative(
            platform,
            `🚨 ALARMA: ${item.title}`,
            item.notes || 'Alarma activa en Laryko'
          )
        }
        await db.reminders.update(item.id, {
          notifiedNative: true,
          lastNotifiedAt: new Date(),
        })
      } else if (wantsAlert && (!item.notifiedNative || shouldRepeatPersistent) && item.id !== undefined) {
        await playNotificationSound(itemPreset, soundVolume)
        await notificationsBridge.sendNative(
          platform,
          `⏰ ${item.title}`,
          item.notes || 'Recordatorio programado en Laryko'
        )
        await db.reminders.update(item.id, {
          notifiedNative: true,
          lastNotifiedAt: new Date(),
        })
      }

      if (
        item.notifyEmail &&
        !item.notifiedEmail &&
        item.id !== undefined &&
        vault?.resendApiKey?.trim() &&
        vault?.resendToEmail?.trim() &&
        (typeof navigator === 'undefined' || navigator.onLine)
      ) {
        try {
          await integrationsBridge.sendResendEmail(
            platform,
            vault.resendApiKey,
            vault.resendFromEmail || 'Laryko <onboarding@resend.dev>',
            vault.resendToEmail,
            `⏰ Recordatorio Laryko: ${item.title}`,
            `<h3>${item.title}</h3><p>${item.notes || 'Tienes un recordatorio programado.'}</p><p><small>Programado para: ${item.dueAt.toLocaleString()}</small></p>`
          )
          await db.reminders.update(item.id, { notifiedEmail: true })
        } catch {
          // Reintentar en el próximo ciclo cuando haya internet
        }
      }
    }
  }, [platform, vault])

  // Verificar recordatorios vencidos cada 5s (solo en la instancia principal del scheduler)
  useEffect(() => {
    if (!enableScheduler) return
    checkDue()
    const interval = setInterval(checkDue, 5_000)
    return () => clearInterval(interval)
  }, [checkDue, enableScheduler])

  const addReminder = useCallback(
    async (input: {
      title: string
      notes: string
      dueAt: Date
      notifyNative: boolean
      notifyEmail: boolean
      persistent: boolean
      isAlarm: boolean
      recurrence: ReminderRecurrence
      recurrenceInterval?: number
      recurrenceUnit?: RecurrenceUnit
      soundPreset: NotificationSoundPreset | 'default'
    }) => {
      const cleanTitle = input.title.trim()
      if (!cleanTitle) return false

      if (input.notifyNative || input.isAlarm) {
        await notificationsBridge.requestPermission(platform)
      }

      const now = new Date()
      await db.reminders.add({
        uuid: generateSessionUuid(),
        title: cleanTitle,
        notes: input.notes.trim(),
        dueAt: input.dueAt,
        completed: false,
        notifyNative: input.notifyNative || input.isAlarm,
        notifyEmail: input.notifyEmail,
        persistent: input.persistent,
        isAlarm: input.isAlarm,
        recurrence: input.recurrence,
        recurrenceInterval: input.recurrenceInterval,
        recurrenceUnit: input.recurrenceUnit,
        soundPreset: input.soundPreset,
        notifiedNative: false,
        notifiedEmail: false,
        lastNotifiedAt: null,
        createdAt: now,
        updatedAt: now,
      })

      await markPendingSync()
      await checkDue()
      return true
    },
    [platform, markPendingSync, checkDue]
  )

  const stopAlarm = useCallback(
    async (alarm: ReminderItem) => {
      stopAlarmLoop()
      setActiveAlarm(null)
      if (alarm.id !== undefined) {
        if (alarm.recurrence && alarm.recurrence !== 'none') {
          const nextDue = computeNextDueAt(
            alarm.dueAt,
            alarm.recurrence,
            alarm.recurrenceInterval,
            alarm.recurrenceUnit
          )
          await db.reminders.update(alarm.id, {
            dueAt: nextDue,
            completed: false,
            notifiedNative: false,
            notifiedEmail: false,
            lastNotifiedAt: null,
            updatedAt: new Date(),
          })
        } else {
          await db.reminders.update(alarm.id, {
            completed: true,
            updatedAt: new Date(),
          })
        }
      }
      const linked = await db.notifications.where('reminderUuid').equals(alarm.uuid).toArray()
      await Promise.all(
        linked.map((n) => (n.id !== undefined ? db.notifications.update(n.id, { read: true }) : Promise.resolve()))
      )
      await markPendingSync()
    },
    [markPendingSync]
  )

  const snoozeAlarm = useCallback(
    async (alarm: ReminderItem, minutes = 5) => {
      stopAlarmLoop()
      setActiveAlarm(null)
      if (alarm.id !== undefined) {
        await db.reminders.update(alarm.id, {
          dueAt: new Date(Date.now() + minutes * 60_000),
          notifiedNative: false,
          lastNotifiedAt: null,
          updatedAt: new Date(),
        })
      }
      await markPendingSync()
    },
    [markPendingSync]
  )

  const updateReminder = useCallback(
    async (
      item: ReminderItem,
      patch: {
        title: string
        notes: string
        dueAt: Date
        notifyNative: boolean
        notifyEmail: boolean
        persistent: boolean
        isAlarm: boolean
        recurrence: ReminderRecurrence
        recurrenceInterval?: number
        recurrenceUnit?: RecurrenceUnit
        soundPreset: NotificationSoundPreset | 'default'
      }
    ) => {
      if (item.id === undefined) return false
      const cleanTitle = patch.title.trim()
      if (!cleanTitle) return false

      if (patch.notifyNative || patch.isAlarm) {
        await notificationsBridge.requestPermission(platform)
      }

      const isFuture = patch.dueAt.getTime() > Date.now()
      await db.reminders.update(item.id, {
        title: cleanTitle,
        notes: patch.notes.trim(),
        dueAt: patch.dueAt,
        notifyNative: patch.notifyNative || patch.isAlarm,
        notifyEmail: patch.notifyEmail,
        persistent: patch.persistent,
        isAlarm: patch.isAlarm,
        recurrence: patch.recurrence,
        recurrenceInterval: patch.recurrenceInterval,
        recurrenceUnit: patch.recurrenceUnit,
        soundPreset: patch.soundPreset,
        ...(isFuture
          ? {
              completed: false,
              notifiedNative: false,
              notifiedEmail: false,
              lastNotifiedAt: null,
            }
          : {}),
        updatedAt: new Date(),
      })

      await markPendingSync()
      await checkDue()
      return true
    },
    [platform, markPendingSync, checkDue]
  )

  const toggleCompleted = useCallback(
    async (item: ReminderItem) => {
      if (item.id === undefined) return
      const nextCompleted = !item.completed
      if (nextCompleted && activeAlarmUuidRef.current === item.uuid) {
        stopAlarmLoop()
        setActiveAlarm(null)
      } else if (nextCompleted && item.isAlarm) {
        stopAlarmLoop()
      }
      if (nextCompleted && item.recurrence && item.recurrence !== 'none') {
        const nextDue = computeNextDueAt(
          item.dueAt,
          item.recurrence,
          item.recurrenceInterval,
          item.recurrenceUnit
        )
        await db.reminders.update(item.id, {
          dueAt: nextDue,
          completed: false,
          notifiedNative: false,
          notifiedEmail: false,
          lastNotifiedAt: null,
          updatedAt: new Date(),
        })
      } else {
        await db.reminders.update(item.id, {
          completed: nextCompleted,
          updatedAt: new Date(),
        })
      }
      if (nextCompleted) {
        const linked = await db.notifications.where('reminderUuid').equals(item.uuid).toArray()
        await Promise.all(
          linked.map((n) => (n.id !== undefined ? db.notifications.update(n.id, { read: true }) : Promise.resolve()))
        )
      }
      await markPendingSync()
    },
    [markPendingSync]
  )

  const deleteReminder = useCallback(
    async (item: ReminderItem) => {
      if (item.id === undefined) return
      if (activeAlarmUuidRef.current === item.uuid || item.isAlarm) {
        stopAlarmLoop()
        if (activeAlarmUuidRef.current === item.uuid) {
          setActiveAlarm(null)
        }
      }
      await db.reminders.delete(item.id)
      const linked = await db.notifications.where('reminderUuid').equals(item.uuid).toArray()
      await Promise.all(
        linked.map((n) => (n.id !== undefined ? db.notifications.delete(n.id) : Promise.resolve()))
      )
      await markPendingSync()
    },
    [markPendingSync]
  )

  const clearCompleted = useCallback(async () => {
    const done = await db.reminders.filter((r) => r.completed).toArray()
    if (done.length === 0) return
    await Promise.all(
      done.map((r) => (r.id !== undefined ? db.reminders.delete(r.id) : Promise.resolve()))
    )
    await markPendingSync()
  }, [markPendingSync])

  return {
    reminders,
    activeAlarm,
    addReminder,
    updateReminder,
    toggleCompleted,
    deleteReminder,
    clearCompleted,
    stopAlarm,
    snoozeAlarm,
    testNativeAlert: async () => {
      const prefs = await db.userPrefs.get(1)
      await playNotificationSound(prefs?.soundPreset ?? 'chime', prefs?.soundVolume ?? 80)
      await notificationsBridge.sendNative(
        platform,
        'Laryko — Alerta Nativa',
        'Las notificaciones locales sin internet están funcionando.'
      )
    },
  }
}
