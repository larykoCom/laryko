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

export interface Calculation {
  id?: number
  expression: string
  result: string
  timestamp: Date
}

export interface SessionGroup {
  id?: number
  name: string
  color: string
  order: number
  createdAt: Date
}

export type SessionStatus = 'active' | 'sleeping'

export interface WebSession {
  id?: number
  uuid: string
  groupId: number
  name: string
  url: string
  color: string
  order?: number
  status: SessionStatus
  lastActiveAt: Date
  createdAt: Date
}

export interface PinConfig {
  id: number // siempre 1 (singleton)
  hash: string
  salt: string
  iterations: number
  pinLength: 4 | 6
  failedAttempts: number
  lockedUntil: number | null
  autoLockMinutes: number
  updatedAt: Date
}

export class LarykoDB extends Dexie {
  notes!: EntityTable<Note, 'id'>
  counter!: EntityTable<Counter, 'id'>
  calculations!: EntityTable<Calculation, 'id'>
  sessionGroups!: EntityTable<SessionGroup, 'id'>
  sessions!: EntityTable<WebSession, 'id'>
  pinConfig!: EntityTable<PinConfig, 'id'>

  constructor() {
    super('LarykoDB')
    this.version(1).stores({
      notes: '++id, createdAt',
      counter: 'id',
    })
    this.version(2).stores({
      notes: '++id, createdAt',
      counter: 'id',
      calculations: '++id, timestamp',
    })
    this.version(3).stores({
      notes: '++id, createdAt',
      counter: 'id',
      calculations: '++id, timestamp',
      sessionGroups: '++id, order, createdAt',
      sessions: '++id, &uuid, groupId, status, lastActiveAt',
      pinConfig: 'id',
    })
  }
}

export const db = new LarykoDB()
