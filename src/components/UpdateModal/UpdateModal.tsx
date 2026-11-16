import { Sparkles, CheckCircle2, X, ArrowRight } from 'lucide-react'
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
            {updateInfo.hasUpdate ? (
              <>
                <Sparkles size={20} color="var(--color-accent)" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Actualización disponible
              </>
            ) : (
              <>
                <CheckCircle2 size={20} color="var(--color-success)" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Al día
              </>
            )}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {updateInfo.hasUpdate ? (
          <>
            <div className={styles.versionInfo}>
              <span className={styles.versionBadge}>v{updateInfo.currentVersion}</span>
              <span className={styles.arrow}>
                <ArrowRight size={14} />
              </span>
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
              <button type="button" className={styles.btnSecondary} onClick={onClose}>
                Ahora no
              </button>
              <button type="button" className={styles.btnPrimary} onClick={onUpdate}>
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
