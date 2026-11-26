import { Capacitor } from '@capacitor/core'
import type { Platform } from '@/types'
import { NativeAndroidBridge, NativeIOSBridge } from '@/utils/nativeIOSBridge'

function isTauri(platform: Platform): boolean {
  return (
    (platform === 'macos' || platform === 'windows' || platform === 'linux') &&
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in window
  )
}

function getMobileBridge(platform: Platform) {
  if (!Capacitor.isNativePlatform()) return null
  if (platform === 'ios') return NativeIOSBridge
  if (platform === 'android') return NativeAndroidBridge
  return null
}

export const notificationsBridge = {
  async requestPermission(platform: Platform): Promise<boolean> {
    if (isTauri(platform)) return true
    const mobile = getMobileBridge(platform)
    if (mobile) {
      try {
        const res = await mobile.requestNotificationPermission()
        return Boolean(res.granted)
      } catch {
        return false
      }
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true
      if (Notification.permission !== 'denied') {
        const result = await Notification.requestPermission()
        return result === 'granted'
      }
    }
    return false
  },

  async sendNative(
    platform: Platform,
    title: string,
    body: string,
    isAlarm = false
  ): Promise<void> {
    if (isTauri(platform)) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('send_native_notification', { title, body })
        return
      } catch {
        // fallback web notification
      }
    }

    const mobile = getMobileBridge(platform)
    if (mobile) {
      try {
        await mobile.sendNativeNotification({ title, body, isAlarm })
        return
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/apple-touch-icon.png',
          badge: '/apple-touch-icon.png',
        })
      } else if (Notification.permission !== 'denied') {
        const res = await Notification.requestPermission()
        if (res === 'granted') {
          new Notification(title, {
            body,
            icon: '/apple-touch-icon.png',
            badge: '/apple-touch-icon.png',
          })
        }
      }
    }
  },

  async scheduleNative(
    platform: Platform,
    options: {
      id: string
      title: string
      body: string
      triggerAtMs: number
      isAlarm: boolean
    }
  ): Promise<void> {
    const mobile = getMobileBridge(platform)
    if (!mobile) return
    try {
      await mobile.scheduleNativeNotification(options)
    } catch {
      // ignore
    }
  },

  async cancelNative(platform: Platform, id: string): Promise<void> {
    const mobile = getMobileBridge(platform)
    if (!mobile) return
    try {
      await mobile.cancelNativeNotification({ id })
    } catch {
      // ignore
    }
  },
}
