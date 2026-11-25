import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Sparkles, Trash2, Check, Lock, KeyRound } from 'lucide-react'
import { useAiAssistant, type UseAiAssistantParams } from '@/hooks/useAiAssistant'
import { triggerNativeHaptic } from '@/utils/nativeIOSBridge'
import styles from './AiAssistant.module.css'

export interface AiAssistantProps {
  isOpen: boolean
  onToggle: (open: boolean) => void
  hasVaultSetup: boolean
  onUnlockVault: (secret: string) => Promise<boolean>
  onOpenAiSettings: () => void
  assistantParams: UseAiAssistantParams
}

const QUICK_PROMPTS = [
  'Pon una alarma en 5 minutos llamada Revisar correo',
  'Abre la Agenda',
  'Duerme todas las sesiones',
  '¿Cómo sincronizo otro dispositivo?',
]

export function AiAssistant({
  isOpen,
  onToggle,
  hasVaultSetup,
  onUnlockVault,
  onOpenAiSettings,
  assistantParams,
}: AiAssistantProps) {
  const { messages, loading, activeProviderLabel, sendMessage, clearMessages } =
    useAiAssistant(assistantParams)

  const [input, setInput] = useState('')
  const [vaultSecret, setVaultSecret] = useState('')
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const hasAnyAiKey = Boolean(
    assistantParams.vault.geminiApiKey.trim() ||
      assistantParams.vault.anthropicApiKey.trim() ||
      assistantParams.vault.openaiApiKey.trim() ||
      assistantParams.vault.customAiBaseUrl.trim()
  )

  const needsUnlock = hasVaultSetup && !assistantParams.vaultUnlocked
  const needsApiKey = !hasVaultSetup || (assistantParams.vaultUnlocked && !hasAnyAiKey)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    const text = input
    setInput('')
    triggerNativeHaptic('light')
    await sendMessage(text)
  }

  return (
    <>
      {/* ── Botón Flotante en Esquina Inferior Derecha ── */}
      <button
        type="button"
        className={`${styles.fab} ${isOpen ? styles.fabOpen : ''}`}
        onClick={() => {
          triggerNativeHaptic('selection')
          onToggle(!isOpen)
        }}
        title="Asistente IA de Laryko"
        aria-label="Abrir Asistente IA"
      >
        {isOpen ? <X size={22} strokeWidth={2.4} /> : <Bot size={22} strokeWidth={2.2} />}
      </button>

      {/* ── Panel Flotante de Chat IA ── */}
      {isOpen && (
        <div className={styles.drawer} role="dialog" aria-label="Asistente IA Laryko">
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.botAvatar}>
                <Sparkles size={16} strokeWidth={2.2} />
              </div>
              <div>
                <div className={styles.title}>Asistente Laryko</div>
                <div className={styles.providerBadge}>{activeProviderLabel}</div>
              </div>
            </div>

            <div className={styles.headerActions}>
              {messages.length > 0 && (
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={clearMessages}
                  title="Limpiar chat"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => onToggle(false)}
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className={styles.messages}>
            {needsUnlock && (
              <form
                className={styles.setupBanner}
                onSubmit={async (e) => {
                  e.preventDefault()
                  setUnlockError(null)
                  const ok = await onUnlockVault(vaultSecret)
                  if (ok) {
                    setVaultSecret('')
                  } else {
                    setUnlockError('Clave maestra incorrecta.')
                  }
                }}
              >
                <div className={styles.setupTitle}>
                  <Lock size={14} />
                  <span>Desbloquea tu bóveda para usar tu API Key de IA</span>
                </div>
                <div className={styles.setupRow}>
                  <input
                    type="password"
                    className={styles.setupInput}
                    placeholder="Clave maestra de Cuenta"
                    value={vaultSecret}
                    onChange={(e) => setVaultSecret(e.target.value)}
                    required
                  />
                  <button type="submit" className={styles.setupBtn}>
                    Desbloquear
                  </button>
                </div>
                {unlockError && <span className={styles.setupError}>{unlockError}</span>}
              </form>
            )}

            {needsApiKey && !needsUnlock && (
              <div className={styles.setupBanner}>
                <div className={styles.setupTitle}>
                  <KeyRound size={14} />
                  <span>Configura tu API Key de IA en Cuenta</span>
                </div>
                <p className={styles.setupDesc}>
                  Agrega tu clave de OpenAI, Claude o Gemini para activar el asistente completo (también puedes usar comandos locales).
                </p>
                <button
                  type="button"
                  className={styles.setupBtn}
                  onClick={() => {
                    onToggle(false)
                    onOpenAiSettings()
                  }}
                >
                  Configurar API Key en Cuenta
                </button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className={styles.empty}>
                <Bot size={28} strokeWidth={1.8} />
                <p>¿En qué te ayudo hoy?</p>
                <span>
                  Puedo navegar por la app, crear alarmas o recordatorios, dormir sesiones y ayudarte a configurar Neon o Resend.
                </span>
                <div className={styles.quickList}>
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className={styles.quickBtn}
                      onClick={() => sendMessage(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`${styles.msg} ${
                    m.role === 'user' ? styles.msgUser : styles.msgAssistant
                  }`}
                >
                  <div className={styles.msgBubble}>{m.text}</div>
                  {m.executedActions && m.executedActions.length > 0 && (
                    <div className={styles.actionsDone}>
                      {m.executedActions.map((label, idx) => (
                        <span key={idx} className={styles.actionTag}>
                          <Check size={11} /> {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && <div className={styles.typing}>Pensando...</div>}
            <div ref={endRef} />
          </div>

          <form className={styles.inputRow} onSubmit={handleSubmit}>
            <input
              type="text"
              className={styles.input}
              placeholder="Escribe un comando o pregunta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
