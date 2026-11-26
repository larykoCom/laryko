import { registerPlugin } from '@capacitor/core'
import type { Platform } from '@/types'

export interface MultiSessionNativePlugin {
  openSession(options: { uuid: string; title: string; url: string }): Promise<{ success: boolean }>
  sleepSession(options: { uuid: string }): Promise<{ success: boolean }>
  sleepAllSessions(): Promise<{ success: boolean }>
  deleteSessionData(options: { uuid: string }): Promise<{ success: boolean }>
  getActiveSessions(): Promise<{ uuids: string[] }>
}

const MultiSessionCapacitor = registerPlugin<MultiSessionNativePlugin>('MultiSessionPlugin', {
  web: {
    async openSession() {
      return { success: false }
    },
    async sleepSession() {
      return { success: false }
    },
    async sleepAllSessions() {
      return { success: false }
    },
    async deleteSessionData() {
      return { success: false }
    },
    async getActiveSessions() {
      return { uuids: [] }
    },
  },
})

function isTauriPlatform(platform: Platform): boolean {
  return (
    (platform === 'macos' || platform === 'windows' || platform === 'linux') &&
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in window
  )
}

function isMobilePlatform(platform: Platform): boolean {
  return platform === 'ios' || platform === 'android'
}

export interface SessionBounds {
  x: number
  y: number
  width: number
  height: number
}

export const multiSessionBridge = {
  supportsTrueIsolation(platform: Platform): boolean {
    return isTauriPlatform(platform) || isMobilePlatform(platform)
  },

  isDesktopEmbedded(platform: Platform): boolean {
    return isTauriPlatform(platform)
  },

  async openSession(
    platform: Platform,
    uuid: string,
    title: string,
    url: string,
    bounds?: SessionBounds
  ): Promise<{ mode: 'native' | 'web-fallback' }> {
    if (isTauriPlatform(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      const b = bounds ?? { x: 260, y: 56, width: 880, height: 680 }
      await invoke('open_session_webview', {
        sessionUuid: uuid,
        title,
        url,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
      })
      return { mode: 'native' }
    }

    if (isMobilePlatform(platform)) {
      const res = await MultiSessionCapacitor.openSession({ uuid, title, url })
      if (res.success) {
        return { mode: 'native' }
      }
    }

    // Fallback Web (PWA): abre pestaña externa con aviso de sin aislamiento nativo
    window.open(url, `laryko-session-${uuid}`, 'noopener,noreferrer')
    return { mode: 'web-fallback' }
  },

  async setSessionBounds(
    platform: Platform,
    uuid: string,
    bounds: SessionBounds
  ): Promise<void> {
    if (isTauriPlatform(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('set_session_bounds', {
        sessionUuid: uuid,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      })
    }
  },

  async hideAllSessions(platform: Platform): Promise<void> {
    if (isTauriPlatform(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('hide_all_session_webviews')
    }
  },

  async controlSession(
    platform: Platform,
    uuid: string,
    action: 'back' | 'forward' | 'reload' | 'navigate' | 'get_url',
    url?: string
  ): Promise<string> {
    if (isTauriPlatform(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string>('control_session_webview', {
        sessionUuid: uuid,
        action,
        url,
      })
    }
    return ''
  },

  async sleepSession(platform: Platform, uuid: string): Promise<void> {
    if (isTauriPlatform(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('sleep_session_webview', { sessionUuid: uuid })
      return
    }

    if (isMobilePlatform(platform)) {
      await MultiSessionCapacitor.sleepSession({ uuid })
    }
  },

  async sleepAllSessions(platform: Platform): Promise<void> {
    if (isTauriPlatform(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('sleep_all_sessions')
      return
    }

    if (isMobilePlatform(platform)) {
      await MultiSessionCapacitor.sleepAllSessions()
    }
  },

  async deleteSessionData(platform: Platform, uuid: string): Promise<void> {
    if (isTauriPlatform(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('delete_session_data', { sessionUuid: uuid })
      return
    }

    if (isMobilePlatform(platform)) {
      await MultiSessionCapacitor.deleteSessionData({ uuid })
    }
  },

  async getActiveSessionUuids(platform: Platform): Promise<string[]> {
    if (isTauriPlatform(platform)) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        return await invoke<string[]>('get_active_session_uuids')
      } catch {
        return []
      }
    }

    if (isMobilePlatform(platform)) {
      try {
        const res = await MultiSessionCapacitor.getActiveSessions()
        return res.uuids ?? []
      } catch {
        return []
      }
    }

    return []
  },
}
