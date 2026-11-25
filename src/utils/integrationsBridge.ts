import type { Platform } from '@/types'

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
    html: string
  ): Promise<string> {
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string>('send_resend_email', {
        apiKey,
        fromEmail,
        toEmail,
        subject,
        html,
      })
    }
    const from = fromEmail.trim() || 'Laryko <onboarding@resend.dev>'
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [toEmail.trim()],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      throw new Error(`Resend respondió HTTP ${res.status}`)
    }
    return 'Correo enviado correctamente con Resend.'
  },

  async testResendConnection(
    platform: Platform,
    apiKey: string,
    fromEmail: string,
    toEmail: string
  ): Promise<string> {
    return this.sendResendEmail(
      platform,
      apiKey,
      fromEmail,
      toEmail,
      'Laryko — Prueba de conexión Resend',
      '<p>Tu integración de <strong>Resend</strong> en Laryko está funcionando correctamente.</p>'
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
