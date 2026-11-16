import type { UpdateInfo } from '@/types'
import styles from './UpdateModal.module.css'

interface UpdateModalProps {
  updateInfo: UpdateInfo
  onUpdate: () => void
  onClose: () => void
}

export function UpdateModal({ updateInfo, onUpdate, onClose }: UpdateModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {updateInfo.hasUpdate ? '🚀 Actualización disponible' : '✅ Al día'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {updateInfo.hasUpdate ? (
          <>
            <div className={styles.versionInfo}>
              <span className={styles.versionBadge}>v{updateInfo.currentVersion}</span>
              <span className={styles.arrow}>→</span>
              <span className={`${styles.versionBadge} ${styles.newVersion}`}>
                {updateInfo.latestVersion}
              </span>
            </div>

            {updateInfo.releaseNotes && (
              <div className={styles.notes}>
                {updateInfo.releaseNotes}
              </div>
            )}

            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={onClose}>
                Ahora no
              </button>
              <button className={styles.btnPrimary} onClick={onUpdate}>
                Actualizar ahora
              </button>
            </div>
          </>
        ) : (
          <p className={styles.upToDate}>
            Tienes la versión más reciente ({updateInfo.currentVersion}).
          </p>
        )}
      </div>
    </div>
  )
}
