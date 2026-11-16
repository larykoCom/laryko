import { useState, useEffect } from 'react'
import { usePlatform, useOnlineStatus, useCounter, useQuickNote, useAppUpdater } from '@/hooks'
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
  const { value, increment, decrement, reset } = useCounter()
  const { noteText, saveNote, clearNote } = useQuickNote()
  const [inputVal, setInputVal] = useState('')
  const { updateInfo, checking, error, checkForUpdates, executeUpdate } = useAppUpdater(
    appInfo.platform,
    appInfo.version,
  )
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (noteText) setInputVal(noteText)
  }, [noteText])

  const handleSaveNote = async () => {
    await saveNote(inputVal)
  }

  const handleCheckUpdates = async () => {
    await checkForUpdates()
    setShowModal(true)
  }

  return (
    <div className={styles.app}>
      <main className={styles.container}>
        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.logo}>⚡</div>
          <h1 className={styles.title}>Laryko</h1>
          <p className={styles.subtitle}>Hola Mundo — Multiplataforma & Offline-First</p>
        </header>

        {/* ── Info Card ── */}
        <section className={styles.card}>
          <p className={styles.cardTitle}>Información del sistema</p>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Plataforma</span>
            <span className={`${styles.infoValue} ${styles.platformBadge}`}>
              {PLATFORM_ICONS[appInfo.platform]} {appInfo.platform}
            </span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Versión</span>
            <span className={styles.infoValue}>v{appInfo.version}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Origen</span>
            <span className={styles.infoValue}>{appInfo.origin || '—'}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Estado de red</span>
            <StatusBadge isOnline={isOnline} />
          </div>
        </section>

        {/* ── Counter & Quick Note (Offline-First con Dexie.js) ── */}
        <section className={styles.counterCard}>
          <p className={styles.cardTitle}>Persistencia Offline-First (Dexie.js / IndexedDB)</p>
          <div className={styles.counterDisplay}>
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
          <button className={styles.counterReset} onClick={reset}>
            Reiniciar contador
          </button>

          <div className={styles.noteInputWrapper}>
            <input
              type="text"
              className={styles.noteInput}
              placeholder="Escribe una nota rápida offline..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveNote()}
            />
            <button className={styles.noteSaveBtn} onClick={handleSaveNote}>
              Guardar
            </button>
          </div>

          {noteText && (
            <div className={styles.savedNote}>
              <span>📝 {noteText}</span>
              <button
                className={styles.clearNoteBtn}
                onClick={clearNote}
                title="Borrar nota"
              >
                ✕
              </button>
            </div>
          )}

          <p className={styles.offlineNote}>
            💾 Guardado localmente — funciona sin conexión en todas las plataformas
          </p>
        </section>

        {/* ── Actualizaciones ── */}
        <section className={styles.updateCard}>
          <p className={styles.cardTitle}>Actualizaciones</p>
          <button
            className={styles.updateBtn}
            onClick={handleCheckUpdates}
            disabled={checking}
          >
            {checking ? (
              <>
                <span className={styles.spinner} />
                Verificando...
              </>
            ) : (
              <>🔄 Buscar actualizaciones</>
            )}
          </button>
          {error && <p className={styles.errorMsg}>⚠️ {error}</p>}
        </section>

        {/* ── Footer ── */}
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
