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
  icon?: string
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

export interface UserVaultRecord {
  id: number // siempre 1 (singleton)
  salt: string
  iv: string
  ciphertext: string
  updatedAt: Date
}

export type NotificationSoundPreset = 'chime' | 'bell' | 'alarm' | 'siren' | 'soft' | 'custom' | 'mute'

export interface CustomAudioRecord {
  id: number // siempre 1 (singleton)
  name: string
  mimeType: string
  data: ArrayBuffer
  updatedAt: Date
}

export interface UserPreferences {
  id: number // siempre 1 (singleton)
  displayName: string
  idleSleepMinutes: number
  autoSync: boolean
  pendingSync?: boolean
  soundPreset?: NotificationSoundPreset
  soundVolume?: number // 0 - 100
  alarmVolume?: number // 0 - 100 (default 100)
  lastSyncAt: Date | null
  updatedAt: Date
}

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
export type RecurrenceUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'

export interface ReminderItem {
  id?: number
  uuid: string
  title: string
  notes: string
  dueAt: Date
  completed: boolean
  notifyNative: boolean
  notifyEmail: boolean
  persistent?: boolean
  isAlarm?: boolean
  recurrence?: ReminderRecurrence
  recurrenceInterval?: number
  recurrenceUnit?: RecurrenceUnit
  soundPreset?: NotificationSoundPreset | 'default'
  notifiedNative?: boolean
  notifiedEmail?: boolean
  lastNotifiedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export type AppNotificationCategory = 'due' | 'missed' | 'upcoming'

export interface AppNotification {
  id?: number
  uuid: string
  reminderUuid?: string
  title: string
  body: string
  category: AppNotificationCategory
  read: boolean
  scheduledAt: Date
  createdAt: Date
}

export class LarykoDB extends Dexie {
  notes!: EntityTable<Note, 'id'>
  counter!: EntityTable<Counter, 'id'>
  calculations!: EntityTable<Calculation, 'id'>
  sessionGroups!: EntityTable<SessionGroup, 'id'>
  sessions!: EntityTable<WebSession, 'id'>
  pinConfig!: EntityTable<PinConfig, 'id'>
  userVault!: EntityTable<UserVaultRecord, 'id'>
  userPrefs!: EntityTable<UserPreferences, 'id'>
  reminders!: EntityTable<ReminderItem, 'id'>
  notifications!: EntityTable<AppNotification, 'id'>
  customAudio!: EntityTable<CustomAudioRecord, 'id'>

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
    this.version(4).stores({
      notes: '++id, createdAt',
      counter: 'id',
      calculations: '++id, timestamp',
      sessionGroups: '++id, order, createdAt',
      sessions: '++id, &uuid, groupId, status, lastActiveAt',
      pinConfig: 'id',
      userVault: 'id',
      userPrefs: 'id',
    })
    this.version(5).stores({
      notes: '++id, createdAt',
      counter: 'id',
      calculations: '++id, timestamp',
      sessionGroups: '++id, order, createdAt',
      sessions: '++id, &uuid, groupId, status, lastActiveAt',
      pinConfig: 'id',
      userVault: 'id',
      userPrefs: 'id',
      reminders: '++id, &uuid, dueAt, completed, updatedAt',
    })
    this.version(6).stores({
      notes: '++id, createdAt',
      counter: 'id',
      calculations: '++id, timestamp',
      sessionGroups: '++id, order, createdAt',
      sessions: '++id, &uuid, groupId, status, lastActiveAt',
      pinConfig: 'id',
      userVault: 'id',
      userPrefs: 'id',
      reminders: '++id, &uuid, dueAt, completed, updatedAt',
      notifications: '++id, &uuid, reminderUuid, read, category, createdAt',
    })
    this.version(7).stores({
      notes: '++id, createdAt',
      counter: 'id',
      calculations: '++id, timestamp',
      sessionGroups: '++id, order, createdAt',
      sessions: '++id, &uuid, groupId, status, lastActiveAt',
      pinConfig: 'id',
      userVault: 'id',
      userPrefs: 'id',
      reminders: '++id, &uuid, dueAt, completed, updatedAt',
      notifications: '++id, &uuid, reminderUuid, read, category, createdAt',
      customAudio: 'id',
    })
  }
}

export const db = new LarykoDB()
