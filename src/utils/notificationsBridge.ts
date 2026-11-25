import type { Platform } from '@/types'

function isTauri(platform: Platform): boolean {
  return (
    (platform === 'macos' || platform === 'windows' || platform === 'linux') &&
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in window
  )
}

export const notificationsBridge = {
  async requestPermission(platform: Platform): Promise<boolean> {
    if (isTauri(platform)) return true
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true
      if (Notification.permission !== 'denied') {
        const result = await Notification.requestPermission()
        return result === 'granted'
      }
    }
    return false
  },

  async sendNative(platform: Platform, title: string, body: string): Promise<void> {
    if (isTauri(platform)) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('send_native_notification', { title, body })
        return
      } catch {
        // fallback web notification
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
}
