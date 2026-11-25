import { useState, useEffect } from 'react'
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
    syncDownFromNeon,
    generatePairingCode,
    importPairingCode,
    testResend,
    testR2,
    testAi,
  } = userPanelState ?? internalState

  const [activeTab, setActiveTab] = useState<UserPanelTab>(requestedTab ?? 'database')

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab)
    }
  }, [requestedTab])
  const [unlockMode, setUnlockMode] = useState<'vault' | 'code' | 'neon'>('vault')
  const [masterInput, setMasterInput] = useState('')
  const [draft, setDraft] = useState<UserIntegrationsVault>(EMPTY_VAULT)
  const [showSecrets, setShowSecrets] = useState(false)
  const [testToEmail, setTestToEmail] = useState('')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [importToken, setImportToken] = useState('')
  const [importPass, setImportPass] = useState('')
  const [pullNeonUrl, setPullNeonUrl] = useState('')
  const [pullMasterPass, setPullMasterPass] = useState('')
  const [displayNameDraft, setDisplayNameDraft] = useState(prefs.displayName)
  const customAudio = useLiveQuery(() => db.customAudio.get(1), [])

  useEffect(() => {
    setDraft(vault)
  }, [vault])

  useEffect(() => {
    setDisplayNameDraft(prefs.displayName)
  }, [prefs.displayName])

  const updateField = (key: keyof UserIntegrationsVault, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

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
              ? 'Ingresa tu clave maestra para ver, editar o sincronizar tus integraciones (Neon, Resend, R2, Drive, Dropbox).'
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
              {hasVaultSetup ? 'Desbloquear' : 'Crear Bóveda'}
            </button>
            <button
              type="button"
              className={`${styles.unlockModeBtn} ${unlockMode === 'code' ? styles.unlockModeBtnActive : ''}`}
              onClick={() => setUnlockMode('code')}
            >
              Código Sync
            </button>
            <button
              type="button"
              className={`${styles.unlockModeBtn} ${unlockMode === 'neon' ? styles.unlockModeBtnActive : ''}`}
              onClick={() => setUnlockMode('neon')}
            >
              Desde Neon
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
                <span>{hasVaultSetup ? 'Desbloquear Bóveda' : 'Crear y Desbloquear'}</span>
              </button>
            </form>
          )}

          {unlockMode === 'code' && (
            <div className={styles.importBox}>
              <h3 className={styles.sectionHeading}>
                <QrCode size={16} />
                <span>Importar Código de Sincronización</span>
              </h3>
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
            </div>
          )}

          {unlockMode === 'neon' && (
            <div className={styles.importBox}>
              <h3 className={styles.sectionHeading}>
                <Database size={16} />
                <span>Recuperar desde Neon Postgres</span>
              </h3>
              <input
                type="password"
                className={styles.input}
                placeholder="postgres://usuario:clave@ep-xxx.neon.tech/neondb"
                value={pullNeonUrl}
                onChange={(e) => setPullNeonUrl(e.target.value)}
              />
              <input
                type="password"
                className={styles.input}
                placeholder="Clave maestra de la bóveda"
                value={pullMasterPass}
                onChange={(e) => setPullMasterPass(e.target.value)}
              />
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy || !pullNeonUrl.trim() || !pullMasterPass.trim()}
                onClick={() => syncDownFromNeon(pullNeonUrl, pullMasterPass)}
              >
                <RefreshCw size={15} />
                <span>Descargar Bóveda desde Neon</span>
              </button>
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
            onClick={() => setShowSecrets((v) => !v)}
            title="Mostrar/ocultar claves"
          >
            {showSecrets ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{showSecrets ? 'Ocultar' : 'Ver claves'}</span>
          </button>
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

      {/* ── Navegación por Secciones (Base de Datos primero como requisito) ── */}
      <div className={styles.tabsRow}>
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
          className={`${styles.tabBtn} ${activeTab === 'sync' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('sync')}
        >
          <QrCode size={15} />
          <span>Perfil & Sync</span>
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
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Nombre del Perfil / Workspace</label>
              <div className={styles.inlineRow}>
                <input
                  type="text"
                  className={styles.input}
                  value={displayNameDraft}
                  onChange={(e) => setDisplayNameDraft(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => savePrefs({ displayName: displayNameDraft.trim() || 'Usuario Laryko' })}
                >
                  Guardar
                </button>
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
                    <strong>Requisito obligatorio:</strong> Configura primero tu base de datos <strong>Neon Postgres</strong> en la pestaña <em>Base de Datos</em>. Todas tus preferencias, claves y sesiones se guardarán cifradas allí para sincronizarse en todas las plataformas.
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
                    Todas tus preferencias, claves de IA, integraciones y sesiones se sincronizan cifradas (AES-GCM-256) con Neon Postgres y pueden vincularse en otro dispositivo mediante código.
                  </p>

                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      disabled={busy}
                      onClick={() => syncUpToNeon(draft)}
                    >
                      <Upload size={15} />
                      <span>Sincronizar Todo a Neon</span>
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
                  type={showSecrets ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="sk-proj-..."
                  value={draft.openaiApiKey}
                  onChange={(e) => updateField('openaiApiKey', e.target.value)}
                />
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={busy || !draft.openaiApiKey.trim()}
                  onClick={() => testAi('openai', draft.openaiApiKey)}
                >
                  Probar
                </button>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Claude (Anthropic) API Key</label>
              <div className={styles.inlineRow}>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="sk-ant-api03-..."
                  value={draft.anthropicApiKey}
                  onChange={(e) => updateField('anthropicApiKey', e.target.value)}
                />
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={busy || !draft.anthropicApiKey.trim()}
                  onClick={() => testAi('anthropic', draft.anthropicApiKey)}
                >
                  Probar
                </button>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Google Gemini API Key</label>
              <div className={styles.inlineRow}>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="AIzaSy..."
                  value={draft.geminiApiKey}
                  onChange={(e) => updateField('geminiApiKey', e.target.value)}
                />
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={busy || !draft.geminiApiKey.trim()}
                  onClick={() => testAi('gemini', draft.geminiApiKey)}
                >
                  Probar
                </button>
              </div>
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
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="llama-3.3-70b / deepseek-chat"
                    value={draft.customAiModel}
                    onChange={(e) => updateField('customAiModel', e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>API Key (opcional para Ollama local)</label>
                <div className={styles.inlineRow}>
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    className={styles.input}
                    placeholder="Token del proveedor personalizado"
                    value={draft.customAiApiKey}
                    onChange={(e) => updateField('customAiApiKey', e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={busy || !draft.customAiBaseUrl.trim()}
                    onClick={() => testAi('custom', draft.customAiApiKey, draft.customAiBaseUrl)}
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
              <span>Base de Datos (Requisito Mandatorio para Sincronización)</span>
            </h3>
            <p className={styles.hint}>
              Sin una base de datos cloud configurada, Laryko funciona solo en modo local (IndexedDB). Al conectar tu <strong>Neon Serverless Postgres</strong>, todas tus settings, preferencias, claves y sesiones se guardarán y sincronizarán automáticamente en macOS, Windows, Linux, iOS, Android y Web.
            </p>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Connection String (postgresql://...)</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                className={styles.input}
                placeholder="postgresql://user:pass@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
                value={draft.neonDatabaseUrl}
                onChange={(e) => updateField('neonDatabaseUrl', e.target.value)}
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
              Si no tienes dominio propio, deja <code>Laryko &lt;onboarding@resend.dev&gt;</code> como remitente y coloca tu correo personal (Gmail/Outlook registrado en Resend) como destinatario.
            </p>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Resend API Key</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                className={styles.input}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                value={draft.resendApiKey}
                onChange={(e) => updateField('resendApiKey', e.target.value)}
              />
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
                <input
                  type={showSecrets ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="R2 Access Key ID"
                  value={draft.r2AccessKeyId}
                  onChange={(e) => updateField('r2AccessKeyId', e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Secret Access Key</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="R2 Secret Access Key"
                  value={draft.r2SecretAccessKey}
                  onChange={(e) => updateField('r2SecretAccessKey', e.target.value)}
                />
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
