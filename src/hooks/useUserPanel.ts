import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type UserPreferences } from '@/db/laryko.db'
import {
  EMPTY_VAULT,
  decodePairingToken,
  decryptSyncBundle,
  decryptVault,
  encodePairingToken,
  encryptSyncBundle,
  encryptVault,
  type EncryptedVaultEnvelope,
  type FullSyncBundle,
  type UserIntegrationsVault,
} from '@/utils/vaultCrypto'
import { integrationsBridge } from '@/utils/integrationsBridge'
import { toast } from '@/utils/toast'
import type { Platform } from '@/types'

const DEFAULT_PREFS: UserPreferences = {
  id: 1,
  displayName: 'Usuario Laryko',
  idleSleepMinutes: 10,
  autoSync: true,
  lastSyncAt: null,
  updatedAt: new Date(),
}

export function useUserPanel(platform: Platform) {
  const vaultRecord = useLiveQuery(() => db.userVault.get(1), [])
  const prefsRecord = useLiveQuery(() => db.userPrefs.get(1), [])

  const [vaultUnlocked, setVaultUnlocked] = useState(false)
  const [passphrase, setPassphrase] = useState<string>('')
  const [vault, setVault] = useState<UserIntegrationsVault>(EMPTY_VAULT)
  const [busy, setBusy] = useState(false)
  const [statusMessage, setStatusMessageState] = useState<{
    type: 'ok' | 'error'
    text: string
  } | null>(null)

  const setStatusMessage = useCallback(
    (msg: { type: 'ok' | 'error'; text: string } | null) => {
      setStatusMessageState(msg)
      if (!msg) return
      if (msg.type === 'ok') toast.success(msg.text)
      else toast.error(msg.text)
    },
    []
  )

  const hasVaultSetup = Boolean(vaultRecord?.ciphertext)
  const prefs = prefsRecord ?? DEFAULT_PREFS

  useEffect(() => {
    db.userPrefs.get(1).then((existing) => {
      if (!existing) {
        db.userPrefs.put(DEFAULT_PREFS)
      }
    })
  }, [])

  const unlockOrInitVault = useCallback(
    async (secret: string): Promise<boolean> => {
      const clean = secret.trim()
      if (clean.length < 4) {
        setStatusMessage({
          type: 'error',
          text: 'La clave maestra debe tener al menos 4 caracteres.',
        })
        return false
      }

      setBusy(true)
      setStatusMessage(null)
      try {
        if (vaultRecord?.ciphertext) {
          const decrypted = await decryptVault(
            {
              v: 1,
              salt: vaultRecord.salt,
              iv: vaultRecord.iv,
              ciphertext: vaultRecord.ciphertext,
            },
            clean
          )
          setVault(decrypted)
        } else {
          const envelope = await encryptVault(EMPTY_VAULT, clean)
          await db.userVault.put({
            id: 1,
            salt: envelope.salt,
            iv: envelope.iv,
            ciphertext: envelope.ciphertext,
            updatedAt: new Date(),
          })
          setVault(EMPTY_VAULT)
        }
        setPassphrase(clean)
        setVaultUnlocked(true)
        return true
      } catch {
        setStatusMessage({ type: 'error', text: 'Clave maestra incorrecta.' })
        return false
      } finally {
        setBusy(false)
      }
    },
    [vaultRecord]
  )

  const lockVault = useCallback(() => {
    setPassphrase('')
    setVault(EMPTY_VAULT)
    setVaultUnlocked(false)
    setStatusMessage(null)
  }, [])

  const buildFullBundle = useCallback(
    async (activeVault: UserIntegrationsVault, overridePrefs?: UserPreferences): Promise<FullSyncBundle> => {
      const currentPrefs = overridePrefs ?? (await db.userPrefs.get(1)) ?? DEFAULT_PREFS
      const groups = await db.sessionGroups.orderBy('order').toArray()
      const sessions = await db.sessions.orderBy('id').toArray()
      const reminders = await db.reminders.orderBy('dueAt').toArray()
      return {
        v: 2,
        updatedAtMs: Date.now(),
        vault: activeVault,
        prefs: {
          displayName: currentPrefs.displayName,
          idleSleepMinutes: currentPrefs.idleSleepMinutes,
          autoSync: currentPrefs.autoSync,
        },
        sessionGroups: groups.map((g) => ({
          id: g.id,
          name: g.name,
          color: g.color,
          order: g.order,
        })),
        sessions: sessions.map((s) => ({
          uuid: s.uuid,
          groupId: s.groupId,
          name: s.name,
          url: s.url,
          color: s.color,
          order: s.order,
        })),
        reminders: reminders.map((r) => ({
          uuid: r.uuid,
          title: r.title,
          notes: r.notes,
          dueAt: r.dueAt.toISOString(),
          completed: r.completed,
          notifyNative: r.notifyNative,
          notifyEmail: r.notifyEmail,
          persistent: r.persistent,
          isAlarm: r.isAlarm,
          recurrence: r.recurrence,
          recurrenceInterval: r.recurrenceInterval,
          recurrenceUnit: r.recurrenceUnit,
          soundPreset: r.soundPreset,
          updatedAt: r.updatedAt.toISOString(),
        })),
      }
    },
    []
  )

  const applyFullBundle = useCallback(
    async (bundle: FullSyncBundle, envelope: EncryptedVaultEnvelope, masterSecret: string) => {
      await db.userVault.put({
        id: 1,
        salt: envelope.salt,
        iv: envelope.iv,
        ciphertext: envelope.ciphertext,
        updatedAt: new Date(),
      })

      if (bundle.prefs) {
        const current = (await db.userPrefs.get(1)) ?? DEFAULT_PREFS
        await db.userPrefs.put({
          ...current,
          displayName: bundle.prefs.displayName,
          idleSleepMinutes: bundle.prefs.idleSleepMinutes,
          autoSync: bundle.prefs.autoSync,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
      }

      if (bundle.sessionGroups && bundle.sessionGroups.length > 0) {
        for (const g of bundle.sessionGroups) {
          if (g.id !== undefined) {
            const exists = await db.sessionGroups.get(g.id)
            if (!exists) {
              await db.sessionGroups.put({
                id: g.id,
                name: g.name,
                color: g.color,
                order: g.order,
                createdAt: new Date(),
              })
            }
          }
        }
      }

      if (bundle.sessions && bundle.sessions.length > 0) {
        for (const s of bundle.sessions) {
          const exists = await db.sessions.where('uuid').equals(s.uuid).first()
          if (!exists) {
            await db.sessions.add({
              uuid: s.uuid,
              groupId: s.groupId,
              name: s.name,
              url: s.url,
              color: s.color,
              order: s.order,
              status: 'sleeping',
              lastActiveAt: new Date(),
              createdAt: new Date(),
            })
          }
        }
      }

      if (bundle.reminders && bundle.reminders.length > 0) {
        for (const r of bundle.reminders) {
          const exists = await db.reminders.where('uuid').equals(r.uuid).first()
          const remoteUpdated = new Date(r.updatedAt)
          if (!exists) {
            await db.reminders.add({
              uuid: r.uuid,
              title: r.title,
              notes: r.notes,
              dueAt: new Date(r.dueAt),
              completed: r.completed,
              notifyNative: r.notifyNative,
              notifyEmail: r.notifyEmail,
              persistent: r.persistent,
              isAlarm: r.isAlarm,
              recurrence: r.recurrence,
              recurrenceInterval: r.recurrenceInterval,
              recurrenceUnit: r.recurrenceUnit,
              soundPreset: r.soundPreset as typeof exists extends never ? never : undefined,
              createdAt: remoteUpdated,
              updatedAt: remoteUpdated,
            })
          } else if (exists.id !== undefined && remoteUpdated > exists.updatedAt) {
            await db.reminders.update(exists.id, {
              title: r.title,
              notes: r.notes,
              dueAt: new Date(r.dueAt),
              completed: r.completed,
              notifyNative: r.notifyNative,
              notifyEmail: r.notifyEmail,
              persistent: r.persistent,
              isAlarm: r.isAlarm,
              recurrence: r.recurrence,
              recurrenceInterval: r.recurrenceInterval,
              recurrenceUnit: r.recurrenceUnit,
              updatedAt: remoteUpdated,
            })
          }
        }
      }

      setVault(bundle.vault)
      setPassphrase(masterSecret)
      setVaultUnlocked(true)
    },
    []
  )

  const bidirectionalSync = useCallback(async () => {
    if (!vaultUnlocked || !passphrase || !vault.neonDatabaseUrl.trim()) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    const currentPrefs = (await db.userPrefs.get(1)) ?? DEFAULT_PREFS
    if (!currentPrefs.autoSync) return

    try {
      const rawRemote = await integrationsBridge.pullVaultFromNeon(platform, vault.neonDatabaseUrl)
      if (!rawRemote || currentPrefs.pendingSync) {
        // Hay cambios locales offline pendientes (o remoto vacío) -> subir a Neon
        const bundle = await buildFullBundle(vault, currentPrefs)
        const envelope = await encryptSyncBundle(bundle, passphrase)
        await integrationsBridge.syncVaultToNeon(
          platform,
          vault.neonDatabaseUrl,
          JSON.stringify(envelope)
        )
        await db.userPrefs.update(1, { pendingSync: false, lastSyncAt: new Date() })
        return
      }

      const envelope = JSON.parse(rawRemote) as EncryptedVaultEnvelope
      const remoteBundle = await decryptSyncBundle(envelope, passphrase)
      const remoteTs = remoteBundle.updatedAtMs ?? 0
      const localTs = currentPrefs.lastSyncAt ? currentPrefs.lastSyncAt.getTime() : 0

      if (remoteTs > localTs) {
        await applyFullBundle(remoteBundle, envelope, passphrase)
        await db.userPrefs.update(1, { pendingSync: false, lastSyncAt: new Date() })
      }
    } catch {
      // Offline-first: mantener pendingSync para reintentar al reconectar
    }
  }, [vaultUnlocked, passphrase, vault, platform, buildFullBundle, applyFullBundle])

  // Sincronización bidireccional automática al recuperar conexión a internet
  useEffect(() => {
    if (!vaultUnlocked || !vault.neonDatabaseUrl.trim()) return
    bidirectionalSync()

    const onOnline = () => {
      bidirectionalSync()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [vaultUnlocked, vault.neonDatabaseUrl, bidirectionalSync])

  const savePrefs = useCallback(
    async (partial: Partial<UserPreferences>) => {
      const current = (await db.userPrefs.get(1)) ?? DEFAULT_PREFS
      const nextPrefs: UserPreferences = {
        ...current,
        ...partial,
        id: 1,
        pendingSync: true,
        updatedAt: new Date(),
      }
      await db.userPrefs.put(nextPrefs)

      if (vaultUnlocked && passphrase && vault.neonDatabaseUrl.trim() && nextPrefs.autoSync) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return
        try {
          const bundle = await buildFullBundle(vault, nextPrefs)
          const envelope = await encryptSyncBundle(bundle, passphrase)
          await integrationsBridge.syncVaultToNeon(
            platform,
            vault.neonDatabaseUrl,
            JSON.stringify(envelope)
          )
          await db.userPrefs.update(1, { pendingSync: false, lastSyncAt: new Date() })
        } catch {
          // Guardado local con pendingSync=true para sincronizar al volver internet
        }
      }
    },
    [vaultUnlocked, passphrase, vault, platform, buildFullBundle]
  )

  const saveVault = useCallback(
    async (nextVault: UserIntegrationsVault) => {
      if (!vaultUnlocked || !passphrase) return false
      setBusy(true)
      setStatusMessage(null)
      try {
        const envelope = await encryptVault(nextVault, passphrase)
        await db.userVault.put({
          id: 1,
          salt: envelope.salt,
          iv: envelope.iv,
          ciphertext: envelope.ciphertext,
          updatedAt: new Date(),
        })
        setVault(nextVault)

        const currentPrefs = (await db.userPrefs.get(1)) ?? DEFAULT_PREFS
        await db.userPrefs.put({ ...currentPrefs, id: 1, pendingSync: true, updatedAt: new Date() })

        if (nextVault.neonDatabaseUrl.trim() && currentPrefs.autoSync) {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setStatusMessage({
              type: 'ok',
              text: 'Guardado en LocalDB (sin internet). Se sincronizará con Neon al reconectar.',
            })
            return true
          }
          try {
            const bundle = await buildFullBundle(nextVault, currentPrefs)
            const syncEnvelope = await encryptSyncBundle(bundle, passphrase)
            await integrationsBridge.syncVaultToNeon(
              platform,
              nextVault.neonDatabaseUrl,
              JSON.stringify(syncEnvelope)
            )
            await db.userPrefs.update(1, { pendingSync: false, lastSyncAt: new Date() })
            setStatusMessage({
              type: 'ok',
              text: 'Guardado en LocalDB y sincronizado con Neon Postgres.',
            })
            return true
          } catch (syncErr) {
            setStatusMessage({
              type: 'ok',
              text: `Guardado en LocalDB (pendiente sync Neon: ${
                syncErr instanceof Error ? syncErr.message : 'sin conexión'
              }).`,
            })
            return true
          }
        }

        setStatusMessage({ type: 'ok', text: 'Configuración cifrada y guardada en LocalDB.' })
        return true
      } catch (e) {
        setStatusMessage({
          type: 'error',
          text: e instanceof Error ? e.message : 'Error guardando la bóveda.',
        })
        return false
      } finally {
        setBusy(false)
      }
    },
    [vaultUnlocked, passphrase, platform, buildFullBundle]
  )

  const testNeon = useCallback(
    async (databaseUrl: string) => {
      setBusy(true)
      setStatusMessage(null)
      try {
        const msg = await integrationsBridge.testNeonConnection(platform, databaseUrl)
        setStatusMessage({ type: 'ok', text: msg })
      } catch (e) {
        setStatusMessage({
          type: 'error',
          text: e instanceof Error ? e.message : String(e),
        })
      } finally {
        setBusy(false)
      }
    },
    [platform]
  )

  const syncUpToNeon = useCallback(
    async (targetVault?: UserIntegrationsVault) => {
      const activeVault = targetVault ?? vault
      if (!activeVault.neonDatabaseUrl.trim()) {
        setStatusMessage({
          type: 'error',
          text: 'Requisito obligatorio: configura primero tu base de datos Neon Postgres.',
        })
        return
      }
      if (!passphrase) return

      setBusy(true)
      setStatusMessage(null)
      try {
        const bundle = await buildFullBundle(activeVault)
        const envelope = await encryptSyncBundle(bundle, passphrase)
        const msg = await integrationsBridge.syncVaultToNeon(
          platform,
          activeVault.neonDatabaseUrl,
          JSON.stringify(envelope)
        )
        await savePrefs({ lastSyncAt: new Date() })
        setStatusMessage({ type: 'ok', text: msg })
      } catch (e) {
        setStatusMessage({
          type: 'error',
          text: e instanceof Error ? e.message : String(e),
        })
      } finally {
        setBusy(false)
      }
    },
    [vault, passphrase, platform, savePrefs, buildFullBundle]
  )

  const syncDownFromNeon = useCallback(
    async (databaseUrl: string, masterSecret: string) => {
      setBusy(true)
      setStatusMessage(null)
      try {
        const rawPayload = await integrationsBridge.pullVaultFromNeon(platform, databaseUrl)
        if (!rawPayload) {
          setStatusMessage({
            type: 'error',
            text: 'No se encontró ninguna bóveda guardada en ese Neon Postgres.',
          })
          return false
        }
        const envelope = JSON.parse(rawPayload) as EncryptedVaultEnvelope
        const bundle = await decryptSyncBundle(envelope, masterSecret)
        await applyFullBundle(bundle, envelope, masterSecret)
        setStatusMessage({
          type: 'ok',
          text: 'Bóveda, preferencias y sesiones descargadas desde Neon Postgres.',
        })
        return true
      } catch (e) {
        setStatusMessage({
          type: 'error',
          text: e instanceof Error ? e.message : 'Error descargando o descifrando la bóveda.',
        })
        return false
      } finally {
        setBusy(false)
      }
    },
    [platform, applyFullBundle]
  )

  const generatePairingCode = useCallback(async (): Promise<string | null> => {
    if (!vaultUnlocked || !passphrase) return null
    if (!vault.neonDatabaseUrl.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Configura primero Neon Postgres como requisito obligatorio para sincronizar.',
      })
      return null
    }
    const bundle = await buildFullBundle(vault)
    const envelope = await encryptSyncBundle(bundle, passphrase)
    return encodePairingToken(envelope)
  }, [vaultUnlocked, passphrase, vault, buildFullBundle])

  const importPairingCode = useCallback(
    async (token: string, pairingSecret: string): Promise<boolean> => {
      setBusy(true)
      setStatusMessage(null)
      try {
        const envelope = decodePairingToken(token)
        if (!envelope) {
          setStatusMessage({ type: 'error', text: 'Código de vinculación Laryko inválido.' })
          return false
        }
        const bundle = await decryptSyncBundle(envelope, pairingSecret.trim())
        await applyFullBundle(bundle, envelope, pairingSecret.trim())
        setStatusMessage({
          type: 'ok',
          text: 'Dispositivo vinculado. Base de datos, preferencias y sesiones aplicadas.',
        })
        return true
      } catch {
        setStatusMessage({
          type: 'error',
          text: 'No se pudo descifrar el código (verifica tu clave maestra).',
        })
        return false
      } finally {
        setBusy(false)
      }
    },
    [applyFullBundle]
  )

  const testResend = useCallback(
    async (apiKey: string, fromEmail: string, toEmail: string) => {
      setBusy(true)
      setStatusMessage(null)
      try {
        const msg = await integrationsBridge.testResendConnection(
          platform,
          apiKey,
          fromEmail,
          toEmail
        )
        setStatusMessage({ type: 'ok', text: msg })
      } catch (e) {
        setStatusMessage({
          type: 'error',
          text: e instanceof Error ? e.message : String(e),
        })
      } finally {
        setBusy(false)
      }
    },
    [platform]
  )

  const testR2 = useCallback(
    async (accountId: string, bucketName: string) => {
      setBusy(true)
      setStatusMessage(null)
      try {
        const msg = await integrationsBridge.testR2Endpoint(platform, accountId, bucketName)
        setStatusMessage({ type: 'ok', text: msg })
      } catch (e) {
        setStatusMessage({
          type: 'error',
          text: e instanceof Error ? e.message : String(e),
        })
      } finally {
        setBusy(false)
      }
    },
    [platform]
  )

  const testAi = useCallback(
    async (
      provider: 'openai' | 'anthropic' | 'gemini' | 'custom',
      apiKey: string,
      baseUrl?: string
    ) => {
      setBusy(true)
      setStatusMessage(null)
      try {
        const msg = await integrationsBridge.testAiProvider(platform, provider, apiKey, baseUrl)
        setStatusMessage({ type: 'ok', text: msg })
      } catch (e) {
        setStatusMessage({
          type: 'error',
          text: e instanceof Error ? e.message : String(e),
        })
      } finally {
        setBusy(false)
      }
    },
    [platform]
  )

  const listAiModels = useCallback(
    async (
      provider: 'openai' | 'anthropic' | 'gemini' | 'custom',
      apiKey: string,
      baseUrl?: string,
      silent = false
    ): Promise<string[]> => {
      try {
        const models = await integrationsBridge.listAiModels(platform, provider, apiKey, baseUrl)
        if (!silent) {
          toast.success(
            models.length > 0
              ? `${models.length} modelos disponibles en ${provider}.`
              : `No se encontraron modelos en ${provider}.`
          )
        }
        return models
      } catch (e) {
        if (!silent) {
          toast.error(e instanceof Error ? e.message : String(e))
        }
        return []
      }
    },
    [platform]
  )

  const hasDatabaseConfigured = Boolean(vault.neonDatabaseUrl.trim())

  return {
    hasVaultSetup,
    hasDatabaseConfigured,
    vaultUnlocked,
    vault,
    prefs,
    busy,
    statusMessage,
    clearStatus: () => setStatusMessage(null),
    unlockOrInitVault,
    lockVault,
    saveVault,
    savePrefs,
    testNeon,
    bidirectionalSync,
    syncUpToNeon,
    syncDownFromNeon,
    generatePairingCode,
    importPairingCode,
    testResend,
    testR2,
    testAi,
    listAiModels,
  }
}
