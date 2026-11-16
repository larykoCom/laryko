export interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  html_url: string
  assets: {
    name: string
    browser_download_url: string
  }[]
}

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseNotes: string
  releaseUrl: string
}

export interface UpdateAction {
  type: 'reload' | 'sidestore' | 'download' | 'tauri'
  url?: string
}
