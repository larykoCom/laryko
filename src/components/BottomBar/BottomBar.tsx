import type { ReactNode } from 'react'
import { Home, Calculator as CalculatorIcon } from 'lucide-react'
import { GlassEffectContainer } from '@/components/GlassEffectContainer'
import { triggerNativeHaptic } from '@/utils/nativeIOSBridge'
import type { Platform } from '@/types'
import styles from './BottomBar.module.css'

export type ActiveTool = 'home' | 'calculator'

export interface NavItemConfig {
  id: ActiveTool
  label: string
  icon: ReactNode
  badge?: string
}

export interface BottomBarProps {
  activeTool: ActiveTool
  onSelectTool: (tool: ActiveTool) => void
  platform?: Platform
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', label: 'Inicio', icon: <Home size={20} strokeWidth={2.2} /> },
  { id: 'calculator', label: 'Calculadora', icon: <CalculatorIcon size={20} strokeWidth={2.2} /> },
]

export function BottomBar({ activeTool, onSelectTool, platform = 'web' }: BottomBarProps) {
  const handleSelect = (toolId: ActiveTool) => {
    triggerNativeHaptic('selection')
    onSelectTool(toolId)
  }

  return (
    <div className={styles.bottomBarWrapper}>
      <GlassEffectContainer
        as="nav"
        platform={platform}
        variant="dock"
        className={styles.bottomBar}
        aria-label="Barra de herramientas principal"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTool === item.id
          return (
            <button
              key={item.id}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              type="button"
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
            </button>
          )
        })}
      </GlassEffectContainer>
    </div>
  )
}
