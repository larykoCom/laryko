import { useState, useEffect, type ReactNode } from 'react'
import {
  Globe,
  Smartphone,
  Monitor,
  Terminal,
  HelpCircle,
  Zap,
  Calculator as CalculatorIcon,
  ChevronRight,
  Minus,
  Plus,
  AlertTriangle,
} from 'lucide-react'
import { usePlatform, useOnlineStatus, useCounter, useAppUpdater } from '@/hooks'
import {
  StatusBadge,
  UpdateModal,
  BottomBar,
  UpdateCircleButton,
  Calculator,
  type ActiveTool,
} from '@/components'
import { NativeIOSBridge, triggerNativeHaptic } from '@/utils/nativeIOSBridge'
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
  const { value, increment, decrement } = useCounter()
  const {
    updateInfo,
    checking,
    error,
    isDownloading,
    downloadProgress,
    checkForUpdates,
    executeUpdate,
  } = useAppUpdater(appInfo.platform, appInfo.version)

  const [activeTool, setActiveTool] = useState<ActiveTool>('home')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (appInfo.platform === 'ios') {
      NativeIOSBridge.setWebViewTransparent({ transparent: true })
    }
  }, [appInfo.platform])

  const handleCheckUpdates = async () => {
    triggerNativeHaptic('selection')
    await checkForUpdates()
    setShowModal(true)
  }

  return (
    <div className={styles.app}>
      {/* ── Barra Superior Fija: Estado y Botón Circular de Actualizaciones ── */}
      <header className={styles.topBar}>
        <div className={styles.statusPill}>
          <span className={styles.platformIcon}>
            {PLATFORM_ICONS[appInfo.platform] ?? PLATFORM_ICONS.unknown}
          </span>
          <span className={styles.platformName}>{appInfo.platform}</span>
          <span className={styles.statusDivider}>•</span>
          <StatusBadge isOnline={isOnline} />
        </div>

        <UpdateCircleButton
          checking={checking}
          onClick={handleCheckUpdates}
          hasUpdateAvailable={Boolean(updateInfo)}
        />
      </header>

      {/* ── Contenedor de Vistas / Sub-apps ── */}
      <main className={styles.container}>
        {activeTool === 'home' ? (
          <>
            {/* ── Brand Header ── */}
            <header className={styles.header}>
              <div className={styles.logo}>
                <Zap size={38} strokeWidth={2.5} />
              </div>
              <h1 className={styles.title}>Laryko</h1>
              <p className={styles.subtitle}>Hub de Herramientas Offline-First</p>
            </header>

            {/* ── Sección de Herramientas del Hub ── */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Herramientas Disponibles</span>
                <span className={styles.sectionBadge}>1 activa</span>
              </div>

              <div className={styles.toolsGrid}>
                {/* Herramienta 1: Calculadora */}
                <button
                  type="button"
                  className={styles.toolCard}
                  onClick={() => setActiveTool('calculator')}
                  aria-label="Abrir Calculadora"
                >
                  <div className={styles.toolContent}>
                    <div className={styles.toolIcon}>
                      <CalculatorIcon size={24} strokeWidth={2} />
                    </div>
                    <div className={styles.toolMeta}>
                      <span className={styles.toolName}>Calculadora</span>
                      <span className={styles.toolDesc}>
                        Aritmética rápida, soporte offline e historial persistente.
                      </span>
                    </div>
                  </div>
                  <span className={styles.toolAction}>
                    <ChevronRight size={20} strokeWidth={2.2} />
                  </span>
                </button>
              </div>
            </section>

            {/* ── Widget Interactivo Offline (Dexie.js) ── */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Almacenamiento Local</span>
                <span className={styles.storageTag}>Dexie.js</span>
              </div>

              <div className={styles.widgetCard}>
                <div className={styles.widgetHeader}>
                  <span className={styles.widgetLabel}>Contador Persistente</span>
                </div>

                <div className={styles.counterControl}>
                  <button
                    type="button"
                    className={styles.counterBtn}
                    onClick={decrement}
                    aria-label="Decrementar"
                  >
                    <Minus size={16} strokeWidth={2.5} />
                  </button>
                  <span className={styles.counterValue}>{value}</span>
                  <button
                    type="button"
                    className={styles.counterBtn}
                    onClick={increment}
                    aria-label="Incrementar"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </section>

            {error && (
              <p className={styles.errorMsg}>
                <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {error}
              </p>
            )}

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
        ) : (
          <Calculator platform={appInfo.platform} />
        )}
      </main>

      {/* ── Barra Inferior Flotante (Liquid Glass) ── */}
      <BottomBar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        platform={appInfo.platform}
      />

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
