import type { Platform } from '@/types'

function isTauri(platform: Platform): boolean {
  return (
    (platform === 'macos' || platform === 'windows' || platform === 'linux') &&
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in window
  )
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
    return 'API Key guardada en bóveda cifrada (la prueba directa sin CORS está disponible en Escritorio).'
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
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string>('ai_chat_completion', options)
    }

    // Fallback HTTP para Web/Móvil (OpenAI / Gemini / Custom)
    if (options.provider === 'gemini') {
      const model = options.model || 'gemini-2.5-flash'
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
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
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
  },
}
