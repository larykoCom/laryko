import { db } from '@/db'
import { useLiveQuery } from 'dexie-react-hooks'

export function useQuickNote() {
  const note = useLiveQuery(
    async () => {
      const all = await db.notes.toArray()
      return all.length > 0 ? all[all.length - 1] : null
    },
    []
  )

  const saveNote = async (content: string) => {
    if (!content.trim()) return
    const now = new Date()
    const all = await db.notes.toArray()
    if (all.length > 0 && all[0].id) {
      await db.notes.update(all[0].id, { content, updatedAt: now })
    } else {
      await db.notes.add({ content, createdAt: now, updatedAt: now })
    }
  }

  const clearNote = async () => {
    await db.notes.clear()
  }

  return { noteText: note?.content ?? '', saveNote, clearNote }
}
