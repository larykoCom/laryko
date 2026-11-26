const PBKDF2_ITERATIONS = 100_000

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim()
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export function generateSaltHex(byteLength = 16): string {
  const salt = new Uint8Array(byteLength)
  crypto.getRandomValues(salt)
  return bytesToHex(salt)
}

export async function derivePinHash(
  pin: string,
  saltHex: string,
  iterations = PBKDF2_ITERATIONS
): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const saltBytes = hexToBytes(saltHex)
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )

  return bytesToHex(new Uint8Array(bits))
}

export async function verifyPinHash(
  pin: string,
  storedHash: string,
  saltHex: string,
  iterations = PBKDF2_ITERATIONS
): Promise<boolean> {
  const derived = await derivePinHash(pin, saltHex, iterations)
  return constantTimeEqual(derived, storedHash)
}

export function generateSessionUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytesToHex(bytes)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Valida y normaliza una URL para contenedores WebView.
 * Solo permite esquemas seguros http/https (por defecto https).
 */
export function sanitizeSessionUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  // Bloqueo explícito de esquemas peligrosos antes de normalizar
  if (/^(javascript|data|file|vbscript|about|tauri|asset):/i.test(trimmed)) {
    return null
  }

  // Direct login for Gmail / Google to bypass Workspace marketing redirects
  if (
    /^(https?:\/\/)?(www\.)?(gmail\.com|mail\.google\.com)\/?$/i.test(trimmed) ||
    trimmed.toLowerCase() === 'gmail'
  ) {
    return 'https://accounts.google.com/ServiceLogin?service=mail&continue=https://mail.google.com/mail/'
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null
    }
    if (!parsed.hostname || parsed.hostname.includes(' ')) {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Sanea un SVG o data URL de imagen para usarlo de forma segura como icono.
 * Elimina scripts, foreignObject, iframes y manejadores on*= para prevenir XSS.
 */
export function sanitizeSessionIcon(rawIcon?: string | null): string | undefined {
  const trimmed = (rawIcon ?? '').trim()
  if (!trimmed) return undefined

  if (/^<svg[\s\S]*<\/svg>$/i.test(trimmed)) {
    const cleanSvg = trimmed
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
      .replace(/<(iframe|object|embed|link|meta)[\s\S]*?>/gi, '')
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|xlink:href)\s*=\s*(['"])\s*(javascript|data:text\/html)[^'"]*\2/gi, '')
    return `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`
  }

  if (
    /^data:image\/(png|jpeg|jpg|webp|gif|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/=]+$/i.test(
      trimmed
    ) ||
    /^data:image\/svg\+xml;(utf8|charset=utf-8),/i.test(trimmed) ||
    /^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/i.test(trimmed)
  ) {
    return trimmed
  }

  return undefined
}
