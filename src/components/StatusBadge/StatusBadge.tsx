import styles from './StatusBadge.module.css'

interface StatusBadgeProps {
  isOnline: boolean
}

export function StatusBadge({ isOnline }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${isOnline ? styles.online : styles.offline}`}>
      <span className={styles.dot} />
      {isOnline ? 'Online' : 'Offline'}
    </span>
  )
}
