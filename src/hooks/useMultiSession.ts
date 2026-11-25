import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PinConfig, type SessionGroup, type WebSession } from '@/db/laryko.db'
import {
  derivePinHash,
  generateSaltHex,
  generateSessionUuid,
  sanitizeSessionUrl,
  verifyPinHash,
} from '@/utils/pinCrypto'
import { multiSessionBridge, type SessionBounds } from '@/utils/multiSessionBridge'
import { toast } from '@/utils/toast'
import type { Platform } from '@/types'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MS = 30_000
const IDLE_SLEEP_MS = 10 * 60 * 1000 // 10 min de inactividad -> hibernar WebView para ahorrar RAM

export interface QuickTemplate {
  name: string
  url: string
  color: string
}

export const SESSION_TEMPLATES: QuickTemplate[] = [
  { name: 'Gmail', url: 'https://mail.google.com', color: '#ea4335' },
  { name: 'Outlook', url: 'https://outlook.live.com', color: '#0078d4' },
  { name: 'GitHub', url: 'https://github.com/login', color: '#8b5cf6' },
  { name: 'Notion', url: 'https://www.notion.so/login', color: '#f59e0b' },
  { name: 'Slack', url: 'https://app.slack.com', color: '#e11d48' },
  { name: 'WhatsApp', url: 'https://web.whatsapp.com', color: '#10b981' },
]

export function useMultiSession(platform: Platform) {
  const pinConfig = useLiveQuery(() => db.pinConfig.get(1), [])
  const groups = useLiveQuery(() => db.sessionGroups.orderBy('order').toArray(), []) ?? []
  const rawSessions = useLiveQuery(() => db.sessions.orderBy('id').toArray(), []) ?? []
  const sessions = [...rawSessions].sort(
    (a, b) => (a.order ?? a.id ?? 0) - (b.order ?? b.id ?? 0)
  )

  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [notice, setNoticeState] = useState<string | null>(null)

  const setNotice = useCallback((msg: string | null) => {
    setNoticeState(msg)
    if (msg) toast.warning(msg)
  }, [])

  const hasPinSetup = Boolean(pinConfig?.hash)
  const lockedUntil = pinConfig?.lockedUntil ?? null
  const isRateLimited = Boolean(lockedUntil && lockedUntil > nowMs)
  const lockoutRemainingSec = isRateLimited && lockedUntil
    ? Math.max(1, Math.ceil((lockedUntil - nowMs) / 1000))
    : 0

  // Contador regresivo si está bloqueado por intentos fallidos
  useEffect(() => {
    if (!isRateLimited) return
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [isRateLimited])

  // Inicializar grupo por defecto si está vacío
  useEffect(() => {
    if (!hasPinSetup || !isUnlocked) return
    db.sessionGroups.count().then((count) => {
      if (count === 0) {
        db.sessionGroups.bulkAdd([
          { name: 'Trabajo', color: '#3b82f6', order: 1, createdAt: new Date() },
          { name: 'Personal', color: '#10b981', order: 2, createdAt: new Date() },
        ])
      }
    })
  }, [hasPinSetup, isUnlocked])

  // Sincronizar estado activo/dormido con los WebViews nativos reales
  const syncActiveStates = useCallback(async () => {
    const activeUuids = new Set(await multiSessionBridge.getActiveSessionUuids(platform))
    const currentSessions = await db.sessions.toArray()
    for (const s of currentSessions) {
      const expectedStatus = activeUuids.has(s.uuid) ? 'active' : 'sleeping'
      if (s.status !== expectedStatus && s.id !== undefined) {
        await db.sessions.update(s.id, { status: expectedStatus })
      }
    }
  }, [platform])

  useEffect(() => {
    if (!isUnlocked) return
    syncActiveStates()
    const interval = setInterval(syncActiveStates, 8000)
    return () => clearInterval(interval)
  }, [isUnlocked, syncActiveStates])

  // Auto-hibernación de sesiones inactivas para optimizar RAM al 100%
  useEffect(() => {
    if (!isUnlocked) return
    const timer = setInterval(async () => {
      const cutoff = Date.now() - IDLE_SLEEP_MS
      const stale = await db.sessions
        .where('status')
        .equals('active')
        .filter((s) => s.lastActiveAt.getTime() < cutoff)
        .toArray()

      for (const s of stale) {
        await multiSessionBridge.sleepSession(platform, s.uuid)
        if (s.id !== undefined) {
          await db.sessions.update(s.id, { status: 'sleeping' })
        }
      }
    }, 60_000)
    return () => clearInterval(timer)
  }, [isUnlocked, platform])

  // Auto-Lock cuando la app pasa a segundo plano (seguridad)
  useEffect(() => {
    if (!hasPinSetup || !isUnlocked) return
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        multiSessionBridge.sleepAllSessions(platform).catch(() => {})
        setIsUnlocked(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [hasPinSetup, isUnlocked, platform])

  const setupPin = useCallback(async (pin: string, pinLength: 4 | 6) => {
    if (pin.length !== pinLength || !/^\d+$/.test(pin)) {
      setPinError(`El PIN debe tener ${pinLength} dígitos numéricos.`)
      return false
    }
    const salt = generateSaltHex()
    const hash = await derivePinHash(pin, salt)
    const config: PinConfig = {
      id: 1,
      hash,
      salt,
      iterations: 100_000,
      pinLength,
      failedAttempts: 0,
      lockedUntil: null,
      autoLockMinutes: 5,
      updatedAt: new Date(),
    }
    await db.pinConfig.put(config)
    setPinError(null)
    setIsUnlocked(true)
    return true
  }, [])

  const verifyPin = useCallback(async (pin: string) => {
    const config = await db.pinConfig.get(1)
    if (!config) return false

    const currentNow = Date.now()
    setNowMs(currentNow)
    if (config.lockedUntil && config.lockedUntil > currentNow) {
      setPinError(`Demasiados intentos. Espera ${Math.ceil((config.lockedUntil - currentNow) / 1000)}s.`)
      return false
    }

    const valid = await verifyPinHash(pin, config.hash, config.salt, config.iterations)
    if (valid) {
      await db.pinConfig.update(1, { failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      setPinError(null)
      setIsUnlocked(true)
      return true
    }

    const nextAttempts = config.failedAttempts + 1
    const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS
    await db.pinConfig.update(1, {
      failedAttempts: shouldLock ? 0 : nextAttempts,
      lockedUntil: shouldLock ? currentNow + LOCKOUT_MS : null,
      updatedAt: new Date(),
    })

    if (shouldLock) {
      setPinError('Demasiados intentos fallidos. Bloqueado por 30 segundos.')
    } else {
      setPinError(`PIN incorrecto (${MAX_FAILED_ATTEMPTS - nextAttempts} intentos restantes).`)
    }
    return false
  }, [])

  const lockNow = useCallback(async (sleepAllOnLock = true) => {
    setPinError(null)
    setIsUnlocked(false)
    if (sleepAllOnLock) {
      await multiSessionBridge.sleepAllSessions(platform)
      const active = await db.sessions.where('status').equals('active').toArray()
      for (const s of active) {
        if (s.id !== undefined) {
          await db.sessions.update(s.id, { status: 'sleeping' })
        }
      }
    } else {
      await multiSessionBridge.hideAllSessions(platform)
    }
  }, [platform])

  const createGroup = useCallback(async (name: string, color: string): Promise<number | null> => {
    const clean = name.trim()
    if (!clean) return null
    const count = await db.sessionGroups.count()
    const id = await db.sessionGroups.add({
      name: clean,
      color,
      order: count + 1,
      createdAt: new Date(),
    })
    return id ?? null
  }, [])

  const createSession = useCallback(
    async (input: { name: string; url: string; groupId: number; color: string }): Promise<boolean> => {
      const cleanName = input.name.trim()
      const safeUrl = sanitizeSessionUrl(input.url)
      if (!cleanName || !safeUrl) {
        setNotice('Ingresa un nombre válido y una URL https:// válida.')
        return false
      }

      const uuid = generateSessionUuid()
      const maxOrder = sessions.reduce((acc, s) => Math.max(acc, s.order ?? s.id ?? 0), 0)
      await db.sessions.add({
        uuid,
        groupId: input.groupId,
        name: cleanName,
        url: safeUrl,
        color: input.color,
        order: maxOrder + 1,
        status: 'sleeping',
        lastActiveAt: new Date(),
        createdAt: new Date(),
      })
      setNotice(null)
      return true
    },
    [sessions]
  )

  const reorderSession = useCallback(
    async (uuid: string, direction: 'up' | 'down') => {
      const idx = sessions.findIndex((s) => s.uuid === uuid)
      if (idx === -1) return
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= sessions.length) return

      const nextList = [...sessions]
      const [moved] = nextList.splice(idx, 1)
      nextList.splice(targetIdx, 0, moved)

      await Promise.all(
        nextList.map((s, index) =>
          s.id !== undefined ? db.sessions.update(s.id, { order: index + 1 }) : Promise.resolve()
        )
      )
    },
    [sessions]
  )

  const openSession = useCallback(
    async (session: WebSession, bounds?: SessionBounds) => {
      const safeUrl = sanitizeSessionUrl(session.url)
      if (!safeUrl) {
        setNotice('URL no permitida por políticas de seguridad.')
        return
      }

      const result = await multiSessionBridge.openSession(
        platform,
        session.uuid,
        session.name,
        safeUrl,
        bounds
      )
      if (session.id !== undefined) {
        await db.sessions.update(session.id, {
          status: result.mode === 'native' ? 'active' : 'sleeping',
          lastActiveAt: new Date(),
        })
      }

      if (result.mode === 'web-fallback') {
        setNotice(
          'En navegador Web las pestañas comparten cookies. Para aislamiento real usa la app de Escritorio (Tauri) o Móvil.'
        )
      } else {
        setNotice(null)
      }
    },
    [platform]
  )

  const sleepSession = useCallback(
    async (session: WebSession) => {
      await multiSessionBridge.sleepSession(platform, session.uuid)
      if (session.id !== undefined) {
        await db.sessions.update(session.id, { status: 'sleeping' })
      }
    },
    [platform]
  )

  const sleepAllSessions = useCallback(async () => {
    await multiSessionBridge.sleepAllSessions(platform)
    const active = await db.sessions.where('status').equals('active').toArray()
    for (const s of active) {
      if (s.id !== undefined) {
        await db.sessions.update(s.id, { status: 'sleeping' })
      }
    }
  }, [platform])

  const deleteSession = useCallback(
    async (session: WebSession) => {
      await multiSessionBridge.deleteSessionData(platform, session.uuid)
      if (session.id !== undefined) {
        await db.sessions.delete(session.id)
      }
    },
    [platform]
  )

  return {
    pinConfig,
    hasPinSetup,
    isUnlocked,
    pinError,
    isRateLimited,
    lockoutRemainingSec,
    groups: groups as SessionGroup[],
    sessions: sessions as WebSession[],
    notice,
    clearNotice: () => setNotice(null),
    supportsTrueIsolation: multiSessionBridge.supportsTrueIsolation(platform),
    setupPin,
    verifyPin,
    lockNow,
    createGroup,
    createSession,
    openSession,
    sleepSession,
    sleepAllSessions,
    deleteSession,
    reorderSession,
  }
}
