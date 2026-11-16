import { useState } from 'react'
import { usePlatform, useOnlineStatus, useCounter, useAppUpdater } from '@/hooks'
import { StatusBadge, UpdateModal } from '@/components'
import styles from './App.module.css'

const PLATFORM_ICONS: Record<string, string> = {
  web: '🌐',
  ios: '📱',
  android: '🤖',
  windows: '🪟',
  macos: '🍎',
  linux: '🐧',
  unknown: '❓',
}

export function App() {
  const appInfo = usePlatform()
  const isOnline = useOnlineStatus()
  const { value, increment, decrement } = useCounter()
  const { updateInfo, checking, error, checkForUpdates, executeUpdate } = useAppUpdater(
    appInfo.platform,
    appInfo.version,
  )
  const [showModal, setShowModal] = useState(false)

  const handleCheckUpdates = async () => {
    await checkForUpdates()
    setShowModal(true)
  }

  return (
    <div className={styles.app}>
      <main className={styles.container}>
        {/* ── Status Pill ── */}
        <div className={styles.statusPill}>
          <span>{PLATFORM_ICONS[appInfo.platform] ?? '🌐'} {appInfo.platform}</span>
          <span className={styles.statusDivider}>•</span>
          <StatusBadge isOnline={isOnline} />
        </div>

        {/* ── Brand Header ── */}
        <header className={styles.header}>
          <div className={styles.logo}>⚡</div>
          <h1 className={styles.title}>Laryko</h1>
          <p className={styles.subtitle}>Multiplataforma & Offline-First</p>
        </header>

        {/* ── Minimal Interactive Card ── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Persistencia Offline</span>
            <span className={styles.storageTag}>Dexie.js</span>
          </div>

          <div className={styles.counterControl}>
            <button
              className={styles.counterBtn}
              onClick={decrement}
              aria-label="Decrementar"
            >
              −
            </button>
            <span className={styles.counterValue}>{value}</span>
            <button
              className={styles.counterBtn}
              onClick={increment}
              aria-label="Incrementar"
            >
              +
            </button>
          </div>

          <button
            className={styles.updateBtn}
            onClick={handleCheckUpdates}
            disabled={checking}
          >
            {checking ? (
              <>
                <span className={styles.spinner} />
                <span>Verificando versión...</span>
              </>
            ) : (
              <>🔄 Buscar actualizaciones</>
            )}
          </button>

          {error && <p className={styles.errorMsg}>⚠️ {error}</p>}
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
      </main>

      {/* ── Modal de actualización ── */}
      {showModal && updateInfo && (
        <UpdateModal
          updateInfo={updateInfo}
          onUpdate={() => { executeUpdate(); setShowModal(false) }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
