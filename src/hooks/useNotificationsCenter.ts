import { useCallback, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type AppNotification, type NotificationSoundPreset } from '@/db/laryko.db'
import { playNotificationSound } from '@/utils/soundEngine'

export function useNotificationsCenter() {
  const notifications =
    useLiveQuery(() => db.notifications.orderBy('createdAt').reverse().toArray(), []) ?? []
  const reminders =
    useLiveQuery(() => db.reminders.orderBy('dueAt').toArray(), []) ?? []
  const prefs = useLiveQuery(() => db.userPrefs.get(1), [])

  const unreadItems = useMemo(
    () => notifications.filter((n) => !n.read),
    [notifications]
  )

  const readItems = useMemo(
    () => notifications.filter((n) => n.read),
    [notifications]
  )

  const missedItems = useMemo(() => {
    const now = Date.now()
    return reminders.filter((r) => !r.completed && r.dueAt.getTime() < now)
  }, [reminders])

  const upcomingItems = useMemo(() => {
    const now = Date.now()
    const next24h = now + 24 * 60 * 60 * 1000
    return reminders.filter(
      (r) => !r.completed && r.dueAt.getTime() >= now && r.dueAt.getTime() <= next24h
    )
  }, [reminders])

  const unreadCount = unreadItems.length

  const markAsRead = useCallback(async (item: AppNotification) => {
    if (item.id === undefined) return
    await db.notifications.update(item.id, { read: true })
  }, [])

  const markAllAsRead = useCallback(async () => {
    const unread = await db.notifications.filter((n) => !n.read).toArray()
    await Promise.all(
      unread.map((n) => (n.id !== undefined ? db.notifications.update(n.id, { read: true }) : Promise.resolve()))
    )
  }, [])

  const clearRead = useCallback(async () => {
    const read = await db.notifications.filter((n) => n.read).toArray()
    await Promise.all(
      read.map((n) => (n.id !== undefined ? db.notifications.delete(n.id) : Promise.resolve()))
    )
  }, [])

  const completeFromNotification = useCallback(async (reminderUuid?: string) => {
    if (!reminderUuid) return
    const reminder = await db.reminders.where('uuid').equals(reminderUuid).first()
    if (reminder?.id !== undefined) {
      await db.reminders.update(reminder.id, { completed: true, updatedAt: new Date() })
    }
    const linked = await db.notifications.where('reminderUuid').equals(reminderUuid).toArray()
    await Promise.all(
      linked.map((n) => (n.id !== undefined ? db.notifications.update(n.id, { read: true }) : Promise.resolve()))
    )
  }, [])

  const updateSoundSettings = useCallback(
    async (preset: NotificationSoundPreset, volume: number) => {
      const current = await db.userPrefs.get(1)
      if (current) {
        await db.userPrefs.update(1, {
          soundPreset: preset,
          soundVolume: volume,
          pendingSync: true,
          updatedAt: new Date(),
        })
      }
      await playNotificationSound(preset, volume)
    },
    []
  )

  return {
    notifications,
    unreadItems,
    readItems,
    missedItems,
    upcomingItems,
    unreadCount,
    soundPreset: prefs?.soundPreset ?? 'chime',
    soundVolume: prefs?.soundVolume ?? 80,
    markAsRead,
    markAllAsRead,
    clearRead,
    completeFromNotification,
    updateSoundSettings,
  }
}
