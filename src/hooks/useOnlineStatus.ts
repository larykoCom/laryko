import { useState, useEffect } from 'react'

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Capacitor network listener (si está disponible)
    let removeCapacitorListener: (() => void) | undefined
    async function setupCapacitorNetwork() {
      try {
        const { Network } = await import('@capacitor/network')
        const listener = await Network.addListener('networkStatusChange', (status) => {
          setIsOnline(status.connected)
        })
        removeCapacitorListener = () => listener.remove()
      } catch {
        // No es Capacitor, ignorar
      }
    }
    setupCapacitorNetwork()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      removeCapacitorListener?.()
    }
  }, [])

  return isOnline
}
