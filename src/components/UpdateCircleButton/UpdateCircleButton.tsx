import { RotateCw } from 'lucide-react'
import styles from './UpdateCircleButton.module.css'

export interface UpdateCircleButtonProps {
  checking: boolean
  onClick: () => void
  hasUpdateAvailable?: boolean
  className?: string
}

export function UpdateCircleButton({
  checking,
  onClick,
  hasUpdateAvailable = false,
  className = '',
}: UpdateCircleButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.circleBtn} ${className}`}
      onClick={onClick}
      disabled={checking}
      aria-label="Buscar actualizaciones"
      title="Buscar actualizaciones"
    >
      <span className={checking ? styles.spin : styles.iconWrapper}>
        <RotateCw size={17} strokeWidth={2.2} />
      </span>
      {hasUpdateAvailable && <span className={styles.dotBadge} aria-label="Actualización disponible" />}
    </button>
  )
}
