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
} from 'lucide-react'
import { useUserPanel } from '@/hooks/useUserPanel'
import { EMPTY_VAULT, type AiProviderId, type UserIntegrationsVault } from '@/utils/vaultCrypto'
import { playNotificationSound } from '@/utils/soundEngine'
import { db, type NotificationSoundPreset } from '@/db/laryko.db'
import { useLiveQuery } from 'dexie-react-hooks'
import { triggerNativeHaptic } from '@/utils/nativeIOSBridge'
import { toast } from '@/utils/toast'
import type { Platform } from '@/types'
import styles from './UserPanel.module.css'

export type UserPanelTab = 'sync' | 'ai' | 'database' | 'email' | 'storage' | 'prefs'

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
    syncUpToNeon,
    generatePairingCode,
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
  const customAudio = useLiveQuery(() => db.customAudio.get(1), [])

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
            const current = prev[field]
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
            {hasVaultSetup ? 'Desbloquear Bóveda de Usuario' : 'Crear Bóveda Cifrada (E2EE)'}
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
                const ok = await unlockOrInitVault(masterInput)
                if (ok) {
                  triggerNativeHaptic('success')
                  setMasterInput('')
                }
              }}
            >
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
                <span>{hasVaultSetup ? 'Desbloquear Bóveda' : 'Crear Bóveda y Configurar'}</span>
              </button>
            </form>
          )}

          {unlockMode === 'code' && (
            <div className={styles.importBox}>
              <h3 className={styles.sectionHeading}>
                <QrCode size={16} />
                <span>Sincronizar con Código QR / Token</span>
              </h3>
              <p className={styles.hint}>
                Pega el código <code>LARYKO-SYNC:1:...</code> generado desde tu otro dispositivo e ingresa la clave maestra.
              </p>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Pega aquí el código LARYKO-SYNC:1:..."
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
      {/* ── Header del Panel de Usuario ── */}
      <div className={styles.panelHeader}>
        <div className={styles.profileRow}>
          <div className={styles.avatar}>
            <User size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className={styles.title}>{prefs.displayName}</h2>
            <p className={styles.subtitle}>
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
            title="Bloquear bóveda"
          >
            <Lock size={15} />
            <span>Bloquear</span>
          </button>
        </div>
      </div>

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
          <span>Resend Email</span>
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
                <span>Sincronizar en todos tus dispositivos (Desktop, iOS, Android y Web)</span>
              </h3>
              {!hasDatabaseConfigured ? (
                <>
                  <p className={styles.hint}>
                    <strong>Paso 1 obligatorio:</strong> Configura primero tu <strong>Base de Datos</strong> (Neon Postgres, Supabase, PostgreSQL u otro proveedor compatible) en la pestaña <em>Base de Datos</em>. Todas tus preferencias, claves y sesiones se guardarán cifradas allí.
                  </p>
                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={() => setActiveTab('database')}
                    >
                      <Database size={15} />
                      <span>Configurar Base de Datos</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.hint}>
                    Todas tus preferencias, claves de IA, integraciones y sesiones se sincronizan cifradas (AES-GCM-256) con tu Base de Datos y pueden vincularse en otro dispositivo mediante Código / QR.
                  </p>

                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      disabled={busy}
                      onClick={() => syncUpToNeon(draft)}
                    >
                      <Upload size={15} />
                      <span>Sincronizar Todo a Base de Datos</span>
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
                </>
              )}

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
              <span>Resend (Correo de Recordatorios & Alertas)</span>
            </h3>
            <p className={styles.hint}>
              Si no tienes dominio propio, deja <code>Laryko &lt;onboarding@resend.dev&gt;</code> como remitente y coloca tu correo personal (Gmail/Outlook registrado en Resend) como destinatario. <strong>Recomendación:</strong> Usa ese mismo correo en toda tu cuenta de Laryko para no tener problemas de verificación o envío.
            </p>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Resend API Key</label>
              <div className={styles.inlineRow}>
                <input
                  type={visibleSecrets.resend ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
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
                placeholder="Laryko <onboarding@resend.dev>"
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
                  !draft.resendApiKey.trim() ||
                  !(draft.resendToEmail || testToEmail).trim()
                }
                onClick={() =>
                  testResend(
                    draft.resendApiKey,
                    draft.resendFromEmail || 'Laryko <onboarding@resend.dev>',
                    draft.resendToEmail || testToEmail
                  )
                }
              >
                Enviar Correo de Prueba
              </button>
            </div>
          </div>
        )}

        {activeTab === 'storage' && (
          <div className={styles.sectionBody}>
            <h3 className={styles.sectionHeading}>
              <HardDrive size={16} />
              <span>Cloudflare R2 (S3 Compatible)</span>
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
                className={styles.secondaryBtn}
                disabled={busy || !draft.r2AccountId.trim() || !draft.r2BucketName.trim()}
                onClick={() => testR2(draft.r2AccountId, draft.r2BucketName)}
              >
                Probar Endpoint R2
              </button>
            </div>

            <div className={styles.subCard}>
              <h3 className={styles.sectionHeading}>Google Drive & Dropbox (OAuth 2.0 PKCE)</h3>
              <div className={styles.grid2}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Google Drive Client ID</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="xxxx.apps.googleusercontent.com"
                    value={draft.googleDriveClientId}
                    onChange={(e) => updateField('googleDriveClientId', e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Dropbox App Key</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="App Key de Dropbox"
                    value={draft.dropboxAppKey}
                    onChange={(e) => updateField('dropboxAppKey', e.target.value)}
                  />
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
            </div>
          </div>
        )}

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
