import { useState, useEffect } from 'react'
import type { AppInfo, Platform } from '@/types'

async function detectPlatform(): Promise<Platform> {
  // Tauri detection
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('win')) return 'windows'
    if (ua.includes('mac')) return 'macos'
    if (ua.includes('linux')) return 'linux'
    return 'windows'
  }

  // Capacitor detection
  if (typeof window !== 'undefined' && 'Capacitor' in window) {
    try {
      const { Capacitor } = await import('@capacitor/core')
      const p = Capacitor.getPlatform()
      if (p === 'ios') return 'ios'
      if (p === 'android') return 'android'
    } catch {
      // fallback
    }
  }

  return 'web'
}

async function getVersion(platform: Platform): Promise<string> {
  if (platform === 'windows' || platform === 'macos' || platform === 'linux') {
    try {
      const { getVersion } = await import('@tauri-apps/api/app')
      return await getVersion()
    } catch {
      // fallback
    }
  }
  if (platform === 'ios' || platform === 'android') {
    try {
      const { App } = await import('@capacitor/app')
      const info = await App.getInfo()
      return info.version
    } catch {
      // fallback
    }
  }
  return import.meta.env.VITE_APP_VERSION ?? '0.1.0'
}

export function usePlatform(): AppInfo {
  const [info, setInfo] = useState<AppInfo>({
    platform: 'unknown',
    version: '0.1.1',
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    isNative: false,
  })

  useEffect(() => {
    let cancelled = false
    async function detect() {
      const platform = await detectPlatform()
      const version = await getVersion(platform)
      if (!cancelled) {
        setInfo({
          platform,
          version,
          origin: window.location.origin,
          isNative: platform !== 'web' && platform !== 'unknown',
        })
      }
    }
    detect()
    return () => { cancelled = true }
  }, [])

  return info
}
