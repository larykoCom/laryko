import type { Platform } from '@/types'
import type { MediaCategory } from '@/db/laryko.db'
import type { StorageAccount } from '@/utils/vaultCrypto'

function isTauri(platform: Platform): boolean {
  return (
    (platform === 'macos' || platform === 'windows' || platform === 'linux') &&
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in window
  )
}

async function executeNeonSqlWeb(
  databaseUrl: string,
  query: string,
  queryParams: unknown[] = []
): Promise<Record<string, unknown>> {
  const parsed = new URL(databaseUrl.trim())
  const res = await fetch(`https://${parsed.hostname}/sql`, {
    method: 'POST',
    headers: {
      'Neon-Connection-String': databaseUrl.trim(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, params: queryParams }),
  })
  if (!res.ok) throw new Error(`Neon HTTP ${res.status}`)
  return (await res.json()) as Record<string, unknown>
}

export const integrationsBridge = {
  async testNeonConnection(platform: Platform, databaseUrl: string): Promise<string> {
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string>('test_neon_connection', { databaseUrl })
    }
    // Fallback HTTP serverless Neon en móvil/web
    const parsed = new URL(databaseUrl.trim())
    const res = await fetch(`https://${parsed.hostname}/sql`, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': databaseUrl.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'SELECT 1 AS ok;', params: [] }),
    })
    if (!res.ok) {
      throw new Error(`Neon respondió HTTP ${res.status}`)
    }
    return 'Conexión exitosa con Neon Postgres.'
  },

  async syncVaultToNeon(
    platform: Platform,
    databaseUrl: string,
    encryptedPayload: string
  ): Promise<string> {
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string>('sync_vault_to_neon', { databaseUrl, encryptedPayload })
    }
    const parsed = new URL(databaseUrl.trim())
    const runSql = async (query: string, params: unknown[] = []) => {
      const res = await fetch(`https://${parsed.hostname}/sql`, {
        method: 'POST',
        headers: {
          'Neon-Connection-String': databaseUrl.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, params }),
      })
      if (!res.ok) throw new Error(`Neon HTTP ${res.status}`)
      return res.json()
    }
    await runSql(
      'CREATE TABLE IF NOT EXISTS laryko_vault (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());'
    )
    await runSql(
      'INSERT INTO laryko_vault (id, payload, updated_at) VALUES (1, $1, NOW()) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW();',
      [encryptedPayload]
    )
    return 'Bóveda cifrada sincronizada en Neon Postgres.'
  },

  async pullVaultFromNeon(platform: Platform, databaseUrl: string): Promise<string | null> {
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string | null>('pull_vault_from_neon', { databaseUrl })
    }
    const parsed = new URL(databaseUrl.trim())
    const res = await fetch(`https://${parsed.hostname}/sql`, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': databaseUrl.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'SELECT payload FROM laryko_vault WHERE id = 1 LIMIT 1;',
        params: [],
      }),
    })
    if (!res.ok) throw new Error(`Neon HTTP ${res.status}`)
    const data = (await res.json()) as { rows?: Array<{ payload?: string }> }
    return data.rows?.[0]?.payload ?? null
  },

  async registerNeonAccount(
    platform: Platform,
    params: {
      databaseUrl: string
      username: string
      email: string
      passwordSalt: string
      passwordHash: string
      encryptedVault: string
    }
  ): Promise<string> {
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string>('register_neon_account', params)
    }

    await executeNeonSqlWeb(
      params.databaseUrl,
      'CREATE TABLE IF NOT EXISTS laryko_accounts (id SERIAL PRIMARY KEY, username TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, encrypted_vault TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());'
    )
    await executeNeonSqlWeb(
      params.databaseUrl,
      'INSERT INTO laryko_accounts (username, email, password_salt, password_hash, encrypted_vault, updated_at) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, password_salt = EXCLUDED.password_salt, password_hash = EXCLUDED.password_hash, encrypted_vault = EXCLUDED.encrypted_vault, updated_at = NOW();',
      [
        params.username.trim(),
        params.email.trim().toLowerCase(),
        params.passwordSalt,
        params.passwordHash,
        params.encryptedVault,
      ]
    )
    return 'Cuenta guardada de forma segura en Neon Postgres.'
  },

  async fetchNeonAccount(
    platform: Platform,
    databaseUrl: string,
    identifier: string
  ): Promise<{
    username: string
    email: string
    password_salt: string
    password_hash: string
    encrypted_vault: string
  } | null> {
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke('fetch_neon_account', { databaseUrl, identifier })
    }

    const data = (await executeNeonSqlWeb(
      databaseUrl,
      'SELECT username, email, password_salt, password_hash, encrypted_vault FROM laryko_accounts WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1;',
      [identifier.trim()]
    )) as {
      rows?: Array<{
        username?: string
        email?: string
        password_salt?: string
        password_hash?: string
        encrypted_vault?: string
      }>
    }
    const row = data.rows?.[0]
    if (!row?.email || !row.password_hash || !row.encrypted_vault) return null
    return {
      username: row.username ?? '',
      email: row.email,
      password_salt: row.password_salt ?? '',
      password_hash: row.password_hash,
      encrypted_vault: row.encrypted_vault,
    }
  },

  async deleteNeonAccount(
    platform: Platform,
    databaseUrl: string,
    email?: string
  ): Promise<string> {
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string>('delete_neon_account', { databaseUrl, email })
    }
    if (email?.trim()) {
      await executeNeonSqlWeb(
        databaseUrl,
        'DELETE FROM laryko_accounts WHERE LOWER(email) = LOWER($1);',
        [email.trim().toLowerCase()]
      ).catch(() => {})
    }
    await executeNeonSqlWeb(databaseUrl, 'DELETE FROM laryko_vault WHERE id = 1;').catch(() => {})
    return 'Cuenta y bóveda eliminadas de la base de datos.'
  },

  async sendResendEmail(
    platform: Platform,
    apiKey: string,
    fromEmail: string,
    toEmail: string,
    subject: string,
    html: string,
    provider: string = '',
    customEndpoint: string = ''
  ): Promise<string> {
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string>('send_resend_email', {
        provider: provider || null,
        customEndpoint: customEndpoint || null,
        apiKey,
        fromEmail,
        toEmail,
        subject,
        html,
      })
    }

    let parsed: URL
    try {
      parsed = new URL(customEndpoint.trim())
    } catch {
      throw new Error('URL del Endpoint Email API inválida.')
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('El endpoint debe usar https:// o http://.')
    }

    const cleanKey = apiKey.trim()
    const cleanTo = toEmail.trim()
    const from = fromEmail.trim() || cleanTo
    const label = provider.trim() || 'Email API'

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (cleanKey) {
      headers.Authorization = `Bearer ${cleanKey}`
    }

    const res = await fetch(parsed.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from,
        to: [cleanTo],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      throw new Error(`${label} respondió HTTP ${res.status}`)
    }
    return `Correo enviado correctamente vía ${label}.`
  },

  async testResendConnection(
    platform: Platform,
    apiKey: string,
    fromEmail: string,
    toEmail: string,
    provider: string = '',
    customEndpoint: string = ''
  ): Promise<string> {
    const label = provider.trim() || 'Email API'
    return this.sendResendEmail(
      platform,
      apiKey,
      fromEmail,
      toEmail,
      `Laryko — Prueba de conexión (${label})`,
      `<p>Tu integración de correo con <strong>${label}</strong> en Laryko está funcionando correctamente.</p>`,
      label,
      customEndpoint
    )
  },

  async testR2Endpoint(
    platform: Platform,
    accountId: string,
    bucketName: string
  ): Promise<string> {
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string>('test_r2_endpoint', { accountId, bucketName })
    }
    return 'Configuración R2 guardada (la verificación TLS directa está disponible en Escritorio).'
  },

  async testAiProvider(
    platform: Platform,
    provider: 'openai' | 'anthropic' | 'gemini' | 'custom',
    apiKey: string,
    baseUrl?: string
  ): Promise<string> {
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string>('test_ai_provider', { provider, apiKey, baseUrl })
    }
    const models = await this.listAiModels(platform, provider, apiKey, baseUrl)
    return models.length > 0
      ? `Conexión verificada con ${provider} (${models.length} modelos disponibles).`
      : `API Key guardada en bóveda cifrada.`
  },

  async listAiModels(
    platform: Platform,
    provider: 'openai' | 'anthropic' | 'gemini' | 'custom',
    apiKey: string,
    baseUrl?: string
  ): Promise<string[]> {
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string[]>('list_ai_models', { provider, apiKey, baseUrl })
    }

    const key = apiKey.trim()
    if (provider === 'gemini') {
      if (!key) throw new Error('La API Key de Google Gemini es obligatoria.')
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': key },
      })
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
      const json = (await res.json()) as {
        models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>
      }
      return Array.from(
        new Set(
          (json.models ?? [])
            .filter(
              (m) =>
                !m.supportedGenerationMethods ||
                m.supportedGenerationMethods.includes('generateContent')
            )
            .map((m) => (m.name ?? '').replace(/^models\//, '').trim())
            .filter(Boolean)
        )
      ).sort()
    }

    if (provider === 'openai' || provider === 'custom') {
      const base =
        provider === 'openai'
          ? 'https://api.openai.com/v1'
          : (baseUrl ?? '').trim().replace(/\/+$/, '')
      if (provider === 'openai' && !key) {
        throw new Error('La API Key de OpenAI es obligatoria.')
      }
      if (provider === 'custom') {
        if (!/^https?:\/\//i.test(base)) {
          throw new Error('La URL base debe usar https:// o http://')
        }
      }
      const res = await fetch(`${base}/models`, {
        headers: key ? { Authorization: `Bearer ${key}` } : undefined,
      })
      if (!res.ok) throw new Error(`IA HTTP ${res.status}`)
      const json = (await res.json()) as {
        data?: Array<{ id?: string }>
        models?: Array<{ id?: string; name?: string; model?: string }>
      }
      const items: Array<{ id?: string; name?: string; model?: string }> =
        json.data ?? json.models ?? []
      const raw = items.map((item) => item.id ?? item.name ?? item.model ?? '')
      return Array.from(new Set(raw.map((s) => s.trim()).filter(Boolean))).sort()
    }

    throw new Error(
      'Listar modelos de Anthropic Claude desde navegador requiere la app de Escritorio (Tauri) por políticas CORS.'
    )
  },

  async aiChatCompletion(
    platform: Platform,
    options: {
      provider: 'openai' | 'anthropic' | 'gemini' | 'custom'
      apiKey: string
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
      baseUrl?: string
      model?: string
    }
  ): Promise<string> {
    const runOnce = async (): Promise<string> => {
      if (isTauri(platform)) {
        const { invoke } = await import('@tauri-apps/api/core')
        try {
          return await invoke<string>('ai_chat_completion', options)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          const isTransportErr =
            /error sending request|timeout|connection|timed out/i.test(msg) &&
            options.provider !== 'anthropic'
          if (!isTransportErr) throw err
        }
      }

      // Fallback HTTP para Web/Móvil (OpenAI / Gemini / Custom)
      if (options.provider === 'gemini') {
        const model = options.model || 'gemini-3.8-flash'
        const systemText = options.messages
          .filter((m) => m.role === 'system')
          .map((m) => m.content)
          .join('\n')
        const contents = options.messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }))
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'x-goog-api-key': options.apiKey.trim(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemText }] },
              contents,
            }),
          }
        )
        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          throw new Error(`Gemini HTTP ${res.status}${errText ? `: ${errText}` : ''}`)
        }
        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        }
        return json.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sin respuesta.'
      }

      if (options.provider === 'openai' || options.provider === 'custom') {
        const base =
          options.provider === 'openai'
            ? 'https://api.openai.com/v1'
            : (options.baseUrl ?? '').trim().replace(/\/+$/, '')
        const res = await fetch(`${base}/chat/completions`, {
          method: 'POST',
          headers: {
            ...(options.apiKey.trim() ? { Authorization: `Bearer ${options.apiKey.trim()}` } : {}),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options.model || 'gpt-4o-mini',
            messages: options.messages,
            temperature: 0.4,
          }),
        })
        if (!res.ok) throw new Error(`IA HTTP ${res.status}`)
        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }
        return json.choices?.[0]?.message?.content ?? 'Sin respuesta.'
      }

      throw new Error(
        'Anthropic Claude desde navegador requiere la app de Escritorio (Tauri) por políticas CORS.'
      )
    }

    try {
      return await runOnce()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/503|429|UNAVAILABLE|high demand|Load failed/i.test(msg)) {
        await new Promise((r) => setTimeout(r, 1200))
        return await runOnce()
      }
      throw err
    }
  },
}

export function categorizeMimeType(mime: string, name: string): MediaCategory {
  const m = mime.toLowerCase()
  const n = name.toLowerCase()
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|heic)$/.test(n)) return 'photo'
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/.test(n)) return 'audio'
  if (
    m.includes('pdf') ||
    m.includes('document') ||
    m.includes('text/') ||
    m.includes('spreadsheet') ||
    /\.(pdf|docx?|xlsx?|pptx?|txt|md|csv|json)$/.test(n)
  ) {
    return 'document'
  }
  return 'other'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export interface StorageQuotaInfo {
  usedBytes: number
  totalBytes: number | null
  availableBytes: number | null
  note?: string
}

export async function getLocalStorageQuota(): Promise<StorageQuotaInfo | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  try {
    const est = await navigator.storage.estimate()
    const used = est.usage ?? 0
    const total = est.quota ?? null
    return {
      usedBytes: used,
      totalBytes: total,
      availableBytes: total !== null ? Math.max(0, total - used) : null,
    }
  } catch {
    return null
  }
}

export async function getStorageAccountQuota(
  account: StorageAccount
): Promise<StorageQuotaInfo> {
  const token = (account.secretKey ?? '').trim()

  if (account.provider === 'dropbox') {
    if (!token) throw new Error('Falta OAuth Access Token de Dropbox.')
    const res = await fetch('https://api.dropboxapi.com/2/users/get_space_usage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Dropbox HTTP ${res.status}`)
    const data = (await res.json()) as {
      used?: number
      allocation?: { allocated?: number }
    }
    const used = data.used ?? 0
    const total = data.allocation?.allocated ?? null
    return {
      usedBytes: used,
      totalBytes: total,
      availableBytes: total !== null ? Math.max(0, total - used) : null,
    }
  }

  if (account.provider === 'gdrive') {
    if (!token) throw new Error('Falta OAuth Access Token de Google Drive.')
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/about?fields=storageQuota',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error(`Google Drive HTTP ${res.status}`)
    const data = (await res.json()) as {
      storageQuota?: { limit?: string; usage?: string }
    }
    const used = Number(data.storageQuota?.usage ?? 0)
    const total = data.storageQuota?.limit ? Number(data.storageQuota.limit) : null
    return {
      usedBytes: used,
      totalBytes: total,
      availableBytes: total !== null ? Math.max(0, total - used) : null,
    }
  }

  return {
    usedBytes: 0,
    totalBytes: null,
    availableBytes: null,
    note:
      account.provider === 'r2' || account.provider === 's3'
        ? 'Almacenamiento por demanda (sin límite fijo)'
        : 'Consulta de cuota no expuesta por este endpoint',
  }
}

export async function uploadFileToStorageAccount(
  account: StorageAccount,
  fileName: string,
  mimeType: string,
  buffer: ArrayBuffer
): Promise<string | undefined> {
  const token = (account.secretKey ?? '').trim()
  if (!token) return undefined

  if (account.provider === 'dropbox') {
    const safeName = fileName.replace(/[/\\]/g, '_')
    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: `/Laryko/${safeName}`,
          mode: 'add',
          autorename: true,
          mute: false,
        }),
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    })
    if (!res.ok) throw new Error(`Dropbox HTTP ${res.status}`)
    const data = (await res.json()) as { path_display?: string }
    return data.path_display ?? `/Laryko/${safeName}`
  }

  if (account.provider === 'gdrive') {
    const metadata = { name: fileName, mimeType: mimeType || 'application/octet-stream' }
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', new Blob([buffer], { type: mimeType || 'application/octet-stream' }))
    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    )
    if (!res.ok) throw new Error(`Google Drive HTTP ${res.status}`)
    const data = (await res.json()) as { id?: string }
    return data.id
  }

  if (account.provider === 'custom' && account.endpoint?.trim()) {
    const parsed = new URL(account.endpoint.trim())
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Endpoint de almacenamiento inválido.')
    }
    const form = new FormData()
    form.append('file', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), fileName)
    const res = await fetch(parsed.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    if (!res.ok) throw new Error(`Storage HTTP ${res.status}`)
    return fileName
  }

  return undefined
}

export async function listCloudFilesForAccount(
  account: StorageAccount
): Promise<Array<{ name: string; size: number; mimeType: string; remoteKey: string }>> {
  const token = (account.secretKey ?? '').trim()
  if (!token) return []

  if (account.provider === 'dropbox') {
    const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: '', limit: 50 }),
    })
    if (!res.ok) throw new Error(`Dropbox HTTP ${res.status}`)
    const data = (await res.json()) as {
      entries?: Array<{ '.tag': string; name: string; size?: number; path_display?: string }>
    }
    return (data.entries ?? [])
      .filter((e) => e['.tag'] === 'file')
      .map((e) => ({
        name: e.name,
        size: e.size ?? 0,
        mimeType: 'application/octet-stream',
        remoteKey: e.path_display ?? e.name,
      }))
  }

  if (account.provider === 'gdrive') {
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,size)',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error(`Google Drive HTTP ${res.status}`)
    const data = (await res.json()) as {
      files?: Array<{ id: string; name: string; mimeType?: string; size?: string }>
    }
    return (data.files ?? []).map((f) => ({
      name: f.name,
      size: Number(f.size ?? 0),
      mimeType: f.mimeType ?? 'application/octet-stream',
      remoteKey: f.id,
    }))
  }

  return []
}

export async function deleteFileFromStorageAccount(
  account: StorageAccount,
  remoteKey: string
): Promise<void> {
  const token = (account.secretKey ?? '').trim()
  if (!token || !remoteKey.trim()) {
    throw new Error('Falta token o ruta remota del archivo.')
  }

  if (account.provider === 'dropbox') {
    const res = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: remoteKey }),
    })
    if (!res.ok) throw new Error(`Dropbox HTTP ${res.status}`)
    return
  }

  if (account.provider === 'gdrive') {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(remoteKey)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!res.ok && res.status !== 204) {
      throw new Error(`Google Drive HTTP ${res.status}`)
    }
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function createDropboxPkceChallenge(appKey: string): Promise<{
  verifier: string
  authUrl: string
}> {
  const random = new Uint8Array(32)
  crypto.getRandomValues(random)
  const verifier = toBase64Url(random)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = toBase64Url(new Uint8Array(digest))
  const params = new URLSearchParams({
    client_id: appKey.trim(),
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline',
  })
  return {
    verifier,
    authUrl: `https://www.dropbox.com/oauth2/authorize?${params.toString()}`,
  }
}

export async function exchangeDropboxPkceCode(
  appKey: string,
  code: string,
  verifier: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const body = new URLSearchParams({
    code: code.trim(),
    grant_type: 'authorization_code',
    client_id: appKey.trim(),
    code_verifier: verifier,
  })
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Dropbox OAuth HTTP ${res.status}${text ? `: ${text}` : ''}`)
  }
  const data = (await res.json()) as { access_token?: string; refresh_token?: string }
  if (!data.access_token) {
    throw new Error('Dropbox no devolvió access_token.')
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  }
}
