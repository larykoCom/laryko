import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type UserPreferences } from '@/db/laryko.db'
import {
  EMPTY_VAULT,
  decodePairingToken,
  decryptVault,
  encodePairingToken,
  encryptVault,
  type EncryptedVaultEnvelope,
  type UserIntegrationsVault,
} from '@/utils/vaultCrypto'
import { integrationsBridge } from '@/utils/integrationsBridge'
import type { Platform } from '@/types'

const DEFAULT_PREFS: UserPreferences = {
  id: 1,
  displayName: 'Usuario Laryko',
  idleSleepMinutes: 10,
  autoSync: false,
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
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(
    null
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
        setStatusMessage({ type: 'ok', text: 'Configuración cifrada y guardada localmente.' })
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
    [vaultUnlocked, passphrase]
  )

  const savePrefs = useCallback(async (partial: Partial<UserPreferences>) => {
    const current = (await db.userPrefs.get(1)) ?? DEFAULT_PREFS
    await db.userPrefs.put({
      ...current,
      ...partial,
      id: 1,
      updatedAt: new Date(),
    })
  }, [])

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
        setStatusMessage({ type: 'error', text: 'Configura primero tu URL de Neon Postgres.' })
        return
      }
      if (!passphrase) return

      setBusy(true)
      setStatusMessage(null)
      try {
        const envelope = await encryptVault(activeVault, passphrase)
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
    [vault, passphrase, platform, savePrefs]
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
        const decrypted = await decryptVault(envelope, masterSecret)
        await db.userVault.put({
          id: 1,
          salt: envelope.salt,
          iv: envelope.iv,
          ciphertext: envelope.ciphertext,
          updatedAt: new Date(),
        })
        setVault(decrypted)
        setPassphrase(masterSecret)
        setVaultUnlocked(true)
        await savePrefs({ lastSyncAt: new Date() })
        setStatusMessage({
          type: 'ok',
          text: 'Bóveda descargada y descifrada desde Neon Postgres.',
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
    [platform, savePrefs]
  )

  const generatePairingCode = useCallback(async (): Promise<string | null> => {
    if (!vaultUnlocked || !passphrase) return null
    const envelope = await encryptVault(vault, passphrase)
    return encodePairingToken(envelope)
  }, [vaultUnlocked, passphrase, vault])

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
        const decrypted = await decryptVault(envelope, pairingSecret.trim())
        await db.userVault.put({
          id: 1,
          salt: envelope.salt,
          iv: envelope.iv,
          ciphertext: envelope.ciphertext,
          updatedAt: new Date(),
        })
        setVault(decrypted)
        setPassphrase(pairingSecret.trim())
        setVaultUnlocked(true)
        await savePrefs({ lastSyncAt: new Date() })
        setStatusMessage({
          type: 'ok',
          text: 'Dispositivo vinculado. Todas las integraciones fueron aplicadas.',
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
    [savePrefs]
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

  return {
    hasVaultSetup,
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
    syncUpToNeon,
    syncDownFromNeon,
    generatePairingCode,
    importPairingCode,
    testResend,
    testR2,
  }
}
