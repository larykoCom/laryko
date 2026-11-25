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

  async testResendConnection(
    platform: Platform,
    apiKey: string,
    fromEmail: string,
    toEmail: string
  ): Promise<string> {
    if (isTauri(platform)) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke<string>('test_resend_connection', { apiKey, fromEmail, toEmail })
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail.trim(),
        to: [toEmail.trim()],
        subject: 'Laryko — Prueba de conexión Resend',
        html: '<p>Tu integración de <strong>Resend</strong> en Laryko está funcionando correctamente.</p>',
      }),
    })
    if (!res.ok) {
      throw new Error(`Resend respondió HTTP ${res.status}`)
    }
    return 'Correo de prueba enviado correctamente con Resend.'
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
}
