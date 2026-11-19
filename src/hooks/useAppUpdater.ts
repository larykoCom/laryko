import { useState, useCallback } from 'react'
import type { UpdateInfo, UpdateAction } from '@/types'
import type { Platform } from '@/types'

const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO ?? 'larykoCom/laryko'
const IS_APP_STORE = import.meta.env.VITE_IS_APP_STORE === 'true'
const BASE_DOWNLOAD = `https://github.com/${GITHUB_REPO}/releases/latest/download`

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').trim().split('.').map(n => parseInt(n, 10) || 0)
  const pb = b.replace(/^v/i, '').trim().split('.').map(n => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

function getUpdateAction(platform: Platform, _latestTag: string): UpdateAction {
  switch (platform) {
    case 'web':
      return { type: 'reload' }
    case 'ios':
      if (IS_APP_STORE) {
        // Preparado para el futuro: itms-apps://itunes.apple.com/app/id{APP_ID}
        return { type: 'sidestore', url: `itms-apps://itunes.apple.com/app/idPLACEHOLDER` }
      }
      return {
        type: 'sidestore',
        url: `sidestore://install?url=${encodeURIComponent(`${BASE_DOWNLOAD}/com.laryko.ipa`)}`,
      }
    case 'android':
      return { type: 'download', url: `${BASE_DOWNLOAD}/Laryko-Android.apk` }
    case 'windows':
      return {
        type: 'tauri',
        url: `${BASE_DOWNLOAD}/Laryko-Windows.exe`,
        filename: 'Laryko-Windows.exe',
      }
    case 'macos':
      return {
        type: 'tauri',
        url: `${BASE_DOWNLOAD}/Laryko-macOS.dmg`,
        filename: 'Laryko-macOS.dmg',
      }
    case 'linux':
      return {
        type: 'tauri',
        url: `${BASE_DOWNLOAD}/Laryko-Linux.AppImage`,
        filename: 'Laryko-Linux.AppImage',
      }
    default:
      return { type: 'reload' }
  }
}

export interface DownloadProgress {
  downloaded: number
  total: number
  percentage: number
}

export function useAppUpdater(platform: Platform, currentVersion: string) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)

  const checkForUpdates = useCallback(async () => {
    setChecking(true)
    setError(null)
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
        { headers: { Accept: 'application/vnd.github+json' } }
      )
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
      const release = await res.json()
      const latestVersion = release.tag_name as string
      const hasUpdate = compareVersions(latestVersion, currentVersion) > 0
      setUpdateInfo({
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseNotes: release.body ?? '',
        releaseUrl: release.html_url,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setChecking(false)
    }
  }, [platform, currentVersion])

  const executeUpdate = useCallback(async () => {
    if (!updateInfo?.hasUpdate) return
    const action = getUpdateAction(platform, updateInfo.latestVersion)

    switch (action.type) {
      case 'reload':
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration()
          if (reg?.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
        }
        window.location.reload()
        break
      case 'sidestore':
        window.location.href = action.url!
        break
      case 'download':
        window.open(action.url!, '_blank')
        break
      case 'tauri':
        try {
          setIsDownloading(true)
          setDownloadProgress({ downloaded: 0, total: 0, percentage: 0 })

          const { listen } = await import('@tauri-apps/api/event')
          const { invoke } = await import('@tauri-apps/api/core')

          const unlisten = await listen<DownloadProgress>(
            'update-download-progress',
            (event) => {
              setDownloadProgress(event.payload)
            }
          )

          try {
            await invoke('download_and_install_update', {
              url: action.url,
              filename: action.filename,
            })
          } finally {
            unlisten()
          }
        } catch (err) {
          setIsDownloading(false)
          setDownloadProgress(null)
          setError(err instanceof Error ? err.message : String(err))
          try {
            const { invoke } = await import('@tauri-apps/api/core')
            await invoke('open_external_url', { url: action.url })
          } catch {
            window.open(action.url!, '_blank')
          }
        }
        break
    }
  }, [updateInfo, platform])

  return {
    updateInfo,
    checking,
    error,
    isDownloading,
    downloadProgress,
    checkForUpdates,
    executeUpdate,
  }
}
