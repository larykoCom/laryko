export type Platform =
  | 'web'
  | 'ios'
  | 'android'
  | 'windows'
  | 'macos'
  | 'linux'
  | 'unknown'

export interface AppInfo {
  platform: Platform
  version: string
  origin: string
  isNative: boolean
}
