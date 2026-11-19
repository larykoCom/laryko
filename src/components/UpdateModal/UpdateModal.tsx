import { Sparkles, CheckCircle2, X, ArrowRight, DownloadCloud } from 'lucide-react'
import type { UpdateInfo } from '@/types'
import type { DownloadProgress } from '@/hooks/useAppUpdater'
import styles from './UpdateModal.module.css'

interface UpdateModalProps {
  updateInfo: UpdateInfo
  isDownloading?: boolean
  downloadProgress?: DownloadProgress | null
  onUpdate: () => void
  onClose: () => void
}

export function UpdateModal({
  updateInfo,
  isDownloading = false,
  downloadProgress = null,
  onUpdate,
  onClose,
}: UpdateModalProps) {
  return (
    <div className={styles.overlay} onClick={() => !isDownloading && onClose()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isDownloading ? (
              <>
                <DownloadCloud size={20} color="var(--color-accent)" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Descargando actualización
              </>
            ) : updateInfo.hasUpdate ? (
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
          {!isDownloading && (
            <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          )}
        </div>

        {isDownloading ? (
          <div className={styles.downloadContainer}>
            <div className={styles.downloadHeader}>
              <span className={styles.downloadTitle}>
                {downloadProgress && downloadProgress.percentage >= 100
                  ? 'Descarga completa. Abriendo instalador...'
                  : 'Descargando paquetes del sistema...'}
              </span>
              <span className={styles.downloadPercent}>
                {Math.round(downloadProgress?.percentage ?? 0)}%
              </span>
            </div>

            <div className={styles.progressBarBg}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${Math.min(100, downloadProgress?.percentage ?? 0)}%` }}
              />
            </div>

            <div className={styles.downloadDetails}>
              <span>
                {downloadProgress?.total && downloadProgress.total > 0
                  ? `${(downloadProgress.downloaded / (1024 * 1024)).toFixed(1)} MB de ${(downloadProgress.total / (1024 * 1024)).toFixed(1)} MB`
                  : 'Conectando con el servidor...'}
              </span>
              <span className={styles.pulseDot} />
            </div>
          </div>
        ) : updateInfo.hasUpdate ? (
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
