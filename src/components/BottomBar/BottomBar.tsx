import { useState, useRef, useEffect, type ReactNode } from 'react'
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
  const activeIndex = NAV_ITEMS.findIndex((item) => item.id === activeTool)
  const dockRef = useRef<HTMLElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffsetPx, setDragOffsetPx] = useState<number | null>(null)
  const [lastHapticIndex, setLastHapticIndex] = useState(activeIndex)

  // Sincronizar índice háptico al cambiar la herramienta activa
  useEffect(() => {
    setLastHapticIndex(activeIndex)
  }, [activeIndex])

  const handleSelect = (toolId: ActiveTool) => {
    triggerNativeHaptic('selection')
    onSelectTool(toolId)
  }

  // Métricas del dock para cálculo de arrastre 1:1 en tiempo real
  const getMetrics = () => {
    if (!dockRef.current) return null
    const rect = dockRef.current.getBoundingClientRect()
    const padding = 6
    const gap = 6
    const numTabs = NAV_ITEMS.length
    const tabWidth = (rect.width - 2 * padding - gap * (numTabs - 1)) / numTabs
    const maxOffset = rect.width - 2 * padding - tabWidth
    return { rect, padding, gap, tabWidth, maxOffset }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    const metrics = getMetrics()
    if (!metrics) return
    setIsDragging(true)
    const touchX = e.clientX - metrics.rect.left - metrics.padding
    const initialOffset = Math.max(0, Math.min(metrics.maxOffset, touchX - metrics.tabWidth / 2))
    setDragOffsetPx(initialOffset)
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const metrics = getMetrics()
    if (!metrics) return
    const touchX = e.clientX - metrics.rect.left - metrics.padding
    const currentOffset = Math.max(0, Math.min(metrics.maxOffset, touchX - metrics.tabWidth / 2))
    setDragOffsetPx(currentOffset)

    // Respuesta física háptica al cruzar el umbral entre pestañas con el dedo
    const hoveredIndex = currentOffset > metrics.maxOffset / 2 ? 1 : 0
    if (hoveredIndex !== lastHapticIndex) {
      setLastHapticIndex(hoveredIndex)
      triggerNativeHaptic('selection')
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return
    const metrics = getMetrics()
    setIsDragging(false)
    if (metrics && dragOffsetPx !== null) {
      const snapIndex = dragOffsetPx > metrics.maxOffset / 2 ? 1 : 0
      const targetTool = NAV_ITEMS[snapIndex].id
      if (targetTool !== activeTool) {
        triggerNativeHaptic('selection')
        onSelectTool(targetTool)
      }
    }
    setDragOffsetPx(null)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handlePointerCancel = (e: React.PointerEvent) => {
    setIsDragging(false)
    setDragOffsetPx(null)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  return (
    <div className={styles.bottomBarWrapper}>
      <GlassEffectContainer
        ref={dockRef}
        as="nav"
        platform={platform}
        variant="dock"
        className={styles.bottomBar}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label="Barra de herramientas principal"
      >
        {/* Indicador deslizante de cristal líquido interactivo (Liquid Glass Pill) */}
        <div
          className={`${styles.activeIndicator} ${isDragging ? styles.activeIndicatorDragging : ''}`}
          style={{
            transform:
              dragOffsetPx !== null
                ? `translateX(${dragOffsetPx}px) scale(${isDragging ? '1.06, 0.94' : '1, 1'})`
                : `translateX(calc(${activeIndex * 100}% + ${activeIndex * 6}px))`,
          }}
          aria-hidden="true"
        />

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
