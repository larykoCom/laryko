import { useState } from 'react'
import {
  Menu,
  Delete,
  Trash2,
  Copy,
  Check,
} from 'lucide-react'
import { useCalculator } from '@/hooks/useCalculator'
import { PercentageCalculator } from './PercentageCalculator'
import type { Platform } from '@/types'
import styles from './Calculator.module.css'

export interface CalculatorProps {
  platform?: Platform
}

export function Calculator({ }: CalculatorProps) {
  const [tab, setTab] = useState<'calc' | 'percentages'>('calc')
  const [showHistory, setShowHistory] = useState(false)
  const [copied, setCopied] = useState(false)

  const {
    formattedDisplay,
    expression,
    history,
    savedToast,
    inputDigit,
    inputDot,
    performOperation,
    saveToHistory,
    clear,
    backspace,
    percentage,
    clearHistory,
    restoreFromHistory,
  } = useCalculator()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedDisplay)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // fallback
    }
  }

  return (
    <div className={styles.calculatorWrapper}>
      {/* ── Barra de Tabs Superior: [Calculadora] [☰] [Porcentajes] ── */}
      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === 'calc' ? styles.tabBtnActive : ''}`}
          onClick={() => {
            setTab('calc')
            setShowHistory(false)
          }}
        >
          Calculadora
        </button>

        <button
          type="button"
          className={`${styles.historyToggleBtn} ${showHistory ? styles.historyToggleBtnActive : ''}`}
          onClick={() => setShowHistory(!showHistory)}
          aria-label="Abrir historial de cálculos"
          title="Historial de cálculos"
        >
          <Menu size={20} strokeWidth={2.4} />
          {history.length > 0 && <span className={styles.badgeCount}>{history.length}</span>}
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${tab === 'percentages' ? styles.tabBtnActive : ''}`}
          onClick={() => {
            setTab('percentages')
            setShowHistory(false)
          }}
        >
          Porcentajes
        </button>
      </div>

      {/* ── Panel Desplegable de Historial ── */}
      {showHistory && (
        <div className={styles.historyPanel}>
          <div className={styles.historyHeader}>
            <span>Historial de Cálculos (Offline)</span>
            {history.length > 0 && (
              <button
                type="button"
                className={styles.clearHistBtn}
                onClick={clearHistory}
              >
                <Trash2 size={13} />
                Limpiar
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className={styles.emptyHistory}>No hay cálculos guardados aún.</p>
          ) : (
            <ul className={styles.historyList}>
              {history.map((item) => (
                <li
                  key={item.id}
                  className={styles.historyItem}
                  onClick={() => {
                    restoreFromHistory(item)
                    setShowHistory(false)
                    setTab('calc')
                  }}
                  title="Tocar para reutilizar cálculo"
                >
                  <span className={styles.histExpr}>{item.expression}</span>
                  <span className={styles.histResult}>{item.result}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Vista Condicional: Calculadora Estándar vs Porcentajes ── */}
      {tab === 'calc' ? (
        <>
          {/* ── Pantalla de Visualización (con cálculo automático y formato moneda) ── */}
          <div className={styles.screenCard}>
            {savedToast && <span className={styles.toastSaved}>✓ Guardado en historial</span>}
            <button
              type="button"
              className={styles.copyActionBtn}
              onClick={handleCopy}
              title="Copiar resultado"
            >
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <div className={styles.expressionText}>{expression || '\u00A0'}</div>
            <div className={styles.resultText}>{formattedDisplay}</div>
          </div>

          {/* ── Teclado (4x5) con botón 00, operadores naranja y slate ── */}
          <div className={styles.keypad}>
            {/* Fila 1 */}
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyFunction}`}
              onClick={clear}
              aria-label="Limpiar todo"
            >
              AC
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyFunction}`}
              onClick={backspace}
              aria-label="Borrar dígito"
            >
              <Delete size={22} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyFunction}`}
              onClick={percentage}
              aria-label="Porcentaje"
            >
              %
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyOperator}`}
              onClick={() => performOperation('÷')}
              aria-label="Dividir"
            >
              ÷
            </button>

            {/* Fila 2 */}
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyNumber}`}
              onClick={() => inputDigit('7')}
            >
              7
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyNumber}`}
              onClick={() => inputDigit('8')}
            >
              8
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyNumber}`}
              onClick={() => inputDigit('9')}
            >
              9
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyOperator}`}
              onClick={() => performOperation('×')}
              aria-label="Multiplicar"
            >
              ×
            </button>

            {/* Fila 3 */}
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyNumber}`}
              onClick={() => inputDigit('4')}
            >
              4
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyNumber}`}
              onClick={() => inputDigit('5')}
            >
              5
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyNumber}`}
              onClick={() => inputDigit('6')}
            >
              6
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyOperator}`}
              onClick={() => performOperation('−')}
              aria-label="Restar"
            >
              −
            </button>

            {/* Fila 4 */}
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyNumber}`}
              onClick={() => inputDigit('1')}
            >
              1
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyNumber}`}
              onClick={() => inputDigit('2')}
            >
              2
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyNumber}`}
              onClick={() => inputDigit('3')}
            >
              3
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyOperator}`}
              onClick={() => performOperation('+')}
              aria-label="Sumar"
            >
              +
            </button>

            {/* Fila 5: 0, 00, ., = (Guarda en historial) */}
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyNumber}`}
              onClick={() => inputDigit('0')}
            >
              0
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyNumber}`}
              onClick={() => inputDigit('00')}
              aria-label="Doble cero"
            >
              00
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyNumber}`}
              onClick={inputDot}
              aria-label="Punto decimal"
            >
              .
            </button>
            <button
              type="button"
              className={`${styles.keyBtn} ${styles.keyOperator}`}
              onClick={saveToHistory}
              aria-label="Guardar en historial"
              title="Guardar en historial"
            >
              =
            </button>
          </div>
        </>
      ) : (
        <PercentageCalculator />
      )}
    </div>
  )
}
