import { db } from '@/db'
import { useLiveQuery } from 'dexie-react-hooks'

export function useCounter() {
  const counter = useLiveQuery(
    () => db.counter.get(1),
    []
  )

  const value = counter?.value ?? 0

  const increment = async () => {
    const existing = await db.counter.get(1)
    if (existing) {
      await db.counter.update(1, { value: existing.value + 1, updatedAt: new Date() })
    } else {
      await db.counter.put({ id: 1, value: 1, updatedAt: new Date() })
    }
  }

  const decrement = async () => {
    const existing = await db.counter.get(1)
    if (existing && existing.value > 0) {
      await db.counter.update(1, { value: existing.value - 1, updatedAt: new Date() })
    }
  }

  const reset = async () => {
    await db.counter.put({ id: 1, value: 0, updatedAt: new Date() })
  }

  return { value, increment, decrement, reset }
}
