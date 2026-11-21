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
  Sparkles,
  Heart,
  ShieldCheck,
  Cpu,
} from 'lucide-react'
import { usePlatform, useOnlineStatus, useAppUpdater } from '@/hooks'
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
        {activeTool === 'home' && (
          <>
            {/* ── Brand Header ── */}
            <header className={styles.header}>
              <div className={styles.logo}>
                <Zap size={38} strokeWidth={2.5} />
              </div>
              <h1 className={styles.title}>Laryko</h1>
              <p className={styles.subtitle}>Hub de Herramientas</p>
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

                {/* Próxima herramienta: Coming Soon */}
                <button
                  type="button"
                  className={styles.toolCard}
                  onClick={() => {
                    triggerNativeHaptic('selection')
                    setActiveTool('thanks')
                  }}
                  aria-label="Ver agradecimientos y próximas utilidades"
                >
                  <div className={styles.toolContent}>
                    <div className={styles.toolIcon}>
                      <Sparkles size={24} strokeWidth={2} />
                    </div>
                    <div className={styles.toolMeta}>
                      <span className={styles.toolName}>Más Utilidades (Coming Soon)</span>
                      <span className={styles.toolDesc}>
                        Conversor de unidades, notas rápidas y cronómetro en camino.
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

        {activeTool === 'thanks' && (
          <div className={styles.thanksWrapper}>
            <div className={styles.thanksIconBadge}>
              <Heart size={32} strokeWidth={2.4} />
            </div>
            <h2 className={styles.title}>¡Gracias por usar Laryko!</h2>
            <p className={styles.subtitle}>
              Construyendo herramientas de alto rendimiento, privadas y 100% offline-first.
            </p>

            <div className={styles.thanksCard}>
              <div className={styles.thanksCardTitle}>
                <ShieldCheck size={20} color="#10b981" />
                <span>Privacidad y Autonomía</span>
              </div>
              <p className={styles.thanksCardDesc}>
                Tus datos nunca salen de tu dispositivo. Todas las operaciones, historial y configuraciones se procesan de forma local.
              </p>
            </div>

            <div className={styles.thanksCard}>
              <div className={styles.thanksCardTitle}>
                <Cpu size={20} color="#3b82f6" />
                <span>Próximas Utilidades (Coming Soon)</span>
              </div>
              <p className={styles.thanksCardDesc}>
                • Conversor universal de unidades y divisas<br />
                • Bloc de notas rápidas con cifrado local<br />
                • Temporizador y cronómetro de alta precisión
              </p>
            </div>

            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={() => {
                triggerNativeHaptic('selection')
                setActiveTool('calculator')
              }}
            >
              <CalculatorIcon size={18} strokeWidth={2.2} />
              <span>Abrir Calculadora</span>
            </button>
          </div>
        )}
      </main>

      {/* ── Barra Inferior Flotante (Liquid Glass Dock) ── */}
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
