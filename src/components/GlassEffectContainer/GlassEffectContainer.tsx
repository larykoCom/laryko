import React, { forwardRef, type HTMLAttributes } from 'react'
import type { Platform } from '@/types'
import styles from './GlassEffectContainer.module.css'

export interface GlassEffectContainerProps extends HTMLAttributes<HTMLElement> {
  platform?: Platform
  variant?: 'dock' | 'card' | 'custom'
  as?: 'div' | 'nav' | 'aside' | 'header' | 'footer' | 'section'
}

export const GlassEffectContainer = forwardRef<HTMLElement, GlassEffectContainerProps>(
  ({ children, platform = 'web', variant = 'dock', as = 'div', className, ...props }, ref) => {
    const Component = as as React.ElementType
    const isIOS = platform === 'ios'
    const glassStyle = isIOS ? styles.iosGlass : styles.multiGlass
    const variantStyle = variant === 'dock' ? styles.dock : variant === 'card' ? styles.card : ''

    const combinedClassName = [
      styles.glassContainer,
      glassStyle,
      variantStyle,
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <Component ref={ref} className={combinedClassName} {...props}>
        {children}
      </Component>
    )
  }
)

GlassEffectContainer.displayName = 'GlassEffectContainer'
