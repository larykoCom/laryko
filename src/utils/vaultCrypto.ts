const VAULT_PBKDF2_ITERATIONS = 100_000

export type AiProviderId = 'openai' | 'anthropic' | 'gemini' | 'custom'

export interface UserIntegrationsVault {
  neonDatabaseUrl: string
  resendApiKey: string
  resendFromEmail: string
  resendToEmail: string
  r2AccountId: string
  r2AccessKeyId: string
  r2SecretAccessKey: string
  r2BucketName: string
  googleDriveClientId: string
  dropboxAppKey: string
  aiDefaultProvider: AiProviderId
  openaiApiKey: string
  openaiModel: string
  anthropicApiKey: string
  anthropicModel: string
  geminiApiKey: string
  geminiModel: string
  customAiBaseUrl: string
  customAiApiKey: string
  customAiModel: string
}

export const EMPTY_VAULT: UserIntegrationsVault = {
  neonDatabaseUrl: '',
  resendApiKey: '',
  resendFromEmail: 'Laryko <onboarding@resend.dev>',
  resendToEmail: '',
  r2AccountId: '',
  r2AccessKeyId: '',
  r2SecretAccessKey: '',
  r2BucketName: '',
  googleDriveClientId: '',
  dropboxAppKey: '',
  aiDefaultProvider: 'openai',
  openaiApiKey: '',
  openaiModel: '',
  anthropicApiKey: '',
  anthropicModel: '',
  geminiApiKey: '',
  geminiModel: '',
  customAiBaseUrl: '',
  customAiApiKey: '',
  customAiModel: '',
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64.trim())
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: VAULT_PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export interface EncryptedVaultEnvelope {
  v: 1
  salt: string
  iv: string
  ciphertext: string
}

export async function encryptVault(
  vault: UserIntegrationsVault,
  passphrase: string
): Promise<EncryptedVaultEnvelope> {
  const salt = new Uint8Array(16)
  const iv = new Uint8Array(12)
  crypto.getRandomValues(salt)
  crypto.getRandomValues(iv)

  const key = await deriveAesKey(passphrase, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(vault))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plaintext
  )

  return {
    v: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
  }
}

export async function decryptVault(
  envelope: EncryptedVaultEnvelope,
  passphrase: string
): Promise<UserIntegrationsVault> {
  const salt = fromBase64(envelope.salt)
  const iv = fromBase64(envelope.iv)
  const ciphertext = fromBase64(envelope.ciphertext)

  const key = await deriveAesKey(passphrase, salt)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  )

  const parsed = JSON.parse(new TextDecoder().decode(decrypted)) as Partial<UserIntegrationsVault>
  return { ...EMPTY_VAULT, ...parsed }
}

export interface SyncedPreferences {
  displayName: string
  idleSleepMinutes: number
  autoSync: boolean
}

export interface SyncedSessionGroup {
  id?: number
  name: string
  color: string
  order: number
}

export interface SyncedWebSession {
  uuid: string
  groupId: number
  name: string
  url: string
  color: string
  order?: number
}

export interface SyncedReminder {
  uuid: string
  title: string
  notes: string
  dueAt: string
  completed: boolean
  notifyNative: boolean
  notifyEmail: boolean
  persistent?: boolean
  isAlarm?: boolean
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  recurrenceInterval?: number
  recurrenceUnit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
  soundPreset?: string
  updatedAt: string
}

export interface FullSyncBundle {
  v: 2
  updatedAtMs?: number
  vault: UserIntegrationsVault
  prefs?: SyncedPreferences
  sessionGroups?: SyncedSessionGroup[]
  sessions?: SyncedWebSession[]
  reminders?: SyncedReminder[]
}

export async function encryptSyncBundle(
  bundle: FullSyncBundle,
  passphrase: string
): Promise<EncryptedVaultEnvelope> {
  const salt = new Uint8Array(16)
  const iv = new Uint8Array(12)
  crypto.getRandomValues(salt)
  crypto.getRandomValues(iv)

  const key = await deriveAesKey(passphrase, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(bundle))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plaintext
  )

  return {
    v: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
  }
}

export async function decryptSyncBundle(
  envelope: EncryptedVaultEnvelope,
  passphrase: string
): Promise<FullSyncBundle> {
  const salt = fromBase64(envelope.salt)
  const iv = fromBase64(envelope.iv)
  const ciphertext = fromBase64(envelope.ciphertext)

  const key = await deriveAesKey(passphrase, salt)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  )

  const raw = JSON.parse(new TextDecoder().decode(decrypted)) as
    | Partial<FullSyncBundle>
    | Partial<UserIntegrationsVault>

  if ('v' in raw && raw.v === 2 && raw.vault) {
    return {
      v: 2,
      updatedAtMs: raw.updatedAtMs,
      vault: { ...EMPTY_VAULT, ...raw.vault },
      prefs: raw.prefs,
      sessionGroups: raw.sessionGroups,
      sessions: raw.sessions,
      reminders: raw.reminders,
    }
  }

  return {
    v: 2,
    vault: { ...EMPTY_VAULT, ...(raw as Partial<UserIntegrationsVault>) },
  }
}

export function encodePairingToken(envelope: EncryptedVaultEnvelope): string {
  const json = JSON.stringify(envelope)
  const bytes = new TextEncoder().encode(json)
  return `LARYKO-SYNC:1:${toBase64(bytes)}`
}

export function decodePairingToken(token: string): EncryptedVaultEnvelope | null {
  const trimmed = token.trim()
  if (!trimmed.startsWith('LARYKO-SYNC:1:')) return null
  try {
    const b64 = trimmed.slice('LARYKO-SYNC:1:'.length)
    const json = new TextDecoder().decode(fromBase64(b64))
    const parsed = JSON.parse(json) as Partial<EncryptedVaultEnvelope>
    if (parsed.v === 1 && parsed.salt && parsed.iv && parsed.ciphertext) {
      return parsed as EncryptedVaultEnvelope
    }
    return null
  } catch {
    return null
  }
}
