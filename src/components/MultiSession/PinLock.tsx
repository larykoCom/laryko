import { useState, useEffect, useCallback } from 'react'
import { Lock, ShieldCheck, Delete } from 'lucide-react'
import { triggerNativeHaptic } from '@/utils/nativeIOSBridge'
import styles from './PinLock.module.css'

export interface PinLockProps {
  hasPinSetup: boolean
  configuredLength: 4 | 6
  error: string | null
  isRateLimited: boolean
  lockoutRemainingSec: number
  onVerify: (pin: string) => Promise<boolean>
  onSetup: (pin: string, length: 4 | 6) => Promise<boolean>
}

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

export function PinLock({
  hasPinSetup,
  configuredLength,
  error,
  isRateLimited,
  lockoutRemainingSec,
  onVerify,
  onSetup,
}: PinLockProps) {
  const [setupLength, setSetupLength] = useState<4 | 6>(4)
  const [step, setStep] = useState<'enter' | 'create' | 'confirm'>(hasPinSetup ? 'enter' : 'create')
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const targetLength = hasPinSetup ? configuredLength : setupLength

  useEffect(() => {
    setStep(hasPinSetup ? 'enter' : 'create')
    setPin('')
    setFirstPin('')
    setLocalError(null)
  }, [hasPinSetup])

  const submitPin = useCallback(
    async (completedPin: string) => {
      if (busy || isRateLimited) return
      setBusy(true)
      setLocalError(null)

      try {
        if (step === 'create') {
          setFirstPin(completedPin)
          setPin('')
          setStep('confirm')
          triggerNativeHaptic('selection')
          return
        }

        if (step === 'confirm') {
          if (completedPin !== firstPin) {
            triggerNativeHaptic('error')
            setLocalError('Los PIN no coinciden. Inténtalo de nuevo.')
            setPin('')
            setFirstPin('')
            setStep('create')
            return
          }
          const ok = await onSetup(completedPin, setupLength)
          triggerNativeHaptic(ok ? 'success' : 'error')
          setPin('')
          return
        }

        const ok = await onVerify(completedPin)
        triggerNativeHaptic(ok ? 'success' : 'error')
        if (!ok) {
          setPin('')
        }
      } finally {
        setBusy(false)
      }
    },
    [busy, isRateLimited, step, firstPin, onSetup, setupLength, onVerify]
  )

  const handleDigit = useCallback(
    (digit: string) => {
      if (busy || isRateLimited) return
      triggerNativeHaptic('light')
      setLocalError(null)
      setPin((prev) => {
        if (prev.length >= targetLength) return prev
        const next = prev + digit
        if (next.length === targetLength) {
          setTimeout(() => submitPin(next), 80)
        }
        return next
      })
    },
    [busy, isRateLimited, targetLength, submitPin]
  )

  const handleDelete = useCallback(() => {
    if (busy || isRateLimited) return
    triggerNativeHaptic('light')
    setPin((prev) => prev.slice(0, -1))
  }, [busy, isRateLimited])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) {
        e.preventDefault()
        handleDigit(e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        handleDelete()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleDigit, handleDelete])

  const displayError = localError ?? error
  const title =
    step === 'create'
      ? 'Crear PIN de Seguridad'
      : step === 'confirm'
        ? 'Confirmar PIN'
        : 'Multi-Sesión Bloqueada'

  const subtitle =
    step === 'create'
      ? 'Protege tus cuentas e inicios de sesión con un PIN local.'
      : step === 'confirm'
        ? 'Vuelve a ingresar tu PIN para confirmarlo.'
        : isRateLimited
          ? `Bloqueo temporal activo (${lockoutRemainingSec}s)`
          : 'Ingresa tu PIN para acceder a tus sesiones.'

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.badge}>
          {hasPinSetup ? <Lock size={28} strokeWidth={2.2} /> : <ShieldCheck size={28} strokeWidth={2.2} />}
        </div>

        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>

        {!hasPinSetup && step === 'create' && (
          <div className={styles.lengthSwitch} role="group" aria-label="Longitud del PIN">
            <button
              type="button"
              className={`${styles.lengthBtn} ${setupLength === 4 ? styles.lengthBtnActive : ''}`}
              onClick={() => {
                setSetupLength(4)
                setPin('')
              }}
            >
              4 dígitos
            </button>
            <button
              type="button"
              className={`${styles.lengthBtn} ${setupLength === 6 ? styles.lengthBtnActive : ''}`}
              onClick={() => {
                setSetupLength(6)
                setPin('')
              }}
            >
              6 dígitos
            </button>
          </div>
        )}

        <div className={styles.dotsRow} aria-label="Progreso del PIN">
          {Array.from({ length: targetLength }).map((_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i < pin.length ? styles.dotFilled : ''} ${
                displayError ? styles.dotError : ''
              }`}
            />
          ))}
        </div>

        {displayError && <p className={styles.errorText}>{displayError}</p>}

        <div className={styles.keypad}>
          {KEYPAD.map((item, idx) => {
            if (item === '') {
              return <div key={`empty-${idx}`} className={styles.emptySlot} />
            }
            if (item === 'del') {
              return (
                <button
                  key="del"
                  type="button"
                  className={styles.keyAction}
                  onClick={handleDelete}
                  disabled={busy || isRateLimited || pin.length === 0}
                  aria-label="Borrar dígito"
                >
                  <Delete size={20} strokeWidth={2} />
                </button>
              )
            }
            return (
              <button
                key={item}
                type="button"
                className={styles.keyBtn}
                onClick={() => handleDigit(item)}
                disabled={busy || isRateLimited}
              >
                {item}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
