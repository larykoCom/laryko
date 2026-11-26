import { Capacitor } from '@capacitor/core'
import { db, type NotificationSoundPreset } from '@/db/laryko.db'
import { NativeAndroidBridge, NativeIOSBridge } from '@/utils/nativeIOSBridge'

function getNativeSoundBridge() {
  if (!Capacitor.isNativePlatform()) return null
  const p = Capacitor.getPlatform()
  if (p === 'ios') return NativeIOSBridge
  if (p === 'android') return NativeAndroidBridge
  return null
}

let sharedAudioCtx: AudioContext | null = null
let activeAlarmTimer: ReturnType<typeof setInterval> | null = null
let activeHtmlAudio: HTMLAudioElement | null = null
let activeBlobUrl: string | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx()
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {})
  }
  return sharedAudioCtx
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffsetSec: number,
  durationSec: number,
  gainLevel: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const start = ctx.currentTime + startOffsetSec

  osc.type = type
  osc.frequency.setValueAtTime(freq, start)

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, gainLevel), start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(start)
  osc.stop(start + durationSec + 0.02)
}

async function playCustomAudioOnce(volumePercent: number): Promise<boolean> {
  const record = await db.customAudio.get(1)
  if (!record?.data) return false

  try {
    const blob = new Blob([record.data], { type: record.mimeType || 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.volume = Math.min(1, Math.max(0, volumePercent / 100))
    audio.onended = () => URL.revokeObjectURL(url)
    await audio.play()
    return true
  } catch {
    return false
  }
}

export async function playNotificationSound(
  preset: NotificationSoundPreset = 'chime',
  volumePercent = 80,
  isAlarmBoost = false
): Promise<void> {
  if (preset === 'mute' || volumePercent <= 0) return

  if (preset === 'custom') {
    const played = await playCustomAudioOnce(volumePercent)
    if (played) return
  }

  const nativeBridge = getNativeSoundBridge()
  if (nativeBridge) {
    try {
      const res = await nativeBridge.playNativeNotificationSound({ volume: volumePercent })
      if (res.success) return
    } catch {
      // fallback a Web Audio
    }
  }

  const ctx = getAudioContext()
  if (!ctx) return

  const scale = isAlarmBoost ? 0.95 : 0.55
  const gain = Math.min(1, Math.max(0, volumePercent / 100)) * scale

  switch (preset) {
    case 'chime':
      playTone(ctx, 587.33, 0, 0.22, gain, 'sine')
      playTone(ctx, 880, 0.12, 0.35, gain, 'sine')
      break
    case 'bell':
      playTone(ctx, 1046.5, 0, 0.45, gain, 'triangle')
      playTone(ctx, 1318.5, 0.18, 0.45, gain * 0.85, 'triangle')
      break
    case 'alarm':
      playTone(ctx, 880, 0, 0.16, gain, 'sawtooth')
      playTone(ctx, 1174.66, 0.18, 0.16, gain, 'sawtooth')
      playTone(ctx, 880, 0.38, 0.16, gain, 'sawtooth')
      playTone(ctx, 1174.66, 0.56, 0.24, gain, 'sawtooth')
      break
    case 'siren':
      playTone(ctx, 740, 0, 0.28, gain, 'sawtooth')
      playTone(ctx, 1046.5, 0.28, 0.28, gain, 'sawtooth')
      playTone(ctx, 740, 0.56, 0.28, gain, 'sawtooth')
      playTone(ctx, 1046.5, 0.84, 0.3, gain, 'sawtooth')
      break
    case 'soft':
      playTone(ctx, 440, 0, 0.3, gain * 0.75, 'sine')
      playTone(ctx, 554.37, 0.15, 0.4, gain * 0.7, 'sine')
      break
    case 'custom':
      // Fallback si aún no hay archivo custom subido
      playTone(ctx, 880, 0, 0.2, gain, 'sawtooth')
      playTone(ctx, 1174.66, 0.22, 0.25, gain, 'sawtooth')
      break
  }
}

export function stopAlarmLoop(): void {
  const nativeBridge = getNativeSoundBridge()
  if (nativeBridge) {
    void nativeBridge.stopNativeAlarm().catch(() => {})
  }
  if (activeAlarmTimer) {
    clearInterval(activeAlarmTimer)
    activeAlarmTimer = null
  }
  if (activeHtmlAudio) {
    activeHtmlAudio.pause()
    activeHtmlAudio.currentTime = 0
    activeHtmlAudio = null
  }
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl)
    activeBlobUrl = null
  }
}

export async function startAlarmLoop(
  preset: NotificationSoundPreset = 'siren',
  volumePercent = 100
): Promise<void> {
  stopAlarmLoop()
  if (preset === 'mute' || volumePercent <= 0) return

  const record = await db.customAudio.get(1)
  if (record?.data && (preset === 'custom' || preset === 'siren' || preset === 'alarm')) {
    if (preset === 'custom') {
      try {
        const blob = new Blob([record.data], { type: record.mimeType || 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.loop = true
        audio.volume = Math.min(1, Math.max(0, volumePercent / 100))
        activeBlobUrl = url
        activeHtmlAudio = audio
        await audio.play()
        return
      } catch {
        stopAlarmLoop()
      }
    }
  }

  const nativeBridge = getNativeSoundBridge()
  if (nativeBridge && preset !== 'custom') {
    try {
      const res = await nativeBridge.startNativeAlarm({ volume: volumePercent })
      if (res.success) return
    } catch {
      // fallback a Web Audio
    }
  }

  const alarmPreset: NotificationSoundPreset =
    preset === 'chime' || preset === 'soft' ? 'alarm' : preset

  await playNotificationSound(alarmPreset, volumePercent, true)
  activeAlarmTimer = setInterval(() => {
    void playNotificationSound(alarmPreset, volumePercent, true)
  }, 1300)
}
