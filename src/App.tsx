import { useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  Globe,
  Smartphone,
  Monitor,
  Terminal,
  HelpCircle,
  Home,
  Calculator as CalculatorIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Copy,
  ExternalLink,
  Plus,
  Moon,
  Lock,
  User,
  Bell,
} from 'lucide-react'
import {
  usePlatform,
  useOnlineStatus,
  useAppUpdater,
  useMultiSession,
  useUserPanel,
  useNotificationsCenter,
  useReminders,
} from '@/hooks'
import {
  StatusBadge,
  UpdateModal,
  BottomBar,
  UpdateCircleButton,
  Calculator,
  MultiSession,
  UserPanel,
  Reminders,
  NotificationsCenter,
  AlarmOverlay,
  AiAssistant,
  GlobalToast,
  type ActiveTool,
} from '@/components'
import { NativeIOSBridge, triggerNativeHaptic } from '@/utils/nativeIOSBridge'
import { multiSessionBridge } from '@/utils/multiSessionBridge'
import { sanitizeSessionUrl } from '@/utils/pinCrypto'
import { toast } from '@/utils/toast'
import type { LarykoAiAction } from '@/utils/aiAssistantActions'
import styles from './App.module.css'

const PLATFORM_ICONS: Record<string, ReactNode> = {
  web: <Globe size={13} strokeWidth={2.2} />,
  ios: <Smartphone size={13} strokeWidth={2.2} />,
  android: <Smartphone size={13} strokeWidth={2.2} />,
  windows: <Monitor size={13} strokeWidth={2.2} />,
  macos: <Monitor size={13} strokeWidth={2.2} />,
  linux: <Terminal size={13} strokeWidth={2.2} />,
  unknown: <HelpCircle size={13} strokeWidth={2.2} />,
}

export function App() {
  const appInfo = usePlatform()
  const isOnline = useOnlineStatus()
  const {
    updateInfo,
    checking,
    isDownloading,
    downloadProgress,
    checkForUpdates,
    executeUpdate,
  } = useAppUpdater(appInfo.platform, appInfo.version)

  const [activeTool, setActiveTool] = useState<ActiveTool>('home')
  const [showModal, setShowModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAiAssistant, setShowAiAssistant] = useState(false)
  const [accountTab, setAccountTab] = useState<'database' | 'ai' | null>(null)
  const multiSession = useMultiSession(appInfo.platform)
  const userPanel = useUserPanel(appInfo.platform)
  const remindersState = useReminders(
    appInfo.platform,
    userPanel.vault,
    userPanel.bidirectionalSync
  )
  const { unreadCount } = useNotificationsCenter()
  const [currentSessionUuid, setCurrentSessionUuid] = useState<string | null>(null)
  const [showSessionManager, setShowSessionManager] = useState(true)
  const [addFormSignal, setAddFormSignal] = useState(0)
  const [browserUrlDraft, setBrowserUrlDraft] = useState('')
  const [unreadBySession, setUnreadBySession] = useState<Record<string, number>>({})

  const isDesktopTauri =
    ['macos', 'windows', 'linux'].includes(appInfo.platform) &&
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in window

  const activeSessionObj =
    multiSession.sessions.find((s) => s.uuid === currentSessionUuid) ?? null
  const showBrowserControls =
    isDesktopTauri &&
    activeTool === 'sessions' &&
    multiSession.isUnlocked &&
    Boolean(activeSessionObj) &&
    !showSessionManager

  useEffect(() => {
    if (activeSessionObj) {
      setBrowserUrlDraft(activeSessionObj.url)
    }
  }, [activeSessionObj?.uuid, activeSessionObj?.url])

  useEffect(() => {
    if (!isDesktopTauri) return
    let unlisten: (() => void) | undefined
    let unlistenUnread: (() => void) | undefined
    import('@tauri-apps/api/event')
      .then(async ({ listen }) => {
        unlisten = await listen<{ uuid: string; url: string }>('laryko://session-url', (event) => {
          if (event.payload?.uuid === currentSessionUuid && event.payload?.url) {
            setBrowserUrlDraft(event.payload.url)
          }
        })
        unlistenUnread = await listen<{ uuid: string; count: number }>(
          'laryko://session-unread',
          (event) => {
            const { uuid, count } = event.payload ?? {}
            if (!uuid) return
            setUnreadBySession((prev) => ({
              ...prev,
              [uuid]:
                uuid === currentSessionUuid && activeTool === 'sessions' && !showSessionManager
                  ? 0
                  : count,
            }))
          }
        )
      })
      .catch(() => {})
    return () => {
      unlisten?.()
      unlistenUnread?.()
    }
  }, [isDesktopTauri, currentSessionUuid, activeTool, showSessionManager])

  useEffect(() => {
    if (appInfo.platform === 'ios') {
      NativeIOSBridge.setWebViewTransparent({ transparent: true })
    }
  }, [appInfo.platform])

  useEffect(() => {
    if (!['macos', 'windows', 'linux'].includes(appInfo.platform)) return
    let unlisten: (() => void) | undefined
    import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen<string>('laryko://download-finished', (event) => {
          toast.success(`Descarga completada: ${event.payload}`)
        })
      )
      .then((fn) => {
        unlisten = fn
      })
      .catch(() => {})
    return () => {
      unlisten?.()
    }
  }, [appInfo.platform])

  // Ocultar WebViews embebidos si salimos de Multi-Sesión, abrimos un modal o está bloqueado
  useEffect(() => {
    if (
      activeTool !== 'sessions' ||
      showModal ||
      showNotifications ||
      showAiAssistant ||
      remindersState.activeAlarm ||
      !multiSession.isUnlocked
    ) {
      multiSessionBridge.hideAllSessions(appInfo.platform).catch(() => {})
    }
    if (!multiSession.isUnlocked) {
      setCurrentSessionUuid(null)
    }
  }, [
    activeTool,
    showModal,
    showNotifications,
    showAiAssistant,
    remindersState.activeAlarm,
    multiSession.isUnlocked,
    appInfo.platform,
  ])

  const executeAiAction = async (action: LarykoAiAction): Promise<string> => {
    switch (action.type) {
      case 'navigate':
        if (action.tool === 'sessions') setShowSessionManager(true)
        setActiveTool(action.tool)
        return `Navegado a ${action.tool}`
      case 'open_notifications':
        setShowNotifications(true)
        return 'Notificaciones abiertas'
      case 'sleep_all_sessions':
        setCurrentSessionUuid(null)
        await multiSession.sleepAllSessions()
        return 'Sesiones dormidas'
      case 'sync_neon':
        await userPanel.bidirectionalSync()
        return 'Sincronización ejecutada'
      case 'test_alert':
        await remindersState.testNativeAlert()
        return 'Alerta de prueba enviada'
      case 'create_reminder': {
        const due = new Date(Date.now() + (action.minutesFromNow ?? 10) * 60_000)
        await remindersState.addReminder({
          title: action.title,
          notes: action.notes ?? '',
          dueAt: due,
          notifyNative: true,
          notifyEmail: false,
          persistent: Boolean(action.persistent),
          isAlarm: Boolean(action.isAlarm),
          recurrence: action.recurrence ?? 'none',
          soundPreset: 'default',
        })
        return `${action.isAlarm ? 'Alarma' : 'Recordatorio'} creado`
      }
    }
  }

  const handleCheckUpdates = async () => {
    triggerNativeHaptic('selection')
    await checkForUpdates()
    setShowModal(true)
  }

  const activeSessionsCount = multiSession.sessions.filter((s) => s.status === 'active').length
  const showSidebarSubmenu =
    activeTool === 'sessions' && multiSession.isUnlocked && multiSession.sessions.length > 0

  const handleWindowMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDesktopTauri || e.button !== 0 || e.detail > 1) return
      const target = e.target as HTMLElement | null
      if (!target) return
      if (
        target.closest(
          'button, a, input, textarea, select, option, label, [role="button"], [contenteditable="true"], [data-no-drag]'
        )
      ) {
        return
      }
      void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        void getCurrentWindow().startDragging().catch(() => {})
      })
    },
    [isDesktopTauri]
  )

  return (
    <div className={styles.app} onMouseDown={handleWindowMouseDown}>
      {isDesktopTauri && (
        <header
          className={`${styles.titlebar} ${appInfo.platform !== 'macos' ? styles.titlebarWin : ''}`}
          data-tauri-drag-region
        >
          {showBrowserControls && activeSessionObj ? (
            <>
              <div className={styles.titlebarNavGroup}>
                <button
                  type="button"
                  className={styles.titlebarIconBtn}
                  onClick={() =>
                    void multiSessionBridge.controlSession(
                      appInfo.platform,
                      activeSessionObj.uuid,
                      'back'
                    )
                  }
                  title="Atrás"
                  aria-label="Atrás"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  className={styles.titlebarIconBtn}
                  onClick={() =>
                    void multiSessionBridge.controlSession(
                      appInfo.platform,
                      activeSessionObj.uuid,
                      'forward'
                    )
                  }
                  title="Adelante"
                  aria-label="Adelante"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  className={styles.titlebarIconBtn}
                  onClick={() =>
                    void multiSessionBridge.controlSession(
                      appInfo.platform,
                      activeSessionObj.uuid,
                      'reload'
                    )
                  }
                  title="Recargar"
                  aria-label="Recargar"
                >
                  <RotateCw size={13} />
                </button>
                <button
                  type="button"
                  className={styles.titlebarIconBtn}
                  onClick={() => {
                    setBrowserUrlDraft(activeSessionObj.url)
                    void multiSessionBridge.controlSession(
                      appInfo.platform,
                      activeSessionObj.uuid,
                      'navigate',
                      activeSessionObj.url
                    )
                  }}
                  title="Ir al inicio de esta sesión"
                  aria-label="Ir al inicio"
                >
                  <Home size={13} />
                </button>
              </div>

              <form
                className={styles.titlebarUrlForm}
                onSubmit={(e) => {
                  e.preventDefault()
                  const safe = sanitizeSessionUrl(browserUrlDraft)
                  if (!safe) {
                    toast.error('Ingresa una URL http:// o https:// válida.')
                    return
                  }
                  setBrowserUrlDraft(safe)
                  void multiSessionBridge.controlSession(
                    appInfo.platform,
                    activeSessionObj.uuid,
                    'navigate',
                    safe
                  )
                }}
              >
                <Lock
                  size={12}
                  style={{
                    color: browserUrlDraft.startsWith('https://')
                      ? '#10b981'
                      : 'var(--color-text-muted)',
                    flexShrink: 0,
                  }}
                />
                <input
                  type="text"
                  className={styles.titlebarUrlInput}
                  value={browserUrlDraft}
                  onChange={(e) => setBrowserUrlDraft(e.target.value)}
                  aria-label="URL de la sesión"
                />
                <button
                  type="button"
                  className={styles.titlebarIconBtn}
                  style={{ width: 22, height: 22 }}
                  onClick={async () => {
                    await navigator.clipboard.writeText(browserUrlDraft)
                    toast.success('URL copiada al portapapeles.')
                  }}
                  title="Copiar URL"
                  aria-label="Copiar URL"
                >
                  <Copy size={11} />
                </button>
              </form>

              <div className={styles.titlebarRight} data-tauri-drag-region>
                <button
                  type="button"
                  className={styles.titlebarPillBtn}
                  onClick={() => {
                    setShowSessionManager(true)
                    setAddFormSignal((n) => n + 1)
                  }}
                  title="Nueva sesión"
                >
                  <Plus size={13} />
                  <span>Sesión</span>
                </button>
                <button
                  type="button"
                  className={styles.titlebarIconBtn}
                  onClick={async () => {
                    const safe = sanitizeSessionUrl(browserUrlDraft) ?? activeSessionObj.url
                    const { invoke } = await import('@tauri-apps/api/core')
                    await invoke('open_external_url', { url: safe }).catch(() => {})
                  }}
                  title="Abrir en navegador predeterminado"
                  aria-label="Abrir en navegador predeterminado"
                >
                  <ExternalLink size={14} />
                </button>
                <button
                  type="button"
                  className={styles.titlebarIconBtn}
                  onClick={async () => {
                    await multiSession.sleepSession(activeSessionObj)
                    setCurrentSessionUuid(null)
                    setShowSessionManager(true)
                  }}
                  title="Dormir sesión"
                  aria-label="Dormir sesión"
                >
                  <Moon size={14} />
                </button>
              </div>
            </>
          ) : (
            <span className={styles.titlebarBrand} data-tauri-drag-region>
              Laryko
            </span>
          )}
        </header>
      )}

      <div className={styles.appBody}>
      {/* ── Sidebar de Escritorio (>= 768px) ── */}
      <aside
        className={`${styles.desktopSidebar} ${activeTool === 'sessions' ? styles.desktopSidebarCompact : ''}`}
        aria-label="Navegación principal"
      >
        <div className={styles.sidebarTopSection}>
          <div className={styles.sidebarBrand}>
            <img
              src="/favicon.svg"
              alt="Laryko"
              style={{ width: 32, height: 32, borderRadius: 8, display: 'block', flexShrink: 0 }}
            />
            <div className={styles.sidebarBrandText}>
              <div className={styles.sidebarBrandTitle}>Laryko</div>
              <div className={styles.sidebarBrandVersion}>v{appInfo.version}</div>
            </div>
          </div>

          <nav className={styles.sidebarNav}>
            <button
              type="button"
              className={`${styles.sidebarNavBtn} ${activeTool === 'home' ? styles.sidebarNavBtnActive : ''}`}
              onClick={() => setActiveTool('home')}
              title="Inicio"
              data-tooltip="Inicio"
            >
              <Home size={18} strokeWidth={2.2} />
              <span className={styles.sidebarNavLabel}>Inicio</span>
            </button>
            <button
              type="button"
              className={`${styles.sidebarNavBtn} ${activeTool === 'calculator' ? styles.sidebarNavBtnActive : ''}`}
              onClick={() => setActiveTool('calculator')}
              title="Calculadora"
              data-tooltip="Calculadora"
            >
              <CalculatorIcon size={18} strokeWidth={2.2} />
              <span className={styles.sidebarNavLabel}>Calculadora</span>
            </button>
            <button
              type="button"
              className={`${styles.sidebarNavBtn} ${
                activeTool === 'sessions' && showSessionManager ? styles.sidebarNavBtnActive : ''
              }`}
              onClick={() => {
                setActiveTool('sessions')
                setShowSessionManager(true)
              }}
              title="Multi-Sesión (Home)"
              data-tooltip="Multi-Sesión (Home)"
            >
              <Layers size={18} strokeWidth={2.2} />
              <span className={styles.sidebarNavLabel}>Multi-Sesión</span>
            </button>
            <button
              type="button"
              className={`${styles.sidebarNavBtn} ${activeTool === 'reminders' ? styles.sidebarNavBtnActive : ''}`}
              onClick={() => setActiveTool('reminders')}
              title="Agenda y Recordatorios"
              data-tooltip="Agenda"
            >
              <Bell size={18} strokeWidth={2.2} />
              <span className={styles.sidebarNavLabel}>Agenda</span>
            </button>
          </nav>

          {/* ── Sub-items de Multi-Sesión integrados en la misma columna ── */}
          {showSidebarSubmenu && (
            <div className={styles.sidebarSessionsSubmenu} aria-label="Accesos rápidos de sesiones">
              <button
                type="button"
                className={styles.sidebarSubBtn}
                onClick={() => {
                  setShowSessionManager(true)
                  setAddFormSignal((n) => n + 1)
                }}
                title="Nueva sesión aislada"
                data-tooltip="Nueva sesión"
                aria-label="Nueva sesión"
              >
                <Plus size={16} />
              </button>

              {multiSession.sessions.map((session) => {
                const isActive = session.status === 'active'
                const isSelected = currentSessionUuid === session.uuid && !showSessionManager
                const unreadCountForSession = unreadBySession[session.uuid] ?? 0
                return (
                  <button
                    key={session.uuid}
                    type="button"
                    className={`${styles.sidebarSessionAvatarBtn} ${
                      isSelected ? styles.sidebarSessionSelected : ''
                    } ${unreadCountForSession > 0 ? styles.sidebarSessionUnreadBlink : ''}`}
                    style={{ backgroundColor: session.color }}
                    onClick={() => {
                      triggerNativeHaptic('selection')
                      setCurrentSessionUuid(session.uuid)
                      setShowSessionManager(false)
                      setUnreadBySession((prev) => ({ ...prev, [session.uuid]: 0 }))
                    }}
                    title={`${session.name} (${isActive ? 'Activa' : 'Dormida'})`}
                    data-tooltip={`${session.name} · ${
                      unreadCountForSession > 0
                        ? `${unreadCountForSession} nueva(s)`
                        : isActive
                          ? 'Activa'
                          : 'Dormida'
                    }`}
                  >
                    {session.icon ? (
                      <img
                        src={session.icon}
                        alt={session.name}
                        style={{ width: '68%', height: '68%', objectFit: 'contain' }}
                      />
                    ) : (
                      session.name.slice(0, 2).toUpperCase()
                    )}
                    {unreadCountForSession > 0 && (
                      <span className={styles.sidebarSessionUnreadBadge}>
                        {unreadCountForSession > 99 ? '99+' : unreadCountForSession}
                      </span>
                    )}
                    <span
                      className={`${styles.sidebarSessionDot} ${
                        isActive ? styles.sidebarSessionDotActive : styles.sidebarSessionDotSleeping
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className={styles.sidebarFooter}>
          {showSidebarSubmenu && (
            <div className={styles.sidebarCompactActions}>
              {activeSessionsCount > 0 && (
                <button
                  type="button"
                  className={styles.sidebarSubBtn}
                  onClick={async () => {
                    triggerNativeHaptic('selection')
                    setCurrentSessionUuid(null)
                    setShowSessionManager(true)
                    await multiSession.sleepAllSessions()
                  }}
                  title="Dormir todas las sesiones (liberar RAM)"
                  data-tooltip="Dormir todas"
                  aria-label="Dormir todas"
                >
                  <Moon size={16} />
                </button>
              )}
              <button
                type="button"
                className={styles.sidebarSubBtn}
                onClick={() => {
                  triggerNativeHaptic('medium')
                  setCurrentSessionUuid(null)
                  setShowSessionManager(true)
                  void multiSession.lockNow(true)
                }}
                title="Bloquear con PIN"
                data-tooltip="Bloquear PIN"
                aria-label="Bloquear con PIN"
              >
                <Lock size={16} />
              </button>
            </div>
          )}

          <div className={styles.statusPill}>
            <span className={styles.platformIcon}>
              {PLATFORM_ICONS[appInfo.platform] ?? PLATFORM_ICONS.unknown}
            </span>
            <span className={styles.platformName}>{appInfo.platform}</span>
            <span className={styles.statusDivider}>•</span>
            <StatusBadge isOnline={isOnline} />
          </div>

          <div className={styles.globalActionsGroup}>
            <button
              type="button"
              className={`${styles.accountCircleBtn} ${
                activeTool === 'account' ? styles.accountCircleBtnActive : ''
              }`}
              onClick={() => {
                triggerNativeHaptic('selection')
                setActiveTool('account')
              }}
              title="Cuenta y Sincronización"
              aria-label="Cuenta y Sincronización"
            >
              <User size={16} strokeWidth={2.2} />
            </button>

            <button
              type="button"
              className={`${styles.accountCircleBtn} ${
                showNotifications ? styles.accountCircleBtnActive : ''
              }`}
              onClick={() => {
                triggerNativeHaptic('selection')
                setShowNotifications(true)
              }}
              title="Centro de Notificaciones"
              aria-label="Centro de Notificaciones"
            >
              <Bell size={16} strokeWidth={2.2} />
              {unreadCount > 0 && (
                <span className={styles.notifBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            <UpdateCircleButton
              checking={checking}
              onClick={handleCheckUpdates}
              hasUpdateAvailable={Boolean(updateInfo)}
            />
          </div>
        </div>
      </aside>

      <div className={styles.mainShell}>
        {/* ── Barra Superior Móvil / Ventana Estrecha (< 768px) ── */}
        <header className={styles.topBar}>
          <div className={styles.statusPill}>
            <span className={styles.platformIcon}>
              {PLATFORM_ICONS[appInfo.platform] ?? PLATFORM_ICONS.unknown}
            </span>
            <span className={styles.platformName}>{appInfo.platform}</span>
            <span className={styles.statusDivider}>•</span>
            <StatusBadge isOnline={isOnline} />
          </div>

          <div className={styles.globalActionsGroup}>
            <button
              type="button"
              className={`${styles.accountCircleBtn} ${
                activeTool === 'account' ? styles.accountCircleBtnActive : ''
              }`}
              onClick={() => {
                triggerNativeHaptic('selection')
                setActiveTool('account')
              }}
              title="Cuenta y Sincronización"
              aria-label="Cuenta y Sincronización"
            >
              <User size={16} strokeWidth={2.2} />
            </button>

            <button
              type="button"
              className={`${styles.accountCircleBtn} ${
                showNotifications ? styles.accountCircleBtnActive : ''
              }`}
              onClick={() => {
                triggerNativeHaptic('selection')
                setShowNotifications(true)
              }}
              title="Centro de Notificaciones"
              aria-label="Centro de Notificaciones"
            >
              <Bell size={16} strokeWidth={2.2} />
              {unreadCount > 0 && (
                <span className={styles.notifBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            <UpdateCircleButton
              checking={checking}
              onClick={handleCheckUpdates}
              hasUpdateAvailable={Boolean(updateInfo)}
            />
          </div>
        </header>

        {/* ── Contenedor de Vistas / Sub-apps ── */}
        <main className={`${styles.container} ${activeTool === 'sessions' ? styles.containerFull : ''}`}>
        {activeTool === 'home' && (
          <>
            {/* ── Brand Header ── */}
            <header className={styles.header}>
              <div className={styles.logo}>
                <img
                  src="/favicon.svg"
                  alt="Laryko"
                  style={{ width: 56, height: 56, borderRadius: 12, display: 'block' }}
                />
              </div>
              <h1 className={styles.title}>Laryko</h1>
              <p className={styles.subtitle}>Hub de Herramientas</p>
            </header>

            {/* ── Sección de Herramientas del Hub ── */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Herramientas Disponibles</span>
                <span className={styles.sectionBadge}>3 activas</span>
              </div>

              <div className={styles.toolsGrid}>
                {/* Herramienta 1: Calculadora */}
                <button
                  type="button"
                  className={styles.toolCard}
                  onClick={() => {
                    triggerNativeHaptic('selection')
                    setActiveTool('calculator')
                  }}
                  aria-label="Abrir Calculadora"
                >
                  <div className={styles.toolContent}>
                    <div className={styles.toolIcon}>
                      <CalculatorIcon size={24} strokeWidth={2} />
                    </div>
                    <div className={styles.toolMeta}>
                      <span className={styles.toolName}>Calculadora Inteligente</span>
                      <span className={styles.toolDesc}>
                        Aritmética rápida, conversión de porcentajes e historial sin conexión.
                      </span>
                    </div>
                  </div>
                  <span className={styles.toolAction}>
                    <ChevronRight size={20} strokeWidth={2.2} />
                  </span>
                </button>

                {/* Herramienta 2: Multi-Sesión (Contenedores aislados con PIN) */}
                <button
                  type="button"
                  className={styles.toolCard}
                  onClick={() => {
                    triggerNativeHaptic('selection')
                    setActiveTool('sessions')
                  }}
                  aria-label="Abrir Multi-Sesión"
                >
                  <div className={styles.toolContent}>
                    <div className={styles.toolIcon}>
                      <Layers size={24} strokeWidth={2} />
                    </div>
                    <div className={styles.toolMeta}>
                      <span className={styles.toolName}>Multi-Sesión (PIN)</span>
                      <span className={styles.toolDesc}>
                        Contenedores aislados multi-cuenta sin Chromium, optimización de RAM y bloqueo por PIN.
                      </span>
                    </div>
                  </div>
                  <span className={styles.toolAction}>
                    <ChevronRight size={20} strokeWidth={2.2} />
                  </span>
                </button>

                {/* Herramienta 3: Agenda & Recordatorios */}
                <button
                  type="button"
                  className={styles.toolCard}
                  onClick={() => {
                    triggerNativeHaptic('selection')
                    setActiveTool('reminders')
                  }}
                  aria-label="Abrir Agenda y Recordatorios"
                >
                  <div className={styles.toolContent}>
                    <div className={styles.toolIcon}>
                      <Bell size={24} strokeWidth={2} />
                    </div>
                    <div className={styles.toolMeta}>
                      <span className={styles.toolName}>Agenda & Recordatorios</span>
                      <span className={styles.toolDesc}>
                        Alertas nativas sin internet, respaldo por email y sincronización offline-first.
                      </span>
                    </div>
                  </div>
                  <span className={styles.toolAction}>
                    <ChevronRight size={20} strokeWidth={2.2} />
                  </span>
                </button>
              </div>
            </section>

            {/* ── Minimal Footer ── */}
            <footer className={styles.footer}>
              <p>
                Laryko v{appInfo.version} © {new Date().getFullYear()} ·{' '}
                <a href="https://laryko.com" target="_blank" rel="noopener noreferrer">
                  laryko.com
                </a>
              </p>
            </footer>
          </>
        )}

        {activeTool === 'calculator' && (
          <Calculator platform={appInfo.platform} />
        )}

        {activeTool === 'sessions' && (
          <MultiSession
            platform={appInfo.platform}
            multiSession={multiSession}
            currentUuid={currentSessionUuid}
            onSelectUuid={setCurrentSessionUuid}
            showManager={showSessionManager}
            onToggleManager={setShowSessionManager}
            showAddFormSignal={addFormSignal}
          />
        )}

        {activeTool === 'reminders' && (
          <Reminders
            platform={appInfo.platform}
            vault={userPanel.vault}
            onLocalChange={userPanel.bidirectionalSync}
            remindersState={remindersState}
          />
        )}

        {activeTool === 'account' && (
          <UserPanel
            platform={appInfo.platform}
            userPanelState={userPanel}
            requestedTab={accountTab}
          />
        )}
      </main>
      </div>
      </div>

      {/* ── Barra Inferior Flotante (Liquid Glass Dock en Móvil / Ventana estrecha) ── */}
      <BottomBar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        platform={appInfo.platform}
        sessionControls={
          activeTool === 'sessions' &&
          multiSession.isUnlocked &&
          activeSessionObj &&
          !showSessionManager
            ? {
                name: activeSessionObj.name,
                onBack: () =>
                  void multiSessionBridge.controlSession(
                    appInfo.platform,
                    activeSessionObj.uuid,
                    'back'
                  ),
                onReload: () =>
                  void multiSessionBridge.controlSession(
                    appInfo.platform,
                    activeSessionObj.uuid,
                    'reload'
                  ),
                onSessions: () => setShowSessionManager(true),
                onSleep: async () => {
                  await multiSession.sleepSession(activeSessionObj)
                  setCurrentSessionUuid(null)
                  setShowSessionManager(true)
                },
                onHome: () => {
                  setShowSessionManager(true)
                  setActiveTool('home')
                },
              }
            : null
        }
      />

      {/* ── Toast Inteligente Global ── */}
      <GlobalToast />

      {/* ── Asistente IA Flotante (esquina inferior derecha) ── */}
      <AiAssistant
        isOpen={showAiAssistant}
        onToggle={setShowAiAssistant}
        hasVaultSetup={userPanel.hasVaultSetup}
        onUnlockVault={userPanel.unlockOrInitVault}
        onOpenAiSettings={() => {
          setAccountTab('ai')
          setActiveTool('account')
        }}
        assistantParams={{
          platform: appInfo.platform,
          isOnline,
          activeTool,
          vault: userPanel.vault,
          vaultUnlocked: userPanel.vaultUnlocked,
          hasDatabase: userPanel.hasDatabaseConfigured,
          pendingRemindersCount: remindersState.reminders.filter((r) => !r.completed).length,
          sessionsCount: multiSession.sessions.length,
          activeSessionsCount,
          onExecuteAction: executeAiAction,
        }}
      />

      {/* ── Alarma Activa (Sonido continuo de alto volumen) ── */}
      {remindersState.activeAlarm && (
        <AlarmOverlay
          alarm={remindersState.activeAlarm}
          onSnooze={remindersState.snoozeAlarm}
          onStop={remindersState.stopAlarm}
          onDelete={remindersState.deleteReminder}
        />
      )}

      {/* ── Centro de Notificaciones ── */}
      {showNotifications && (
        <NotificationsCenter
          onClose={() => setShowNotifications(false)}
          onOpenAgenda={() => setActiveTool('reminders')}
        />
      )}

      {/* ── Modal de Actualizaciones ── */}
      {showModal && updateInfo && (
        <UpdateModal
          updateInfo={updateInfo}
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
          onUpdate={async () => {
            const isDesktop = ['macos', 'windows', 'linux'].includes(appInfo.platform)
            if (!isDesktop) {
              setShowModal(false)
            }
            await executeUpdate()
          }}
          onClose={() => {
            if (!isDownloading) {
              setShowModal(false)
            }
          }}
        />
      )}
    </div>
  )
}
