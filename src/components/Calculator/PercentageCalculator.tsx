import { useState, type ChangeEvent } from 'react'
import { formatNumberWithCommas } from '@/hooks/useCalculator'
import styles from './PercentageCalculator.module.css'

export function PercentageCalculator() {
  // Card 1: ¿Cuánto es el X% de Y?
  const [pct1, setPct1] = useState('')
  const [val1, setVal1] = useState('')

  // Card 2: ¿Qué porcentaje es X de Y?
  const [part2, setPart2] = useState('')
  const [total2, setTotal2] = useState('')

  // Card 3: Aumentar/Disminuir X en Y%
  const [base3, setBase3] = useState('')
  const [pct3, setPct3] = useState('')

  // Sanitizador de entrada numérica sin flechas ni desbordamientos
  const handleNumericChange = (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9.]/g, '')
    const parts = val.split('.')
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('')
    }
    setter(val)
  }

  // Cálculo Card 1
  const calc1 = (): string | null => {
    const p = parseFloat(pct1)
    const v = parseFloat(val1)
    if (isNaN(p) || isNaN(v)) return null
    const res = (p / 100) * v
    return formatNumberWithCommas(res.toFixed(2).replace(/\.00$/, ''))
  }

  // Cálculo Card 2
  const calc2 = (): string | null => {
    const p = parseFloat(part2)
    const t = parseFloat(total2)
    if (isNaN(p) || isNaN(t) || t === 0) return null
    const res = (p / t) * 100
    return `${formatNumberWithCommas(res.toFixed(2).replace(/\.00$/, ''))}%`
  }

  // Cálculo Card 3
  const calc3 = (): { increase: string; decrease: string } | null => {
    const b = parseFloat(base3)
    const p = parseFloat(pct3)
    if (isNaN(b) || isNaN(p)) return null
    const delta = (b * p) / 100
    const inc = b + delta
    const dec = b - delta
    return {
      increase: formatNumberWithCommas(inc.toFixed(2).replace(/\.00$/, '')),
      decrease: formatNumberWithCommas(dec.toFixed(2).replace(/\.00$/, '')),
    }
  }

  const res1 = calc1()
  const res2 = calc2()
  const res3 = calc3()

  return (
    <div className={styles.wrapper}>
      {/* ── Card 1: ¿Cuánto es el X% de Y? ── */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>¿Cuánto es el X% de Y?</h3>
        <div className={styles.inputsRow}>
          <input
            type="text"
            inputMode="decimal"
            className={styles.inputField}
            placeholder="%"
            value={pct1}
            onChange={handleNumericChange(setPct1)}
            aria-label="Porcentaje X"
          />
          <span className={styles.separatorText}>% de</span>
          <input
            type="text"
            inputMode="decimal"
            className={styles.inputField}
            placeholder="Valor"
            value={val1}
            onChange={handleNumericChange(setVal1)}
            aria-label="Valor Y"
          />
        </div>
        <div className={`${styles.resultBox} ${res1 ? styles.resultBoxActive : ''}`}>
          {res1 ? (
            <span className={styles.resultValue}>{res1}</span>
          ) : (
            <span className={styles.resultPlaceholder}>--</span>
          )}
        </div>
      </div>

      {/* ── Card 2: ¿Qué porcentaje es X de Y? ── */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>¿Qué porcentaje es X de Y?</h3>
        <div className={styles.inputsRow}>
          <input
            type="text"
            inputMode="decimal"
            className={styles.inputField}
            placeholder="Parte"
            value={part2}
            onChange={handleNumericChange(setPart2)}
            aria-label="Parte X"
          />
          <span className={styles.separatorText}>de</span>
          <input
            type="text"
            inputMode="decimal"
            className={styles.inputField}
            placeholder="Total"
            value={total2}
            onChange={handleNumericChange(setTotal2)}
            aria-label="Total Y"
          />
        </div>
        <div className={`${styles.resultBox} ${res2 ? styles.resultBoxActive : ''}`}>
          {res2 ? (
            <span className={styles.resultValue}>{res2}</span>
          ) : (
            <span className={styles.resultPlaceholder}>--</span>
          )}
        </div>
      </div>

      {/* ── Card 3: Aumentar/Disminuir X en Y% ── */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Aumentar/Disminuir X en Y%</h3>
        <div className={styles.inputsRow}>
          <input
            type="text"
            inputMode="decimal"
            className={styles.inputField}
            placeholder="Base"
            value={base3}
            onChange={handleNumericChange(setBase3)}
            aria-label="Valor base"
          />
          <span className={styles.separatorText}>±</span>
          <input
            type="text"
            inputMode="decimal"
            className={styles.inputField}
            placeholder="%"
            value={pct3}
            onChange={handleNumericChange(setPct3)}
            aria-label="Porcentaje de cambio"
          />
        </div>
        <div className={`${styles.resultBox} ${res3 ? styles.resultBoxActive : ''}`}>
          {res3 ? (
            <div className={styles.doubleResult}>
              <div className={styles.resultSubItem}>
                <span className={styles.resultSubLabel}>+ Aumento</span>
                <span className={styles.resultSubValPlus}>{res3.increase}</span>
              </div>
              <div className={styles.dividerVertical} />
              <div className={styles.resultSubItem}>
                <span className={styles.resultSubLabel}>− Descuento</span>
                <span className={styles.resultSubValMinus}>{res3.decrease}</span>
              </div>
            </div>
          ) : (
            <span className={styles.resultPlaceholder}>--</span>
          )}
        </div>
      </div>
    </div>
  )
}
