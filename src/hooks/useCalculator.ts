import { useState, useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Calculation } from '@/db'

function roundResult(num: number): string {
  if (isNaN(num)) return 'Error'
  if (!isFinite(num)) return 'Error'
  const rounded = Number(Math.round(Number(num + 'e+10')) + 'e-10')
  if (Math.abs(rounded) > 1e12 || (Math.abs(rounded) < 1e-6 && rounded !== 0)) {
    return rounded.toExponential(4)
  }
  return rounded.toString()
}

export function formatNumberWithCommas(rawString: string): string {
  if (!rawString || rawString === 'Error') return rawString || '0'
  const isNegative = rawString.startsWith('-')
  const clean = isNegative ? rawString.slice(1) : rawString

  const parts = clean.split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const formatted = parts.length > 1 ? `${intPart}.${parts[1]}` : intPart
  return isNegative ? `-${formatted}` : formatted
}

export function useCalculator() {
  const [currentInput, setCurrentInput] = useState<string>('')
  const [firstOperand, setFirstOperand] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [expression, setExpression] = useState<string>('')
  const [displayValue, setDisplayValue] = useState<string>('0')
  const [savedToast, setSavedToast] = useState<boolean>(false)

  // Consulta reactiva del historial desde Dexie.js
  const calculations = useLiveQuery(
    () => db.calculations.orderBy('timestamp').reverse().limit(30).toArray(),
    []
  )
  const history: Calculation[] = calculations ?? []

  // Función interna de cálculo entre dos números
  const calculateResult = useCallback((a: number, b: number, op: string): string => {
    switch (op) {
      case '+':
        return roundResult(a + b)
      case '−':
      case '-':
        return roundResult(a - b)
      case '×':
      case '*':
        return roundResult(a * b)
      case '÷':
      case '/':
        if (b === 0) return 'Error'
        return roundResult(a / b)
      default:
        return roundResult(b)
    }
  }, [])

  // Entrada de dígitos (incluye '0' - '9' y '00')
  const inputDigit = useCallback(
    (digit: string) => {
      setCurrentInput((prev) => {
        let next: string
        if (digit === '00') {
          if (!prev || prev === '0') {
            next = '0'
          } else {
            next = prev + '00'
          }
        } else {
          next = prev === '0' ? digit : prev + digit
        }

        // Si hay una operación en curso, calcular automáticamente en tiempo real
        if (firstOperand !== null && operator !== null) {
          const secondNum = parseFloat(next)
          if (!isNaN(secondNum)) {
            const autoCalc = calculateResult(firstOperand, secondNum, operator)
            setDisplayValue(autoCalc)
            setExpression(`${formatNumberWithCommas(firstOperand.toString())} ${operator} ${formatNumberWithCommas(next)}`)
          }
        } else {
          setDisplayValue(next)
          setExpression('')
        }

        return next
      })
    },
    [firstOperand, operator, calculateResult]
  )

  // Entrada de punto decimal
  const inputDot = useCallback(() => {
    setCurrentInput((prev) => {
      let next: string
      if (!prev) {
        next = '0.'
      } else if (!prev.includes('.')) {
        next = prev + '.'
      } else {
        return prev
      }

      if (firstOperand !== null && operator !== null) {
        setExpression(`${formatNumberWithCommas(firstOperand.toString())} ${operator} ${formatNumberWithCommas(next)}`)
      } else {
        setDisplayValue(next)
      }
      return next
    })
  }, [firstOperand, operator])

  // Establecer operador (+, −, ×, ÷)
  const performOperation = useCallback(
    (nextOp: string) => {
      if (firstOperand === null) {
        const val = currentInput ? parseFloat(currentInput) : parseFloat(displayValue) || 0
        setFirstOperand(val)
        setOperator(nextOp)
        setCurrentInput('')
        setExpression(`${formatNumberWithCommas(val.toString())} ${nextOp}`)
        setDisplayValue(val.toString())
      } else if (operator !== null && currentInput) {
        // Encadenar operaciones: calcular resultado acumulado
        const secondNum = parseFloat(currentInput)
        const computed = calculateResult(firstOperand, secondNum, operator)
        if (computed === 'Error') {
          setDisplayValue('Error')
          setFirstOperand(null)
          setOperator(null)
          setCurrentInput('')
          setExpression('')
          return
        }
        const numVal = parseFloat(computed)
        setFirstOperand(numVal)
        setOperator(nextOp)
        setCurrentInput('')
        setDisplayValue(computed)
        setExpression(`${formatNumberWithCommas(computed)} ${nextOp}`)
      } else {
        // Cambiar simplemente el operador
        setOperator(nextOp)
        setExpression(`${formatNumberWithCommas(firstOperand.toString())} ${nextOp}`)
      }
    },
    [firstOperand, operator, currentInput, displayValue, calculateResult]
  )

  // Botón '=': Guarda en el historial de Dexie.js
  const saveToHistory = useCallback(async () => {
    if (displayValue === 'Error') return

    let exprToSave = expression
    if (!exprToSave && firstOperand !== null && operator !== null && currentInput) {
      exprToSave = `${formatNumberWithCommas(firstOperand.toString())} ${operator} ${formatNumberWithCommas(currentInput)}`
    } else if (!exprToSave) {
      exprToSave = formatNumberWithCommas(displayValue)
    }

    try {
      await db.calculations.add({
        expression: exprToSave,
        result: formatNumberWithCommas(displayValue),
        timestamp: new Date(),
      })
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 1500)
    } catch {
      // IndexedDB fallback
    }

    // El resultado queda como valor base para la siguiente operación
    const finalVal = parseFloat(displayValue) || 0
    setFirstOperand(finalVal)
    setOperator(null)
    setCurrentInput('')
    setExpression(`${exprToSave} =`)
  }, [displayValue, expression, firstOperand, operator, currentInput])

  // Botón AC: Limpiar todo
  const clear = useCallback(() => {
    setCurrentInput('')
    setFirstOperand(null)
    setOperator(null)
    setExpression('')
    setDisplayValue('0')
  }, [])

  // Botón ⌫: Borrar último dígito
  const backspace = useCallback(() => {
    setCurrentInput((prev) => {
      if (!prev || prev.length <= 1) {
        if (firstOperand !== null && operator !== null) {
          setDisplayValue(firstOperand.toString())
          setExpression(`${formatNumberWithCommas(firstOperand.toString())} ${operator}`)
        } else {
          setDisplayValue('0')
          setExpression('')
        }
        return ''
      }
      const next = prev.slice(0, -1)
      if (firstOperand !== null && operator !== null) {
        const secondNum = parseFloat(next)
        if (!isNaN(secondNum)) {
          const autoCalc = calculateResult(firstOperand, secondNum, operator)
          setDisplayValue(autoCalc)
          setExpression(`${formatNumberWithCommas(firstOperand.toString())} ${operator} ${formatNumberWithCommas(next)}`)
        }
      } else {
        setDisplayValue(next)
      }
      return next
    })
  }, [firstOperand, operator, calculateResult])

  // Botón %: Porcentaje rápido
  const percentage = useCallback(() => {
    if (firstOperand !== null && operator !== null && currentInput) {
      // Porcentaje relativo al primer operando: e.g. 200 + 10% = 20
      const pctValue = (firstOperand * parseFloat(currentInput)) / 100
      const formattedPct = roundResult(pctValue)
      setCurrentInput(formattedPct)
      const autoCalc = calculateResult(firstOperand, pctValue, operator)
      setDisplayValue(autoCalc)
      setExpression(`${formatNumberWithCommas(firstOperand.toString())} ${operator} ${formatNumberWithCommas(formattedPct)}`)
    } else {
      // Porcentaje directo: e.g. 50% = 0.5
      const val = parseFloat(displayValue)
      if (!isNaN(val)) {
        const res = roundResult(val / 100)
        setDisplayValue(res)
        setCurrentInput(res)
        setExpression(`${formatNumberWithCommas(displayValue)} %`)
      }
    }
  }, [firstOperand, operator, currentInput, displayValue, calculateResult])

  // Limpiar historial
  const clearHistory = useCallback(async () => {
    try {
      await db.calculations.clear()
    } catch {
      // fallback
    }
  }, [])

  // Restaurar cálculo del historial
  const restoreFromHistory = useCallback((calc: Calculation) => {
    const rawVal = calc.result.replace(/,/g, '')
    setDisplayValue(rawVal)
    setCurrentInput(rawVal)
    setFirstOperand(null)
    setOperator(null)
    setExpression(`${calc.expression} =`)
  }, [])

  // Atajos de teclado en escritorio
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        inputDigit(e.key)
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault()
        inputDot()
      } else if (e.key === '+') {
        e.preventDefault()
        performOperation('+')
      } else if (e.key === '-') {
        e.preventDefault()
        performOperation('−')
      } else if (e.key === '*') {
        e.preventDefault()
        performOperation('×')
      } else if (e.key === '/') {
        e.preventDefault()
        performOperation('÷')
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault()
        saveToHistory()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        backspace()
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        e.preventDefault()
        clear()
      } else if (e.key === '%') {
        e.preventDefault()
        percentage()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inputDigit, inputDot, performOperation, saveToHistory, backspace, clear, percentage])

  return {
    display: displayValue,
    formattedDisplay: formatNumberWithCommas(displayValue),
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
  }
}
