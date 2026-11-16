import Dexie, { type EntityTable } from 'dexie'

export interface Note {
  id?: number
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface Counter {
  id: number  // siempre 1 (singleton)
  value: number
  updatedAt: Date
}

export class LarykoDB extends Dexie {
  notes!: EntityTable<Note, 'id'>
  counter!: EntityTable<Counter, 'id'>

  constructor() {
    super('LarykoDB')
    this.version(1).stores({
      notes: '++id, createdAt',
      counter: 'id',
    })
  }
}

export const db = new LarykoDB()
