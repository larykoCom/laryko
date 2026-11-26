import type { ActiveTool } from '@/components/BottomBar'
import type { ReminderRecurrence } from '@/db/laryko.db'

export type LarykoAiAction =
  | { type: 'navigate'; tool: ActiveTool }
  | { type: 'open_notifications' }
  | {
      type: 'create_reminder'
      title: string
      notes?: string
      minutesFromNow?: number
      isAlarm?: boolean
      persistent?: boolean
      recurrence?: ReminderRecurrence
    }
  | { type: 'sleep_all_sessions' }
  | { type: 'sync_neon' }
  | { type: 'test_alert' }

const ALLOWED_TOOLS: ActiveTool[] = [
  'home',
  'calculator',
  'sessions',
  'reminders',
  'account',
]

const ALLOWED_RECURRENCE: ReminderRecurrence[] = [
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
]

export function buildAssistantSystemPrompt(context: {
  activeTool: ActiveTool
  platform: string
  isOnline: boolean
  pendingRemindersCount: number
  sessionsCount: number
  activeSessionsCount: number
  hasDatabase: boolean
}): string {
  return `Eres el Asistente IA oficial integrado dentro de Laryko (app multiplataforma offline-first).
Responde siempre en español, de forma concisa, útil y directa.

Estado actual de la app:
- Plataforma: ${context.platform} (${context.isOnline ? 'Online' : 'Offline'})
- Vista actual: ${context.activeTool}
- Recordatorios pendientes: ${context.pendingRemindersCount}
- Sesiones Multi-Sesión: ${context.sessionsCount} (${context.activeSessionsCount} activas)
- Base de datos Neon configurada: ${context.hasDatabase ? 'Sí' : 'No (modo local)'}

Puedes controlar la app emitiendo UNO o más bloques JSON exactamente con el formato:
\`\`\`laryko-action
{"type":"..."}
\`\`\`

Acciones permitidas:
1. Navegar: {"type":"navigate","tool":"home|calculator|sessions|reminders|account|thanks"}
2. Abrir Centro de Notificaciones: {"type":"open_notifications"}
3. Crear recordatorio o alarma: {"type":"create_reminder","title":"Texto","notes":"Opcional","minutesFromNow":10,"isAlarm":false,"persistent":false,"recurrence":"none|daily|weekly|monthly|yearly"}
4. Dormir todas las sesiones (liberar RAM): {"type":"sleep_all_sessions"}
5. Sincronizar con Neon Postgres: {"type":"sync_neon"}
6. Probar alerta nativa: {"type":"test_alert"}

Reglas:
- Si el usuario pide hacer algo en la app (ej. "abre la calculadora", "pon una alarma en 5 minutos", "duerme las sesiones", "llévame a cuenta"), incluye el bloque \`\`\`laryko-action\`\`\` correspondiente y confirma brevemente.
- Si es una pregunta de soporte sobre Laryko (Neon, Resend, Multi-Sesión, PIN, Alarmas, Tray), explícalo claramente.`
}

export function extractValidatedActions(text: string): {
  cleanText: string
  actions: LarykoAiAction[]
} {
  const actions: LarykoAiAction[] = []
  const regex = /```laryko-action\s*([\s\S]*?)```/gi
  const cleanText = text
    .replace(regex, (_, rawJson: string) => {
      try {
        const parsed = JSON.parse(rawJson.trim()) as Record<string, unknown>
        if (parsed.type === 'navigate' && ALLOWED_TOOLS.includes(parsed.tool as ActiveTool)) {
          actions.push({ type: 'navigate', tool: parsed.tool as ActiveTool })
        } else if (parsed.type === 'open_notifications') {
          actions.push({ type: 'open_notifications' })
        } else if (parsed.type === 'sleep_all_sessions') {
          actions.push({ type: 'sleep_all_sessions' })
        } else if (parsed.type === 'sync_neon') {
          actions.push({ type: 'sync_neon' })
        } else if (parsed.type === 'test_alert') {
          actions.push({ type: 'test_alert' })
        } else if (parsed.type === 'create_reminder' && typeof parsed.title === 'string') {
          const title = parsed.title.trim().slice(0, 140)
          if (title) {
            const mins =
              typeof parsed.minutesFromNow === 'number' && Number.isFinite(parsed.minutesFromNow)
                ? Math.max(0, Math.min(525_600, parsed.minutesFromNow))
                : 10
            const rec = ALLOWED_RECURRENCE.includes(parsed.recurrence as ReminderRecurrence)
              ? (parsed.recurrence as ReminderRecurrence)
              : 'none'
            actions.push({
              type: 'create_reminder',
              title,
              notes: typeof parsed.notes === 'string' ? parsed.notes.slice(0, 300) : '',
              minutesFromNow: mins,
              isAlarm: Boolean(parsed.isAlarm),
              persistent: Boolean(parsed.persistent),
              recurrence: rec,
            })
          }
        }
      } catch {
        // Ignorar bloques inválidos
      }
      return ''
    })
    .trim()

  return { cleanText, actions }
}

/**
 * Parser local offline cuando no hay clave de IA configurada o no hay internet.
 */
export function parseLocalOfflineCommand(prompt: string): {
  reply: string
  actions: LarykoAiAction[]
} | null {
  const q = prompt.toLowerCase().trim()

  if (/(abre|ir a|ve a|mostrar).*(calculadora|calc)/.test(q)) {
    return {
      reply: 'Abriendo la Calculadora Inteligente.',
      actions: [{ type: 'navigate', tool: 'calculator' }],
    }
  }
  if (/(abre|ir a|ve a|mostrar).*(agenda|recordatorio|alarma)/.test(q)) {
    return {
      reply: 'Abriendo Agenda & Recordatorios.',
      actions: [{ type: 'navigate', tool: 'reminders' }],
    }
  }
  if (/(abre|ir a|ve a|mostrar).*(sesiones|multi|navegador)/.test(q)) {
    return {
      reply: 'Abriendo Multi-Sesión.',
      actions: [{ type: 'navigate', tool: 'sessions' }],
    }
  }
  if (/(abre|ir a|ve a|mostrar).*(cuenta|bóveda|boveda|ajustes|config)/.test(q)) {
    return {
      reply: 'Abriendo tu Panel de Usuario & Cuenta.',
      actions: [{ type: 'navigate', tool: 'account' }],
    }
  }
  if (/(abre|ir a|ve a|mostrar).*(inicio|home)/.test(q)) {
    return {
      reply: 'Volviendo al Inicio.',
      actions: [{ type: 'navigate', tool: 'home' }],
    }
  }
  if (/(notificacion|notificaciones|campana)/.test(q)) {
    return {
      reply: 'Abriendo el Centro de Notificaciones.',
      actions: [{ type: 'open_notifications' }],
    }
  }
  if (/(dormir|hibernar|liberar ram).*(sesion|sesiones|todas)/.test(q)) {
    return {
      reply: 'Durmiendo todas las sesiones activas para liberar RAM.',
      actions: [{ type: 'sleep_all_sessions' }],
    }
  }
  if (/(sincroniza|sync).*(neon|nube|bd|base)/.test(q)) {
    return {
      reply: 'Iniciando sincronización con Neon Postgres.',
      actions: [{ type: 'sync_neon' }],
    }
  }
  if (/(probar|test).*(alerta|sonido|notificacion)/.test(q)) {
    return {
      reply: 'Disparando alerta nativa de prueba.',
      actions: [{ type: 'test_alert' }],
    }
  }

  return null
}
