import { useState, useEffect, useRef, useCallback } from 'react'
import {
  User,
  Database,
  Mail,
  HardDrive,
  Sliders,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Upload,
  Eye,
  EyeOff,
  QrCode,
  RefreshCw,
  Bot,
  Trash2,
  LogOut,
  Image as ImageIcon,
  FileText,
  Plus,
} from 'lucide-react'
import { useUserPanel } from '@/hooks/useUserPanel'
import {
  EMPTY_VAULT,
  getUserInitials,
  type AiProviderId,
  type StorageAccount,
  type StorageProviderId,
  type UserIntegrationsVault,
} from '@/utils/vaultCrypto'
import {
  categorizeMimeType,
  createDropboxPkceChallenge,
  deleteFileFromStorageAccount,
  exchangeDropboxPkceCode,
  formatFileSize,
  getLocalStorageQuota,
  getStorageAccountQuota,
  listCloudFilesForAccount,
  uploadFileToStorageAccount,
  type StorageQuotaInfo,
} from '@/utils/integrationsBridge'
import { generateSessionUuid } from '@/utils/pinCrypto'
import { playNotificationSound } from '@/utils/soundEngine'
import { db, type MediaCategory, type MediaItem, type NotificationSoundPreset } from '@/db/laryko.db'
import { useLiveQuery } from 'dexie-react-hooks'
import { triggerNativeHaptic } from '@/utils/nativeIOSBridge'
import { toast } from '@/utils/toast'
import type { Platform } from '@/types'
import styles from './UserPanel.module.css'

export type UserPanelTab = 'sync' | 'ai' | 'database' | 'email' | 'storage' | 'prefs'

function MediaThumbPreview({ item }: { item: MediaItem }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  useEffect(() => {
    if (item.category !== 'photo' || !item.data) {
      setThumbUrl(null)
      return
    }
    const url = URL.createObjectURL(new Blob([item.data], { type: item.mimeType || 'image/png' }))
    setThumbUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [item.category, item.data, item.mimeType])

  if (thumbUrl) {
    return <img src={thumbUrl} alt={item.name} />
  }
  if (item.category === 'photo') return <ImageIcon size={28} />
  return <FileText size={28} />
}

export interface UserPanelProps {
  platform: Platform
  userPanelState?: ReturnType<typeof useUserPanel>
  requestedTab?: UserPanelTab | null
}

export function UserPanel({ platform, userPanelState, requestedTab }: UserPanelProps) {
  const internalState = useUserPanel(platform)
  const {
    hasVaultSetup,
    hasDatabaseConfigured,
    hasResendConfigured,
    vaultUnlocked,
    vault,
    prefs,
    busy,
    statusMessage,
    unlockOrInitVault,
    lockVault,
    saveVault,
    savePrefs,
    testNeon,
    bidirectionalSync,
    syncUpToNeon,
    generatePairingCode,
    exportConfigFile,
    importPairingCode,
    testResend,
    testR2,
    testAi,
    listAiModels,
    registerAccount,
    loginWithAccount,
    deleteCloudAccount,
    wipeAllLocalData,
  } = userPanelState ?? internalState

  const [activeTab, setActiveTab] = useState<UserPanelTab>(requestedTab ?? 'sync')
  const [confirmDanger, setConfirmDanger] = useState<'cloud' | 'wipe' | 'wipe-all' | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [aiModelsMap, setAiModelsMap] = useState<Partial<Record<AiProviderId, string[]>>>({})
  const [loadingModelsFor, setLoadingModelsFor] = useState<AiProviderId | null>(null)
  const lastFetchedKeyRef = useRef<Partial<Record<AiProviderId, string>>>({})

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab)
    }
  }, [requestedTab])
  const [unlockMode, setUnlockMode] = useState<'vault' | 'code'>('vault')
  const [showDbLoginInSync, setShowDbLoginInSync] = useState(false)
  const [masterInput, setMasterInput] = useState('')
  const [setupName, setSetupName] = useState('')
  const [setupEmail, setSetupEmail] = useState('')
  const [loginNeonUrl, setLoginNeonUrl] = useState('')
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [draft, setDraft] = useState<UserIntegrationsVault>(EMPTY_VAULT)
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({})
  const toggleSecret = (key: string) =>
    setVisibleSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  const renderEyeBtn = (key: string) => (
    <button
      type="button"
      className={styles.secondaryBtn}
      onClick={() => toggleSecret(key)}
      title={visibleSecrets[key] ? 'Ocultar clave' : 'Mostrar clave'}
      aria-label={visibleSecrets[key] ? 'Ocultar clave' : 'Mostrar clave'}
    >
      {visibleSecrets[key] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  )
  const [testToEmail, setTestToEmail] = useState('')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [importToken, setImportToken] = useState('')
  const [importPass, setImportPass] = useState('')
  const [displayNameDraft, setDisplayNameDraft] = useState(prefs.displayName)
  const [hideWizard, setHideWizard] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const celebratedRef = useRef(
    typeof window !== 'undefined' && localStorage.getItem('laryko_setup_celebrated') === '1'
  )
  const customAudio = useLiveQuery(() => db.customAudio.get(1), [])
  const mediaItems = useLiveQuery(() => db.mediaItems.orderBy('createdAt').reverse().toArray(), []) ?? []

  const [mediaFilter, setMediaFilter] = useState<'all' | MediaCategory>('all')
  const [storageFilter, setStorageFilter] = useState<string>('all')
  const [uploadTargetStorage, setUploadTargetStorage] = useState<string>('local')
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [showAddStorage, setShowAddStorage] = useState(false)
  const [newStorageProvider, setNewStorageProvider] = useState<StorageProviderId>('r2')
  const [newStorageLabel, setNewStorageLabel] = useState('')
  const [newStorageAccountId, setNewStorageAccountId] = useState('')
  const [newStorageBucket, setNewStorageBucket] = useState('')
  const [newStorageEndpoint, setNewStorageEndpoint] = useState('')
  const [newStorageAccessKey, setNewStorageAccessKey] = useState('')
  const [newStorageSecretKey, setNewStorageSecretKey] = useState('')
  const [dropboxVerifier, setDropboxVerifier] = useState('')
  const [dropboxAuthCode, setDropboxAuthCode] = useState('')
  const [confirmDeleteMediaUuid, setConfirmDeleteMediaUuid] = useState<string | null>(null)
  const [localQuota, setLocalQuota] = useState<StorageQuotaInfo | null>(null)
  const [accountQuotas, setAccountQuotas] = useState<Record<string, StorageQuotaInfo>>({})

  const refreshAllQuotas = useCallback(async (accounts: StorageAccount[]) => {
    const local = await getLocalStorageQuota()
    if (local) setLocalQuota(local)
    const next: Record<string, StorageQuotaInfo> = {}
    for (const acc of accounts) {
      try {
        next[acc.id] = await getStorageAccountQuota(acc)
      } catch {
        // Ignorar si falta token o sin conexión
      }
    }
    setAccountQuotas((prev) => ({ ...prev, ...next }))
  }, [])

  useEffect(() => {
    if (activeTab === 'storage' && vaultUnlocked) {
      void refreshAllQuotas(draft.storageAccounts ?? [])
    }
  }, [activeTab, vaultUnlocked, draft.storageAccounts, refreshAllQuotas])

  useEffect(() => {
    const accounts = draft.storageAccounts ?? []
    if (accounts.length > 0) {
      if (uploadTargetStorage === 'local' || !accounts.some((a) => a.id === uploadTargetStorage)) {
        setUploadTargetStorage(accounts[0].id)
      }
    } else if (uploadTargetStorage !== 'local') {
      setUploadTargetStorage('local')
    }
  }, [draft.storageAccounts, uploadTargetStorage])

  const hasAiConfigured = Boolean(
    vault.openaiApiKey.trim() ||
      vault.anthropicApiKey.trim() ||
      vault.geminiApiKey.trim() ||
      vault.customAiBaseUrl.trim()
  )
  const hasStorageConfigured = Boolean(
    vault.r2AccountId.trim() && vault.r2BucketName.trim()
  )

  const setupSteps: Array<{
    id: string
    label: string
    done: boolean
    optional?: boolean
    tab: UserPanelTab
  }> = [
    { id: 'profile', label: '1. Perfil Creado', done: vaultUnlocked && hasVaultSetup, tab: 'sync' },
    { id: 'database', label: '2. Base de Datos', done: hasDatabaseConfigured, tab: 'database' },
    { id: 'email', label: '3. Email / Alertas', done: hasResendConfigured, tab: 'email' },
    { id: 'storage', label: '4. Almacenamiento', done: hasStorageConfigured, tab: 'storage' },
    { id: 'ai', label: '5. IA (Opcional)', done: hasAiConfigured, optional: true, tab: 'ai' },
  ]
  const requiredSteps = setupSteps.filter((s) => !s.optional)
  const completedSteps = requiredSteps.filter((s) => s.done).length
  const setupProgress = Math.round((completedSteps / requiredSteps.length) * 100)
  const nextPendingStep = requiredSteps.find((s) => !s.done)

  useEffect(() => {
    if (!vaultUnlocked) return
    if (completedSteps === requiredSteps.length && !celebratedRef.current) {
      celebratedRef.current = true
      if (typeof window !== 'undefined') {
        localStorage.setItem('laryko_setup_celebrated', '1')
      }
      setShowConfetti(true)
      triggerNativeHaptic('success')
      toast.success('¡Configuración 100% completada! Tu workspace en Laryko está listo.')
      const timer = setTimeout(() => setShowConfetti(false), 3200)
      return () => clearTimeout(timer)
    }
    if (completedSteps < requiredSteps.length && celebratedRef.current) {
      celebratedRef.current = false
      if (typeof window !== 'undefined') {
        localStorage.removeItem('laryko_setup_celebrated')
      }
    }
  }, [vaultUnlocked, completedSteps, requiredSteps.length])

  useEffect(() => {
    setDraft(vault)
    if (vault.accountUsername && !regUsername) setRegUsername(vault.accountUsername)
    if (vault.accountEmail && !regEmail) {
      setRegEmail(vault.accountEmail)
    } else if (vault.resendToEmail && !regEmail) {
      setRegEmail(vault.resendToEmail)
    }
  }, [vault])

  useEffect(() => {
    setDisplayNameDraft(prefs.displayName)
  }, [prefs.displayName])

  const updateField = (key: keyof UserIntegrationsVault, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const pickPreferredModel = (provider: AiProviderId, models: string[]): string => {
    if (models.length === 0) return ''
    const prefsByProvider: Record<AiProviderId, string[]> = {
      gemini: ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-pro'],
      openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
      anthropic: ['claude-sonnet-4-20250514', 'claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest'],
      custom: [],
    }
    for (const candidate of prefsByProvider[provider]) {
      const exact = models.find((m) => m === candidate)
      if (exact) return exact
    }
    return models[0]
  }

  const loadModelsFor = useCallback(
    async (provider: AiProviderId, apiKey: string, baseUrl?: string, silent = false) => {
      const cacheKey = `${provider}:${apiKey.trim()}:${(baseUrl ?? '').trim()}`
      setLoadingModelsFor(provider)
      try {
        const models = await listAiModels(provider, apiKey, baseUrl, silent)
        if (models.length > 0) {
          lastFetchedKeyRef.current[provider] = cacheKey
          setAiModelsMap((prev) => ({ ...prev, [provider]: models }))
          const modelFieldMap: Record<AiProviderId, keyof UserIntegrationsVault> = {
            openai: 'openaiModel',
            anthropic: 'anthropicModel',
            gemini: 'geminiModel',
            custom: 'customAiModel',
          }
          const field = modelFieldMap[provider]
          setDraft((prev) => {
            const current = String(prev[field] ?? '')
            if (!current || !models.includes(current)) {
              return { ...prev, [field]: pickPreferredModel(provider, models) }
            }
            return prev
          })
        }
      } finally {
        setLoadingModelsFor((cur) => (cur === provider ? null : cur))
      }
    },
    [listAiModels]
  )

  useEffect(() => {
    if (!vaultUnlocked || activeTab !== 'ai') return
    const entries: Array<{
      provider: AiProviderId
      apiKey: string
      baseUrl?: string
      ready: boolean
    }> = [
      { provider: 'openai', apiKey: draft.openaiApiKey, ready: draft.openaiApiKey.trim().length >= 15 },
      { provider: 'anthropic', apiKey: draft.anthropicApiKey, ready: draft.anthropicApiKey.trim().length >= 15 },
      { provider: 'gemini', apiKey: draft.geminiApiKey, ready: draft.geminiApiKey.trim().length >= 15 },
      {
        provider: 'custom',
        apiKey: draft.customAiApiKey,
        baseUrl: draft.customAiBaseUrl,
        ready: /^https?:\/\/.+/i.test(draft.customAiBaseUrl.trim()),
      },
    ]

    const timers: number[] = []
    for (const item of entries) {
      if (!item.ready) continue
      const cacheKey = `${item.provider}:${item.apiKey.trim()}:${(item.baseUrl ?? '').trim()}`
      if (lastFetchedKeyRef.current[item.provider] === cacheKey) continue
      const t = window.setTimeout(() => {
        void loadModelsFor(item.provider, item.apiKey, item.baseUrl, true)
      }, 650)
      timers.push(t)
    }
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [
    vaultUnlocked,
    activeTab,
    draft.openaiApiKey,
    draft.anthropicApiKey,
    draft.geminiApiKey,
    draft.customAiBaseUrl,
    draft.customAiApiKey,
    loadModelsFor,
  ])

  if (!vaultUnlocked) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.unlockCard}>
          <div className={styles.unlockIcon}>
            <Lock size={28} strokeWidth={2.2} />
          </div>
          <h2 className={styles.title}>
            {hasVaultSetup
              ? `Desbloquear: ${prefs.displayName}`
              : 'Crear Perfil y Bóveda (E2EE)'}
          </h2>
          <p className={styles.subtitle}>
            {hasVaultSetup
              ? 'Ingresa tu clave maestra para acceder a tus integraciones, base de datos y sincronización.'
              : 'Todas tus API keys y cadenas de conexión se cifran localmente con AES-GCM-256 antes de guardarse o sincronizarse.'}
          </p>

          {statusMessage && (
            <div
              className={`${styles.banner} ${
                statusMessage.type === 'ok' ? styles.bannerOk : styles.bannerError
              }`}
            >
              {statusMessage.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className={styles.unlockModeTabs} role="tablist">
            <button
              type="button"
              className={`${styles.unlockModeBtn} ${unlockMode === 'vault' ? styles.unlockModeBtnActive : ''}`}
              onClick={() => setUnlockMode('vault')}
            >
              {hasVaultSetup ? 'Desbloquear' : 'Configurar Nuevo'}
            </button>
            <button
              type="button"
              className={`${styles.unlockModeBtn} ${unlockMode === 'code' ? styles.unlockModeBtnActive : ''}`}
              onClick={() => setUnlockMode('code')}
            >
              Sync QR / Cuenta
            </button>
          </div>

          {unlockMode === 'vault' && (
            <form
              className={styles.unlockForm}
              onSubmit={async (e) => {
                e.preventDefault()
                const ok = await unlockOrInitVault(
                  masterInput,
                  hasVaultSetup
                    ? undefined
                    : { displayName: setupName, email: setupEmail }
                )
                if (ok) {
                  triggerNativeHaptic('success')
                  setMasterInput('')
                  setSetupName('')
                  setSetupEmail('')
                }
              }}
            >
              {!hasVaultSetup && (
                <>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Tu nombre o alias (ej. Chris)"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    required
                  />
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="Correo electrónico (ej. tu@correo.com)"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    required
                  />
                </>
              )}
              <input
                type="password"
                className={styles.input}
                placeholder={hasVaultSetup ? 'Clave maestra' : 'Nueva clave maestra (mín. 4 caracteres)'}
                value={masterInput}
                onChange={(e) => setMasterInput(e.target.value)}
                required
              />
              <button type="submit" className={styles.primaryBtn} disabled={busy}>
                <Unlock size={16} />
                <span>{hasVaultSetup ? 'Desbloquear Bóveda' : 'Crear Perfil y Bóveda'}</span>
              </button>
            </form>
          )}

          {unlockMode === 'code' && (
            <div className={styles.importBox}>
              <h3 className={styles.sectionHeading}>
                <QrCode size={16} />
                <span>Importar Workspace (Archivo .laryko o Código)</span>
              </h3>
              <p className={styles.hint}>
                Carga tu archivo <code>.laryko</code> o pega el código <code>LARYKO-SYNC:1:...</code> de tu otro dispositivo e ingresa la clave maestra.
              </p>
              <label className={styles.secondaryBtn} style={{ cursor: 'pointer', justifyContent: 'center' }}>
                <Upload size={14} />
                <span>Seleccionar Archivo .laryko</span>
                <input
                  type="file"
                  accept=".laryko,.txt"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const text = await file.text()
                    setImportToken(text.trim())
                    toast.info(`Archivo ${file.name} cargado. Ingresa tu clave maestra y pulsa Importar.`)
                  }}
                />
              </label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="O pega aquí el código LARYKO-SYNC:1:..."
                value={importToken}
                onChange={(e) => setImportToken(e.target.value)}
              />
              <input
                type="password"
                className={styles.input}
                placeholder="Clave maestra de la bóveda"
                value={importPass}
                onChange={(e) => setImportPass(e.target.value)}
              />
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy || !importToken.trim() || !importPass.trim()}
                onClick={() => importPairingCode(importToken, importPass)}
              >
                <Download size={15} />
                <span>Importar y Aplicar en este Dispositivo</span>
              </button>

              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setShowDbLoginInSync((prev) => !prev)}
              >
                <User size={14} />
                <span>
                  {showDbLoginInSync
                    ? 'Ocultar acceso por Base de Datos'
                    : '¿No tienes el código? Iniciar sesión desde Base de Datos'}
                </span>
              </button>

              {showDbLoginInSync && (
                <form
                  className={styles.unlockForm}
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const ok = await loginWithAccount({
                      databaseUrl: loginNeonUrl,
                      identifier: loginIdentifier,
                      password: loginPassword,
                    })
                    if (ok) {
                      triggerNativeHaptic('success')
                      setLoginPassword('')
                    }
                  }}
                >
                  <input
                    type="password"
                    className={styles.input}
                    placeholder="URL de Base de Datos (postgresql://...)"
                    value={loginNeonUrl}
                    onChange={(e) => setLoginNeonUrl(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Usuario o correo electrónico"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    className={styles.input}
                    placeholder="Contraseña de tu cuenta"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <button type="submit" className={styles.primaryBtn} disabled={busy}>
                    <Unlock size={15} />
                    <span>Iniciar Sesión y Sincronizar</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      {showConfetti && (
        <div className={styles.confettiOverlay} aria-hidden="true">
          {Array.from({ length: 42 }).map((_, idx) => {
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']
            return (
              <span
                key={idx}
                className={styles.confettiPiece}
                style={{
                  left: `${(idx * 2.4) % 98}%`,
                  backgroundColor: colors[idx % colors.length],
                  animationDelay: `${(idx % 7) * 0.08}s`,
                }}
              />
            )
          })}
        </div>
      )}
      {/* ── Header del Panel de Usuario ── */}
      <div className={styles.panelHeader}>
        <div className={styles.profileRow}>
          <div className={styles.avatar} title={prefs.displayName}>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.04em' }}>
              {getUserInitials(prefs.displayName)}
            </span>
          </div>
          <div>
            <h2 className={styles.title}>{prefs.displayName}</h2>
            <p className={styles.subtitle}>
              {vault.accountEmail ? `${vault.accountEmail} · ` : ''}
              {hasDatabaseConfigured
                ? 'Modo Cloud (Neon Postgres)'
                : 'Modo Local (IndexedDB — sin sync)'}{' '}
              ·{' '}
              {prefs.lastSyncAt
                ? `Última sync: ${new Date(prefs.lastSyncAt).toLocaleString()}`
                : 'Sin sincronización remota aún'}
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={lockVault}
            title="Bloquear bóveda manteniendo este perfil"
          >
            <Lock size={15} />
            <span>Bloquear</span>
          </button>

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setConfirmLogout((prev) => !prev)}
            title="Cerrar sesión local y cambiar de usuario"
            style={
              confirmLogout
                ? { borderColor: '#ef4444', color: '#ef4444' }
                : undefined
            }
          >
            <LogOut size={15} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {confirmLogout && (
        <div
          className={styles.subCard}
          style={{
            borderColor: 'rgba(239, 68, 68, 0.35)',
            background: 'rgba(239, 68, 68, 0.06)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogOut size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: 'var(--font-size-sm)', display: 'block' }}>
                ¿Cerrar sesión local de {prefs.displayName}?
              </strong>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Se limpiará este perfil del dispositivo para cambiar de usuario. Tus datos en la nube no se borrarán.
              </span>
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={busy}
              onClick={() => setConfirmLogout(false)}
            >
              <span>Cancelar</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setConfirmLogout(false)
                await wipeAllLocalData(false)
              }}
              style={{
                height: 36,
                padding: '0 14px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <LogOut size={14} />
              <span>Sí, cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Navegación por Secciones (Mi Perfil primero) ── */}
      <div className={styles.tabsRow}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'sync' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('sync')}
        >
          <User size={15} />
          <span>Mi Perfil & Sync</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'database' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('database')}
        >
          <Database size={15} />
          <span>Base de Datos {hasDatabaseConfigured ? '✓' : '*'}</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'ai' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <Bot size={15} />
          <span>Inteligencia Artificial</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'email' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('email')}
        >
          <Mail size={15} />
          <span>Email / Alertas</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'storage' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('storage')}
        >
          <HardDrive size={15} />
          <span>Almacenamiento</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'prefs' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('prefs')}
        >
          <Sliders size={15} />
          <span>Preferencias</span>
        </button>
      </div>

      {/* ── Contenido de la Pestaña Activa ── */}
      <div className={styles.card}>
        {activeTab === 'sync' && (
          <div className={styles.sectionBody}>
            {!hideWizard && (
              <div className={styles.wizardCard}>
                <div className={styles.wizardHeader}>
                  <div>
                    <strong style={{ fontSize: 'var(--font-size-sm)', display: 'block' }}>
                      {completedSteps === requiredSteps.length
                        ? '🎉 ¡Workspace 100% Configurado!'
                        : 'Configuración Paso a Paso de tu Workspace'}
                    </strong>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {completedSteps === requiredSteps.length
                        ? 'Todas las integraciones esenciales están listas para usar.'
                        : `${completedSteps} de ${requiredSteps.length} pasos esenciales completados:`}
                    </span>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span className={styles.wizardPercent}>{setupProgress}%</span>
                    {nextPendingStep && (
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                        onClick={() => setActiveTab(nextPendingStep.tab)}
                      >
                        Siguiente: {nextPendingStep.label.replace(/^\d+\.\s*/, '')} →
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.closeNotice}
                      onClick={() => setHideWizard(true)}
                      title="Ocultar guía"
                      aria-label="Ocultar guía"
                      style={{ fontSize: 12 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className={styles.progressTrack} role="progressbar" aria-valuenow={setupProgress} aria-valuemin={0} aria-valuemax={100}>
                  <div className={styles.progressFill} style={{ width: `${setupProgress}%` }} />
                </div>

                <div className={styles.stepGrid}>
                  {setupSteps.map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      className={`${styles.stepPill} ${step.done ? styles.stepPillDone : ''}`}
                      onClick={() => setActiveTab(step.tab)}
                    >
                      <span>{step.label}</span>
                      <span>{step.done ? '✓' : '→'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.subCard}>
              <h3 className={styles.sectionHeading}>
                <User size={16} />
                <span>Mi Perfil Local</span>
              </h3>
              <p className={styles.hint}>
                Estado actual:{' '}
                <strong>
                  {hasDatabaseConfigured
                    ? vault.accountEmail
                      ? `Sincronizado (@${vault.accountUsername} · ${vault.accountEmail})`
                      : 'Base de Datos conectada (listo para sincronizar)'
                    : 'Perfil Local en este dispositivo (sin base de datos)'}
                </strong>
              </p>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Nombre del Perfil / Workspace</label>
                <div className={styles.inlineRow}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Tu nombre o alias"
                    value={displayNameDraft}
                    onChange={(e) => setDisplayNameDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => savePrefs({ displayName: displayNameDraft.trim() || 'Usuario Laryko' })}
                  >
                    Guardar Perfil
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.subCard}>
              <h3 className={styles.sectionHeading}>
                <QrCode size={16} />
                <span>Exportar Configuración & Llevar a Otro Dispositivo (Local-First)</span>
              </h3>
              <p className={styles.hint}>
                Exporta todo tu perfil, preferencias, claves cifradas (AES-GCM-256), sesiones y agenda en un archivo <code>.laryko</code> o código de vinculación, <strong>sin depender de la nube</strong>.
              </p>

              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  disabled={busy}
                  onClick={() => void exportConfigFile()}
                >
                  <Download size={15} />
                  <span>Exportar Archivo (.laryko)</span>
                </button>

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={busy}
                  onClick={async () => {
                    const code = await generatePairingCode()
                    setPairingCode(code)
                  }}
                >
                  <QrCode size={15} />
                  <span>Generar Código de Vinculación</span>
                </button>
              </div>

              {pairingCode && (
                <div className={styles.pairingResult}>
                  <textarea className={styles.textarea} rows={3} readOnly value={pairingCode} />
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={async () => {
                      await navigator.clipboard.writeText(pairingCode)
                      toast.success('Código de vinculación copiado al portapapeles.')
                    }}
                  >
                    <Copy size={14} />
                    <span>Copiar Código Cifrado</span>
                  </button>
                </div>
              )}
            </div>

            <div className={styles.subCard}>
              <h3 className={styles.sectionHeading}>
                <RefreshCw size={16} />
                <span>Sincronización Multi-Dispositivo en la Nube (Opcional)</span>
              </h3>
              {!hasDatabaseConfigured ? (
                <>
                  <p className={styles.hint}>
                    <strong>Modo Local-First activo:</strong> Tus datos viven en este dispositivo. Si quieres que todos tus cambios (sesiones, agenda y preferencias) se sincronicen automáticamente entre múltiples dispositivos en la nube, configura tu Base de Datos.
                  </p>
                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={() => setActiveTab('database')}
                    >
                      <Database size={15} />
                      <span>Configurar Base de Datos para Cloud Sync</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.hint}>
                    <strong>Multi-Dispositivo activo:</strong> Los cambios realizados en cualquiera de tus dispositivos se fusionan y sincronizan cifrados automáticamente cada 30s, al volver a la app y al reconectar.
                  </p>

                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      disabled={busy}
                      onClick={() => void syncUpToNeon(draft)}
                    >
                      <Upload size={15} />
                      <span>Subir Todo a la Nube</span>
                    </button>

                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      disabled={busy}
                      onClick={async () => {
                        await bidirectionalSync()
                        toast.success('Sincronización y fusión multi-dispositivo completada.')
                      }}
                    >
                      <RefreshCw size={15} />
                      <span>Sincronizar y Fusionar Ahora</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className={styles.subCard}>
              <h3 className={styles.sectionHeading}>
                <User size={16} />
                <span>Cuenta Adicional para Sincronizar (Usuario y Contraseña)</span>
              </h3>
              <p className={styles.hint}>
                <strong>Recomendación:</strong> Usa el <strong>mismo correo electrónico</strong> para tu cuenta de Laryko, tu proveedor de Base de Datos y Resend (por ejemplo, el correo con el que te registraste en Resend) para evitar problemas de envío o permisos entre dispositivos.
              </p>

              {!hasDatabaseConfigured ? (
                <>
                  <p className={styles.hint}>
                    <strong>Primero configura tu Base de Datos:</strong> Para poder crear tu cuenta y guardar tus credenciales, configura primero Neon, Supabase, PostgreSQL u otro proveedor en la pestaña <em>Base de Datos</em>.
                  </p>
                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={() => setActiveTab('database')}
                    >
                      <Database size={15} />
                      <span>Ir a Base de Datos</span>
                    </button>
                    {!hasResendConfigured && (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => setActiveTab('email')}
                      >
                        <Mail size={15} />
                        <span>Configurar Resend (opcional)</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {vault.accountEmail && (
                    <p className={styles.hint}>
                      Cuenta activa vinculada: <strong>@{vault.accountUsername}</strong> ({vault.accountEmail}). Puedes iniciar sesión con estas credenciales en cualquier otro dispositivo.
                    </p>
                  )}
                  <div className={styles.grid2}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Usuario</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="ej. larico"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Correo electrónico (mismo de Resend)</label>
                      <input
                        type="email"
                        className={styles.input}
                        placeholder="tucorreo@gmail.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      {vault.accountEmail ? 'Nueva contraseña (para actualizar o re-cifrar cuenta)' : 'Contraseña de cuenta (mín. 6 caracteres)'}
                    </label>
                    <input
                      type="password"
                      className={styles.input}
                      placeholder="Mínimo 6 caracteres"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                    />
                  </div>
                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      disabled={busy || !regUsername.trim() || !regEmail.trim() || regPassword.length < 6}
                      onClick={async () => {
                        const ok = await registerAccount({
                          username: regUsername,
                          email: regEmail,
                          password: regPassword,
                          targetVault: draft,
                        })
                        if (ok) setRegPassword('')
                      }}
                    >
                      <User size={15} />
                      <span>{vault.accountEmail ? 'Actualizar Cuenta en Base de Datos' : 'Crear Cuenta y Guardar en Base de Datos'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className={styles.subCard}>
              <h3 className={styles.sectionHeading}>
                <Trash2 size={16} />
                <span>Gestión de Cuenta y Borrado de Datos</span>
              </h3>
              <p className={styles.hint}>
                Puedes eliminar tu cuenta remota de la Base de Datos o borrar por completo todos los datos locales de Laryko en este dispositivo (bóveda, sesiones, recordatorios e historial).
              </p>

              {confirmDanger ? (
                <div className={styles.importBox}>
                  <p className={styles.hint}>
                    <strong>
                      {confirmDanger === 'cloud'
                        ? '¿Seguro que deseas eliminar tu cuenta y bóveda de la Base de Datos?'
                        : confirmDanger === 'wipe-all'
                          ? '¿Seguro que deseas eliminar tu cuenta en la Base de Datos Y borrar todos los datos locales?'
                          : '¿Seguro que deseas borrar TODOS los datos locales de Laryko en este dispositivo?'}
                    </strong>{' '}
                    Esta acción no se puede deshacer.
                  </p>
                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      disabled={busy}
                      onClick={async () => {
                        if (confirmDanger === 'cloud') {
                          await deleteCloudAccount()
                        } else if (confirmDanger === 'wipe-all') {
                          await wipeAllLocalData(true)
                        } else {
                          await wipeAllLocalData(false)
                        }
                        setConfirmDanger(null)
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Confirmar Eliminación</span>
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      disabled={busy}
                      onClick={() => setConfirmDanger(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.actionsRow}>
                  {hasDatabaseConfigured && (
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      disabled={busy}
                      onClick={() => setConfirmDanger('cloud')}
                    >
                      <Trash2 size={14} />
                      <span>Eliminar Cuenta de Base de Datos</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={busy}
                    onClick={() => setConfirmDanger('wipe')}
                  >
                    <Trash2 size={14} />
                    <span>Borrar Todo (Local)</span>
                  </button>
                  {hasDatabaseConfigured && (
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      disabled={busy}
                      onClick={() => setConfirmDanger('wipe-all')}
                    >
                      <Trash2 size={14} />
                      <span>Borrar Todo (Local + Nube)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className={styles.sectionBody}>
            <h3 className={styles.sectionHeading}>
              <Bot size={16} />
              <span>Claves de Inteligencia Artificial (BYOK)</span>
            </h3>
            <p className={styles.hint}>
              Configura tus API Keys de Claude, OpenAI, Gemini u otro proveedor compatible para potenciar las herramientas inteligentes de Laryko.
            </p>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Proveedor Principal por Defecto</label>
              <select
                className={styles.input}
                value={draft.aiDefaultProvider}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    aiDefaultProvider: e.target.value as AiProviderId,
                  }))
                }
              >
                <option value="openai">OpenAI (GPT)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="gemini">Google Gemini</option>
                <option value="custom">Otro (OpenRouter / Groq / Ollama / Custom)</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>OpenAI API Key</label>
              <div className={styles.inlineRow}>
                <input
                  type={visibleSecrets.openai ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="sk-proj-..."
                  value={draft.openaiApiKey}
                  onChange={(e) => updateField('openaiApiKey', e.target.value)}
                />
                {renderEyeBtn('openai')}
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={busy || !draft.openaiApiKey.trim()}
                  onClick={() => {
                    void testAi('openai', draft.openaiApiKey)
                    void loadModelsFor('openai', draft.openaiApiKey, undefined, true)
                  }}
                >
                  Probar
                </button>
              </div>
              {draft.openaiApiKey.trim() && (
                <div className={styles.inlineRow}>
                  <select
                    className={styles.input}
                    value={draft.openaiModel}
                    onChange={(e) => updateField('openaiModel', e.target.value)}
                    disabled={loadingModelsFor === 'openai'}
                  >
                    {!draft.openaiModel && <option value="">Selecciona un modelo de OpenAI...</option>}
                    {draft.openaiModel && !(aiModelsMap.openai ?? []).includes(draft.openaiModel) && (
                      <option value={draft.openaiModel}>{draft.openaiModel}</option>
                    )}
                    {(aiModelsMap.openai ?? []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={loadingModelsFor === 'openai' || !draft.openaiApiKey.trim()}
                    onClick={() => void loadModelsFor('openai', draft.openaiApiKey)}
                    title="Consultar modelos disponibles"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Claude (Anthropic) API Key</label>
              <div className={styles.inlineRow}>
                <input
                  type={visibleSecrets.anthropic ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="sk-ant-api03-..."
                  value={draft.anthropicApiKey}
                  onChange={(e) => updateField('anthropicApiKey', e.target.value)}
                />
                {renderEyeBtn('anthropic')}
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={busy || !draft.anthropicApiKey.trim()}
                  onClick={() => {
                    void testAi('anthropic', draft.anthropicApiKey)
                    void loadModelsFor('anthropic', draft.anthropicApiKey, undefined, true)
                  }}
                >
                  Probar
                </button>
              </div>
              {draft.anthropicApiKey.trim() && (
                <div className={styles.inlineRow}>
                  <select
                    className={styles.input}
                    value={draft.anthropicModel}
                    onChange={(e) => updateField('anthropicModel', e.target.value)}
                    disabled={loadingModelsFor === 'anthropic'}
                  >
                    {!draft.anthropicModel && <option value="">Selecciona un modelo de Claude...</option>}
                    {draft.anthropicModel && !(aiModelsMap.anthropic ?? []).includes(draft.anthropicModel) && (
                      <option value={draft.anthropicModel}>{draft.anthropicModel}</option>
                    )}
                    {(aiModelsMap.anthropic ?? []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={loadingModelsFor === 'anthropic' || !draft.anthropicApiKey.trim()}
                    onClick={() => void loadModelsFor('anthropic', draft.anthropicApiKey)}
                    title="Consultar modelos disponibles"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Google Gemini API Key</label>
              <div className={styles.inlineRow}>
                <input
                  type={visibleSecrets.gemini ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="AIzaSy..."
                  value={draft.geminiApiKey}
                  onChange={(e) => updateField('geminiApiKey', e.target.value)}
                />
                {renderEyeBtn('gemini')}
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={busy || !draft.geminiApiKey.trim()}
                  onClick={() => {
                    void testAi('gemini', draft.geminiApiKey)
                    void loadModelsFor('gemini', draft.geminiApiKey, undefined, true)
                  }}
                >
                  Probar
                </button>
              </div>
              {draft.geminiApiKey.trim() && (
                <div className={styles.inlineRow}>
                  <select
                    className={styles.input}
                    value={draft.geminiModel}
                    onChange={(e) => updateField('geminiModel', e.target.value)}
                    disabled={loadingModelsFor === 'gemini'}
                  >
                    {!draft.geminiModel && <option value="">Selecciona un modelo de Gemini...</option>}
                    {draft.geminiModel && !(aiModelsMap.gemini ?? []).includes(draft.geminiModel) && (
                      <option value={draft.geminiModel}>{draft.geminiModel}</option>
                    )}
                    {(aiModelsMap.gemini ?? []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={loadingModelsFor === 'gemini' || !draft.geminiApiKey.trim()}
                    onClick={() => void loadModelsFor('gemini', draft.geminiApiKey)}
                    title="Consultar modelos disponibles"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className={styles.subCard}>
              <h3 className={styles.sectionHeading}>Otro Proveedor (Compatible con OpenAI)</h3>
              <div className={styles.grid2}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Base URL</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="https://openrouter.ai/api/v1"
                    value={draft.customAiBaseUrl}
                    onChange={(e) => updateField('customAiBaseUrl', e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Modelo por defecto</label>
                  {(aiModelsMap.custom ?? []).length > 0 ? (
                    <div className={styles.inlineRow}>
                      <select
                        className={styles.input}
                        value={draft.customAiModel}
                        onChange={(e) => updateField('customAiModel', e.target.value)}
                      >
                        {!draft.customAiModel && <option value="">Selecciona un modelo...</option>}
                        {draft.customAiModel && !(aiModelsMap.custom ?? []).includes(draft.customAiModel) && (
                          <option value={draft.customAiModel}>{draft.customAiModel}</option>
                        )}
                        {(aiModelsMap.custom ?? []).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={loadingModelsFor === 'custom' || !draft.customAiBaseUrl.trim()}
                        onClick={() => void loadModelsFor('custom', draft.customAiApiKey, draft.customAiBaseUrl)}
                        title="Consultar modelos disponibles"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="llama-3.3-70b / deepseek-chat"
                      value={draft.customAiModel}
                      onChange={(e) => updateField('customAiModel', e.target.value)}
                    />
                  )}
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>API Key (opcional para Ollama local)</label>
                <div className={styles.inlineRow}>
                  <input
                    type={visibleSecrets.custom ? 'text' : 'password'}
                    className={styles.input}
                    placeholder="Token del proveedor personalizado"
                    value={draft.customAiApiKey}
                    onChange={(e) => updateField('customAiApiKey', e.target.value)}
                  />
                  {renderEyeBtn('custom')}
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={busy || !draft.customAiBaseUrl.trim()}
                    onClick={() => {
                      void testAi('custom', draft.customAiApiKey, draft.customAiBaseUrl)
                      void loadModelsFor('custom', draft.customAiApiKey, draft.customAiBaseUrl, true)
                    }}
                  >
                    Probar
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy}
                onClick={() => saveVault(draft)}
              >
                Guardar Claves de IA
              </button>
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className={styles.sectionBody}>
            <h3 className={styles.sectionHeading}>
              <Database size={16} />
              <span>Base de Datos (Neon, Supabase, PostgreSQL u otro proveedor)</span>
            </h3>
            <p className={styles.hint}>
              Sin una base de datos cloud configurada, Laryko funciona solo en modo local (IndexedDB). Al conectar tu proveedor de base de datos (<strong>Neon Postgres</strong>, <strong>Supabase</strong>, <strong>PostgreSQL</strong> u otro compatible), todas tus settings, preferencias, claves, cuenta y sesiones se guardarán y sincronizarán automáticamente en macOS, Windows, Linux, iOS, Android y Web.
            </p>
            <p className={styles.hint}>
              <strong>Recomendación:</strong> Utiliza el <strong>mismo correo electrónico</strong> en tu proveedor de Base de Datos, Resend y tu cuenta de Laryko para evitar inconvenientes al sincronizar o enviar alertas.
            </p>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Connection String (postgresql://...)</label>
              <div className={styles.inlineRow}>
                <input
                  type={visibleSecrets.neon ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="postgresql://user:pass@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
                  value={draft.neonDatabaseUrl}
                  onChange={(e) => updateField('neonDatabaseUrl', e.target.value)}
                />
                {renderEyeBtn('neon')}
              </div>
            </div>

            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy}
                onClick={() => saveVault(draft)}
              >
                Guardar en Bóveda
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={busy || !draft.neonDatabaseUrl.trim()}
                onClick={() => testNeon(draft.neonDatabaseUrl)}
              >
                Probar Conexión
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={busy || !draft.neonDatabaseUrl.trim()}
                onClick={() => syncUpToNeon(draft)}
              >
                <Upload size={15} />
                <span>Sincronizar Bóveda</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className={styles.sectionBody}>
            <h3 className={styles.sectionHeading}>
              <Mail size={16} />
              <span>Email API (Correo de Recordatorios & Alertas)</span>
            </h3>
            <p className={styles.hint}>
              Conecta cualquier servicio de correo REST / Webhook (POST JSON con <code>from</code>, <code>to</code>, <code>subject</code>, <code>html</code>).{' '}
              <strong>Recomendación:</strong> Puedes usar proveedores compatibles como Resend, Brevo, Mailtrap, MailerSend, Postmark, SendGrid o tu propio endpoint/worker.
            </p>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Proveedor de Email API (nombre a tu elección)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ej. Resend, Brevo, Mi Webhook..."
                value={draft.emailProvider ?? ''}
                onChange={(e) => updateField('emailProvider', e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>URL del Endpoint Email API (POST JSON)</label>
              <input
                type="url"
                className={styles.input}
                placeholder="https://api.tu-proveedor.com/emails"
                value={draft.emailCustomEndpoint ?? ''}
                onChange={(e) => updateField('emailCustomEndpoint', e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>API Key / Bearer Token (opcional)</label>
              <div className={styles.inlineRow}>
                <input
                  type={visibleSecrets.resend ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="Token o API Key del proveedor"
                  value={draft.resendApiKey}
                  onChange={(e) => updateField('resendApiKey', e.target.value)}
                />
                {renderEyeBtn('resend')}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Remitente (From)</label>
              <input
                type="email"
                className={styles.input}
                placeholder="Laryko <alertas@tudominio.com>"
                value={draft.resendFromEmail}
                onChange={(e) => updateField('resendFromEmail', e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Tu Correo Personal (Destino de alertas y pruebas)</label>
              <input
                type="email"
                className={styles.input}
                placeholder="tu@gmail.com"
                value={draft.resendToEmail || testToEmail}
                onChange={(e) => {
                  updateField('resendToEmail', e.target.value)
                  setTestToEmail(e.target.value)
                }}
              />
            </div>

            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy}
                onClick={() => saveVault(draft)}
              >
                Guardar en Bóveda
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={
                  busy ||
                  !(draft.emailCustomEndpoint ?? '').trim() ||
                  !(draft.resendToEmail || testToEmail).trim()
                }
                onClick={() =>
                  testResend(
                    draft.resendApiKey,
                    draft.resendFromEmail || draft.resendToEmail || testToEmail,
                    draft.resendToEmail || testToEmail,
                    draft.emailProvider ?? '',
                    draft.emailCustomEndpoint ?? ''
                  )
                }
              >
                Enviar Correo de Prueba
              </button>
            </div>
          </div>
        )}

        {activeTab === 'storage' && (() => {
          const storageAccounts = draft.storageAccounts ?? []
          const filteredMedia = mediaItems.filter((item) => {
            if (mediaFilter !== 'all' && item.category !== mediaFilter) return false
            if (storageFilter !== 'all' && item.storageId !== storageFilter) return false
            return true
          })

          const handleUploadMedia = async (files: FileList | null) => {
            if (!files || files.length === 0) return
            setUploadingMedia(true)
            try {
              const targetAcc = storageAccounts.find((a) => a.id === uploadTargetStorage)
              let uploadedCount = 0
              for (const file of Array.from(files)) {
                const buffer = await file.arrayBuffer()
                const category = categorizeMimeType(file.type, file.name)
                let remoteKey: string | undefined
                if (targetAcc) {
                  try {
                    remoteKey = await uploadFileToStorageAccount(targetAcc, file.name, file.type, buffer)
                  } catch (err) {
                    toast.warning(
                      `${file.name}: guardado en LocalDB (nube: ${err instanceof Error ? err.message : 'error'})`
                    )
                  }
                }
                await db.mediaItems.add({
                  uuid: generateSessionUuid(),
                  name: file.name,
                  mimeType: file.type || 'application/octet-stream',
                  size: file.size,
                  category,
                  storageId: targetAcc ? targetAcc.id : 'local',
                  storageLabel: targetAcc ? targetAcc.label : 'Local',
                  remoteKey,
                  data: buffer,
                  createdAt: new Date(),
                })
                uploadedCount++
              }
              toast.success(`${uploadedCount} archivo(s) agregado(s) a Medios.`)
              void refreshAllQuotas(storageAccounts)
            } finally {
              setUploadingMedia(false)
            }
          }

          const handleSyncCloudMedia = async (account: StorageAccount) => {
            setUploadingMedia(true)
            try {
              const remoteFiles = await listCloudFilesForAccount(account)
              const remoteSet = new Set(remoteFiles.map((f) => f.remoteKey))
              let added = 0
              let removed = 0
              for (const rf of remoteFiles) {
                const exists = mediaItems.some(
                  (m) => m.storageId === account.id && m.remoteKey === rf.remoteKey
                )
                if (!exists) {
                  await db.mediaItems.add({
                    uuid: generateSessionUuid(),
                    name: rf.name,
                    mimeType: rf.mimeType,
                    size: rf.size,
                    category: categorizeMimeType(rf.mimeType, rf.name),
                    storageId: account.id,
                    storageLabel: account.label,
                    remoteKey: rf.remoteKey,
                    createdAt: new Date(),
                  })
                  added++
                }
              }
              for (const localItem of mediaItems) {
                if (
                  localItem.storageId === account.id &&
                  localItem.remoteKey &&
                  !remoteSet.has(localItem.remoteKey) &&
                  localItem.id !== undefined
                ) {
                  await db.mediaItems.delete(localItem.id)
                  removed++
                }
              }
              await refreshAllQuotas(storageAccounts)
              toast.success(
                `Sincronizado ${account.label}: +${added} nuevo(s), -${removed} eliminado(s).`
              )
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'No se pudo listar archivos de la nube.')
            } finally {
              setUploadingMedia(false)
            }
          }

          const handleAddStorageAccount = async (e: React.FormEvent) => {
            e.preventDefault()
            const cleanLabel = newStorageLabel.trim()
            if (!cleanLabel) return
            const newAcc: StorageAccount = {
              id: generateSessionUuid(),
              provider: newStorageProvider,
              label: cleanLabel,
              accountId: newStorageAccountId.trim() || undefined,
              bucket: newStorageBucket.trim() || undefined,
              endpoint: newStorageEndpoint.trim() || undefined,
              accessKeyId: newStorageAccessKey.trim() || undefined,
              secretKey: newStorageSecretKey.trim() || undefined,
            }
            const nextVault: UserIntegrationsVault = {
              ...draft,
              storageAccounts: [...storageAccounts, newAcc],
              ...(newStorageProvider === 'r2' && !draft.r2AccountId
                ? {
                    r2AccountId: newStorageAccountId.trim(),
                    r2BucketName: newStorageBucket.trim(),
                    r2AccessKeyId: newStorageAccessKey.trim(),
                    r2SecretAccessKey: newStorageSecretKey.trim(),
                  }
                : {}),
            }
            setDraft(nextVault)
            await saveVault(nextVault)
            setUploadTargetStorage(newAcc.id)
            setNewStorageLabel('')
            setNewStorageAccountId('')
            setNewStorageBucket('')
            setNewStorageEndpoint('')
            setNewStorageAccessKey('')
            setNewStorageSecretKey('')
            setShowAddStorage(false)
          }

          return (
            <div className={styles.sectionBody}>
              {/* ── Sección 1: Medios (Archivos, Fotos, Documentos) ── */}
              <div className={styles.subCard}>
                <div className={styles.wizardHeader}>
                  <h3 className={styles.sectionHeading} style={{ margin: 0 }}>
                    <ImageIcon size={16} />
                    <span>Medios ({filteredMedia.length})</span>
                  </h3>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <select
                      className={styles.select}
                      style={{ height: 34, fontSize: 12 }}
                      value={uploadTargetStorage}
                      onChange={(e) => setUploadTargetStorage(e.target.value)}
                      aria-label="Destino de subida"
                    >
                      {storageAccounts.length === 0 ? (
                        <option value="local">Guardar en: Local (Sin nube configurada)</option>
                      ) : (
                        <>
                          {storageAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              Guardar en Nube: {acc.label} ({acc.provider.toUpperCase()})
                            </option>
                          ))}
                          <option value="local">Guardar solo en Local (Offline)</option>
                        </>
                      )}
                    </select>
                    <label
                      className={styles.primaryBtn}
                      style={{ cursor: uploadingMedia ? 'wait' : 'pointer', height: 34, padding: '0 12px', fontSize: 12 }}
                    >
                      <Upload size={14} />
                      <span>{uploadingMedia ? 'Subiendo...' : 'Subir Archivo / Foto'}</span>
                      <input
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        disabled={uploadingMedia}
                        onChange={(e) => {
                          void handleUploadMedia(e.target.files)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className={styles.tabsRow}>
                  {(
                    [
                      ['all', 'Todos'],
                      ['photo', 'Fotos'],
                      ['document', 'Documentos'],
                      ['audio', 'Audio'],
                      ['other', 'Otros'],
                    ] as const
                  ).map(([cat, label]) => (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.tabBtn} ${mediaFilter === cat ? styles.tabBtnActive : ''}`}
                      onClick={() => setMediaFilter(cat)}
                    >
                      {label}
                    </button>
                  ))}

                  <select
                    className={styles.select}
                    style={{ height: 32, fontSize: 12, marginLeft: 'auto' }}
                    value={storageFilter}
                    onChange={(e) => setStorageFilter(e.target.value)}
                    aria-label="Filtrar por almacenamiento"
                  >
                    <option value="all">Todos los almacenamientos</option>
                    <option value="local">Solo Local</option>
                    {storageAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.label}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredMedia.length === 0 ? (
                  <p className={styles.hint} style={{ margin: 0 }}>
                    Aún no hay archivos en esta vista. Sube fotos, PDFs o documentos locales o sincroniza desde una cuenta conectada.
                  </p>
                ) : (
                  <div className={styles.mediaGrid}>
                    {filteredMedia.map((item) => (
                      <div key={item.uuid} className={styles.mediaCard}>
                        <div className={styles.mediaThumb}>
                          <MediaThumbPreview item={item} />
                        </div>
                        <div className={styles.mediaBody}>
                          <div className={styles.mediaName} title={item.name}>
                            {item.name}
                          </div>
                          <div className={styles.mediaMeta}>
                            <span>{formatFileSize(item.size)}</span>
                            <span className={styles.mediaBadge}>{item.storageLabel}</span>
                          </div>
                          <div className={styles.mediaActions}>
                            {item.data && (
                              <button
                                type="button"
                                className={styles.secondaryBtn}
                                style={{ height: 28, padding: '0 8px' }}
                                title="Descargar"
                                onClick={() => {
                                  if (!item.data) return
                                  const url = URL.createObjectURL(
                                    new Blob([item.data], { type: item.mimeType })
                                  )
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = item.name
                                  document.body.appendChild(a)
                                  a.click()
                                  a.remove()
                                  URL.revokeObjectURL(url)
                                }}
                              >
                                <Download size={13} />
                              </button>
                            )}
                            {confirmDeleteMediaUuid === item.uuid ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className={styles.secondaryBtn}
                                  style={{ height: 26, padding: '0 7px', fontSize: 11 }}
                                  onClick={async () => {
                                    if (item.id !== undefined) {
                                      await db.mediaItems.delete(item.id)
                                      toast.info(`${item.name} quitado de la app.`)
                                    }
                                    setConfirmDeleteMediaUuid(null)
                                  }}
                                >
                                  Solo app
                                </button>
                                <button
                                  type="button"
                                  style={{
                                    height: 26,
                                    padding: '0 7px',
                                    fontSize: 11,
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                  onClick={async () => {
                                    const acc = storageAccounts.find((a) => a.id === item.storageId)
                                    if (acc && item.remoteKey) {
                                      try {
                                        await deleteFileFromStorageAccount(acc, item.remoteKey)
                                      } catch (err) {
                                        toast.error(
                                          `Error borrando en ${acc.label}: ${
                                            err instanceof Error ? err.message : 'error'
                                          }`
                                        )
                                        setConfirmDeleteMediaUuid(null)
                                        return
                                      }
                                    }
                                    if (item.id !== undefined) {
                                      await db.mediaItems.delete(item.id)
                                    }
                                    setConfirmDeleteMediaUuid(null)
                                    toast.success(`${item.name} eliminado de la app y de la nube.`)
                                    void refreshAllQuotas(storageAccounts)
                                  }}
                                >
                                  App + Nube
                                </button>
                                <button
                                  type="button"
                                  className={styles.secondaryBtn}
                                  style={{ height: 26, padding: '0 6px', fontSize: 11 }}
                                  onClick={() => setConfirmDeleteMediaUuid(null)}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className={styles.secondaryBtn}
                                style={{ height: 28, padding: '0 8px', color: '#ef4444' }}
                                title="Eliminar"
                                onClick={async () => {
                                  const hasCloud = Boolean(
                                    item.remoteKey &&
                                      storageAccounts.some((a) => a.id === item.storageId)
                                  )
                                  if (hasCloud) {
                                    setConfirmDeleteMediaUuid(item.uuid)
                                  } else if (item.id !== undefined) {
                                    await db.mediaItems.delete(item.id)
                                    toast.info(`${item.name} eliminado de Medios.`)
                                  }
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Sección 2: Cuentas de Almacenamiento Conectadas ── */}
              <div className={styles.subCard}>
                <div className={styles.wizardHeader}>
                  <h3 className={styles.sectionHeading} style={{ margin: 0 }}>
                    <HardDrive size={16} />
                    <span>Cuentas de Almacenamiento ({storageAccounts.length})</span>
                  </h3>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setShowAddStorage((v) => !v)}
                  >
                    <Plus size={14} />
                    <span>{showAddStorage ? 'Cerrar' : 'Agregar Cuenta'}</span>
                  </button>
                </div>

                {showAddStorage && (
                  <form className={styles.unlockForm} onSubmit={handleAddStorageAccount}>
                    <div className={styles.grid2}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>Proveedor</label>
                        <select
                          className={styles.select}
                          value={newStorageProvider}
                          onChange={(e) => setNewStorageProvider(e.target.value as StorageProviderId)}
                        >
                          <option value="r2">Cloudflare R2 (S3)</option>
                          <option value="gdrive">Google Drive</option>
                          <option value="dropbox">Dropbox</option>
                          <option value="s3">S3 Compatible</option>
                          <option value="custom">Otro / Endpoint REST Custom</option>
                        </select>
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>Nombre de la Cuenta</label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Ej. Dropbox Personal, R2 Trabajo..."
                          value={newStorageLabel}
                          onChange={(e) => setNewStorageLabel(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {(newStorageProvider === 'r2' || newStorageProvider === 's3') && (
                      <div className={styles.grid2}>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder={newStorageProvider === 'r2' ? 'Account ID' : 'Endpoint S3'}
                          value={newStorageProvider === 'r2' ? newStorageAccountId : newStorageEndpoint}
                          onChange={(e) =>
                            newStorageProvider === 'r2'
                              ? setNewStorageAccountId(e.target.value)
                              : setNewStorageEndpoint(e.target.value)
                          }
                        />
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Bucket Name"
                          value={newStorageBucket}
                          onChange={(e) => setNewStorageBucket(e.target.value)}
                        />
                      </div>
                    )}

                    {newStorageProvider === 'custom' && (
                      <input
                        type="url"
                        className={styles.input}
                        placeholder="URL Endpoint de subida (https://...)"
                        value={newStorageEndpoint}
                        onChange={(e) => setNewStorageEndpoint(e.target.value)}
                      />
                    )}

                    <div className={styles.grid2}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder={
                          newStorageProvider === 'gdrive'
                            ? 'Client ID (opcional)'
                            : newStorageProvider === 'dropbox'
                              ? 'App Key de Dropbox (ej. u2sj3l...)'
                              : 'Access Key ID (opcional)'
                        }
                        value={newStorageAccessKey}
                        onChange={(e) => setNewStorageAccessKey(e.target.value)}
                      />
                      <input
                        type="password"
                        className={styles.input}
                        placeholder={
                          newStorageProvider === 'gdrive' || newStorageProvider === 'dropbox'
                            ? 'OAuth Access Token (para subir/listar)'
                            : 'Secret Access Key / Bearer Token'
                        }
                        value={newStorageSecretKey}
                        onChange={(e) => setNewStorageSecretKey(e.target.value)}
                      />
                    </div>

                    {newStorageProvider === 'dropbox' && (
                      <div
                        className={styles.subCard}
                        style={{ padding: 12, gap: 8, background: 'var(--color-bg-secondary)' }}
                      >
                        <p className={styles.hint} style={{ margin: 0 }}>
                          <strong>Cómo conectar Dropbox:</strong> En tu Dropbox App Console → pestaña{' '}
                          <em>Permissions</em> activa <code>account_info.read</code>,{' '}
                          <code>files.metadata.read</code>,{' '}
                          <code>files.content.read</code> y <code>files.content.write</code>. Luego pega tu{' '}
                          <strong>App Key</strong> arriba y pulsa <strong>Autorizar en Dropbox</strong> (o pega directo tu <em>Generated access token</em>).
                        </p>
                        <div className={styles.actionsRow}>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={async () => {
                              const url = 'https://www.dropbox.com/developers/apps'
                              if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
                                const { invoke } = await import('@tauri-apps/api/core')
                                await invoke('open_external_url', { url }).catch(() => {})
                              } else {
                                window.open(url, '_blank', 'noopener,noreferrer')
                              }
                            }}
                          >
                            Abrir Dropbox Console ↗
                          </button>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            disabled={!newStorageAccessKey.trim()}
                            onClick={async () => {
                              const { verifier, authUrl } = await createDropboxPkceChallenge(
                                newStorageAccessKey
                              )
                              setDropboxVerifier(verifier)
                              if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
                                const { invoke } = await import('@tauri-apps/api/core')
                                await invoke('open_external_url', { url: authUrl }).catch(() => {})
                              } else {
                                window.open(authUrl, '_blank', 'noopener,noreferrer')
                              }
                              toast.info('Autoriza en el navegador, copia el código y pégalo abajo.')
                            }}
                          >
                            Autorizar en Dropbox (OAuth) ↗
                          </button>
                        </div>
                        {dropboxVerifier && (
                          <div className={styles.inlineRow}>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="Pega aquí el código de autorización de Dropbox"
                              value={dropboxAuthCode}
                              onChange={(e) => setDropboxAuthCode(e.target.value)}
                            />
                            <button
                              type="button"
                              className={styles.primaryBtn}
                              disabled={!dropboxAuthCode.trim()}
                              onClick={async () => {
                                try {
                                  const tokens = await exchangeDropboxPkceCode(
                                    newStorageAccessKey,
                                    dropboxAuthCode,
                                    dropboxVerifier
                                  )
                                  setNewStorageSecretKey(tokens.accessToken)
                                  setDropboxVerifier('')
                                  setDropboxAuthCode('')
                                  toast.success('Token de Dropbox obtenido. Ahora guarda la cuenta.')
                                } catch (err) {
                                  toast.error(
                                    err instanceof Error ? err.message : 'Error intercambiando código.'
                                  )
                                }
                              }}
                            >
                              Obtener Token
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {newStorageProvider === 'gdrive' && (
                      <div className={styles.actionsRow}>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={async () => {
                            const url = 'https://console.cloud.google.com/apis/credentials'
                            if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
                              const { invoke } = await import('@tauri-apps/api/core')
                              await invoke('open_external_url', { url }).catch(() => {})
                            } else {
                              window.open(url, '_blank', 'noopener,noreferrer')
                            }
                          }}
                        >
                          Abrir Google Cloud Console ↗
                        </button>
                      </div>
                    )}

                    <button type="submit" className={styles.primaryBtn} disabled={busy}>
                      Guardar Cuenta en Bóveda
                    </button>
                  </form>
                )}

                {storageAccounts.length === 0 && localQuota && localQuota.totalBytes !== null && (
                  <div className={styles.storageAccountRow}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 'var(--font-size-xs)' }}>
                        Almacenamiento Local (Sin nube configurada)
                      </strong>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {formatFileSize(localQuota.availableBytes ?? 0)} disponibles ·{' '}
                        {formatFileSize(localQuota.usedBytes)} usados de{' '}
                        {formatFileSize(localQuota.totalBytes)}
                      </div>
                    </div>
                  </div>
                )}

                {storageAccounts.length === 0 ? (
                  <p className={styles.hint} style={{ margin: 0 }}>
                    Agrega cuentas de <strong>Cloudflare R2</strong>, <strong>Google Drive</strong>, <strong>Dropbox</strong>, <strong>S3</strong> o un endpoint personalizado para respaldar tus medios en la nube.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {storageAccounts.map((acc) => {
                      const quota = accountQuotas[acc.id]
                      const usedPct =
                        quota?.totalBytes && quota.totalBytes > 0
                          ? Math.min(100, Math.round((quota.usedBytes / quota.totalBytes) * 100))
                          : null
                      return (
                        <div key={acc.id} className={styles.storageAccountRow}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ fontSize: 'var(--font-size-sm)' }}>{acc.label}</strong>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                              {acc.provider.toUpperCase()}
                              {acc.bucket ? ` · Bucket: ${acc.bucket}` : ''}
                              {acc.endpoint ? ` · ${acc.endpoint}` : ''}
                            </div>
                            {quota && (
                              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                                  {quota.availableBytes !== null && quota.totalBytes !== null
                                    ? `${formatFileSize(quota.availableBytes)} disponibles (${formatFileSize(quota.usedBytes)} / ${formatFileSize(quota.totalBytes)})`
                                    : quota.note ?? 'Capacidad no disponible'}
                                </span>
                                {usedPct !== null && (
                                  <div className={styles.progressTrack} style={{ height: 5, maxWidth: 240 }}>
                                    <div
                                      className={styles.progressFill}
                                      style={{ width: `${usedPct}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {(acc.provider === 'dropbox' || acc.provider === 'gdrive') && acc.secretKey && (
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              disabled={uploadingMedia}
                              onClick={() => void handleSyncCloudMedia(acc)}
                            >
                              <RefreshCw size={13} />
                              <span>Listar</span>
                            </button>
                          )}
                          {acc.provider === 'r2' && acc.accountId && acc.bucket && (
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              disabled={busy}
                              onClick={() => testR2(acc.accountId ?? '', acc.bucket ?? '')}
                            >
                              Probar
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            style={{ color: '#ef4444' }}
                            onClick={async () => {
                              const nextVault = {
                                ...draft,
                                storageAccounts: storageAccounts.filter((a) => a.id !== acc.id),
                              }
                              setDraft(nextVault)
                              await saveVault(nextVault)
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── Configuración Rápida Cloudflare R2 / PKCE Clásica ── */}
              <div className={styles.subCard}>
                <h3 className={styles.sectionHeading}>
                  <HardDrive size={16} />
                  <span>Cloudflare R2 Principal (Compatibilidad)</span>
                </h3>
                <div className={styles.grid2}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Account ID</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="32-char Cloudflare Account ID"
                      value={draft.r2AccountId}
                      onChange={(e) => updateField('r2AccountId', e.target.value)}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Bucket Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="laryko-vault"
                      value={draft.r2BucketName}
                      onChange={(e) => updateField('r2BucketName', e.target.value)}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Access Key ID</label>
                    <div className={styles.inlineRow}>
                      <input
                        type={visibleSecrets.r2Access ? 'text' : 'password'}
                        className={styles.input}
                        placeholder="R2 Access Key ID"
                        value={draft.r2AccessKeyId}
                        onChange={(e) => updateField('r2AccessKeyId', e.target.value)}
                      />
                      {renderEyeBtn('r2Access')}
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Secret Access Key</label>
                    <div className={styles.inlineRow}>
                      <input
                        type={visibleSecrets.r2Secret ? 'text' : 'password'}
                        className={styles.input}
                        placeholder="R2 Secret Access Key"
                        value={draft.r2SecretAccessKey}
                        onChange={(e) => updateField('r2SecretAccessKey', e.target.value)}
                      />
                      {renderEyeBtn('r2Secret')}
                    </div>
                  </div>
                </div>

                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={busy}
                    onClick={() => saveVault(draft)}
                  >
                    Guardar Almacenamiento
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={busy || !draft.r2AccountId.trim() || !draft.r2BucketName.trim()}
                    onClick={() => testR2(draft.r2AccountId, draft.r2BucketName)}
                  >
                    Probar Endpoint R2
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {activeTab === 'prefs' && (
          <div className={styles.sectionBody}>
            <h3 className={styles.sectionHeading}>
              <Sliders size={16} />
              <span>Preferencias Generales</span>
            </h3>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Auto-hibernación de sesiones WebView (minutos de inactividad)
              </label>
              <select
                className={styles.input}
                value={prefs.idleSleepMinutes}
                onChange={(e) => savePrefs({ idleSleepMinutes: Number(e.target.value) })}
              >
                <option value={5}>5 minutos (Máximo ahorro de RAM)</option>
                <option value={10}>10 minutos (Recomendado)</option>
                <option value={30}>30 minutos</option>
                <option value={0}>Solo dormir manualmente</option>
              </select>
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={prefs.autoSync}
                onChange={(e) => savePrefs({ autoSync: e.target.checked })}
              />
              <span>Sincronizar bóveda cifrada automáticamente con Neon Postgres al guardar</span>
            </label>

            <div className={styles.subCard}>
              <h3 className={styles.sectionHeading}>Sonido, Alarma Custom y Volumen</h3>
              <div className={styles.grid2}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Tono de alerta / alarma</label>
                  <select
                    className={styles.input}
                    value={prefs.soundPreset ?? 'chime'}
                    onChange={(e) => {
                      const next = e.target.value as NotificationSoundPreset
                      savePrefs({ soundPreset: next })
                      playNotificationSound(next, prefs.soundVolume ?? 80)
                    }}
                  >
                    <option value="chime">Cristal (Chime)</option>
                    <option value="bell">Campana</option>
                    <option value="alarm">Alarma doble</option>
                    <option value="siren">Sirena fuerte</option>
                    <option value="soft">Suave</option>
                    <option value="custom">Audio Custom (subido)</option>
                    <option value="mute">Silenciado</option>
                  </select>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Volumen Notificaciones ({prefs.soundVolume ?? 80}%)</label>
                  <div className={styles.inlineRow}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={prefs.soundVolume ?? 80}
                      onChange={(e) => savePrefs({ soundVolume: Number(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() =>
                        playNotificationSound(
                          prefs.soundPreset ?? 'chime',
                          prefs.soundVolume ?? 80
                        )
                      }
                    >
                      Probar
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Volumen de Alarma ({prefs.alarmVolume ?? 100}%)</label>
                  <div className={styles.inlineRow}>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={prefs.alarmVolume ?? 100}
                      onChange={(e) => savePrefs({ alarmVolume: Number(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() =>
                        playNotificationSound(
                          prefs.soundPreset === 'custom' ? 'custom' : 'siren',
                          prefs.alarmVolume ?? 100,
                          true
                        )
                      }
                    >
                      Probar Alarma
                    </button>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    Audio Custom (.mp3, .wav, .ogg, .m4a · máx 5MB)
                  </label>
                  <div className={styles.inlineRow}>
                    <input
                      type="file"
                      accept="audio/*"
                      className={styles.input}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 5 * 1024 * 1024) return
                        const buf = await file.arrayBuffer()
                        await db.customAudio.put({
                          id: 1,
                          name: file.name,
                          mimeType: file.type || 'audio/mpeg',
                          data: buf,
                          updatedAt: new Date(),
                        })
                        await savePrefs({ soundPreset: 'custom' })
                        await playNotificationSound('custom', prefs.alarmVolume ?? 100, true)
                      }}
                    />
                    {customAudio && (
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={async () => {
                          await db.customAudio.delete(1)
                          await savePrefs({ soundPreset: 'siren' })
                        }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  {customAudio && (
                    <span className={styles.hint}>Audio cargado: {customAudio.name}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
