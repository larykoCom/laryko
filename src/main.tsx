import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import { App } from './App'

// Activa el estado CSS :active y respuesta táctil inmediata en iOS WebKit (Safari / Capacitor)
if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', () => {}, { passive: true })
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
