import { registerPlugin } from '@capacitor/core'

export interface LiquidGlassCapabilities {
  hasNativeLiquidGlass: boolean
  supportsHaptics: boolean
  systemVersion: string
  model: string
  isiOS: boolean
  bridgeVersion: string
}

export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'selection'
  | 'success'
  | 'warning'
  | 'error'

export interface NativeIOSBridgePlugin {
  triggerHaptic(options: { type: HapticType }): Promise<void>
  getLiquidGlassCapabilities(): Promise<LiquidGlassCapabilities>
  setWebViewTransparent(options: { transparent: boolean }): Promise<{ success: boolean }>
  copyToClipboardWithHaptic(options: { text: string }): Promise<{ success: boolean }>
  setBadge(options: { count: number }): Promise<{ success: boolean }>
  setActiveTab(options: { tab: string }): Promise<{ success: boolean }>
  setTabBarVisible(options: { visible: boolean }): Promise<{ success: boolean }>
}

export const NativeIOSBridge = registerPlugin<NativeIOSBridgePlugin>('NativeIOSBridge', {
  web: {
    async triggerHaptic() {},
    async getLiquidGlassCapabilities() {
      return {
        hasNativeLiquidGlass: false,
        supportsHaptics: false,
        systemVersion: 'web',
        model: 'browser',
        isiOS: false,
        bridgeVersion: '1.1.1',
      }
    },
    async setWebViewTransparent() {
      return { success: false }
    },
    async copyToClipboardWithHaptic(options: { text: string }) {
      await navigator.clipboard.writeText(options.text)
      return { success: true }
    },
    async setBadge() {
      return { success: false }
    },
    async setActiveTab() {
      return { success: false }
    },
    async setTabBarVisible() {
      return { success: false }
    },
  },
})

/**
 * Disparador unificado de respuesta háptica física nativa en iOS (Taptic Engine)
 * con tolerancia de fallo transparente en Web y Escritorio.
 */
export async function triggerNativeHaptic(type: HapticType = 'light'): Promise<void> {
  try {
    await NativeIOSBridge.triggerHaptic({ type })
  } catch {
    // No-op en entornos sin soporte de haptics
  }
}
