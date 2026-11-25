import { useState, useCallback } from 'react'
import { integrationsBridge } from '@/utils/integrationsBridge'
import {
  buildAssistantSystemPrompt,
  extractValidatedActions,
  parseLocalOfflineCommand,
  type LarykoAiAction,
} from '@/utils/aiAssistantActions'
import type { AiProviderId, UserIntegrationsVault } from '@/utils/vaultCrypto'
import type { ActiveTool } from '@/components/BottomBar'
import type { Platform } from '@/types'

export interface AssistantChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  executedActions?: string[]
}

export interface UseAiAssistantParams {
  platform: Platform
  isOnline: boolean
  activeTool: ActiveTool
  vault: UserIntegrationsVault
  vaultUnlocked: boolean
  hasDatabase: boolean
  pendingRemindersCount: number
  sessionsCount: number
  activeSessionsCount: number
  onExecuteAction: (action: LarykoAiAction) => Promise<string>
}

function resolveActiveProvider(vault: UserIntegrationsVault): {
  provider: AiProviderId | null
  apiKey: string
  baseUrl?: string
  model?: string
} {
  const map: Record<AiProviderId, { apiKey: string; baseUrl?: string; model?: string }> = {
    openai: { apiKey: vault.openaiApiKey, model: vault.openaiModel || undefined },
    anthropic: { apiKey: vault.anthropicApiKey, model: vault.anthropicModel || undefined },
    gemini: { apiKey: vault.geminiApiKey, model: vault.geminiModel || undefined },
    custom: {
      apiKey: vault.customAiApiKey,
      baseUrl: vault.customAiBaseUrl,
      model: vault.customAiModel || undefined,
    },
  }

  const preferred = map[vault.aiDefaultProvider]
  if (
    preferred &&
    (preferred.apiKey.trim() || (vault.aiDefaultProvider === 'custom' && preferred.baseUrl?.trim()))
  ) {
    return { provider: vault.aiDefaultProvider, ...preferred }
  }

  for (const id of ['gemini', 'anthropic', 'openai', 'custom'] as AiProviderId[]) {
    const candidate = map[id]
    if (candidate.apiKey.trim() || (id === 'custom' && candidate.baseUrl?.trim())) {
      return { provider: id, ...candidate }
    }
  }

  return { provider: null, apiKey: '' }
}

export function useAiAssistant(params: UseAiAssistantParams) {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([])
  const [loading, setLoading] = useState(false)

  const resolved = params.vaultUnlocked
    ? resolveActiveProvider(params.vault)
    : { provider: null, apiKey: '' }

  const activeProviderLabel =
    resolved.provider === 'anthropic'
      ? 'Claude'
      : resolved.provider === 'gemini'
        ? 'Gemini'
        : resolved.provider === 'openai'
          ? 'OpenAI'
          : resolved.provider === 'custom'
            ? 'Custom IA'
            : 'Modo Local'

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim()
      if (!text || loading) return

      const userMsg: AssistantChatMessage = {
        id: `${Date.now()}-u`,
        role: 'user',
        text,
      }
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)

      try {
        // 1. Si no hay clave IA desbloqueada o no hay internet, usar parser local de comandos
        if (!resolved.provider || !params.isOnline) {
          const local = parseLocalOfflineCommand(text)
          if (local) {
            const executed: string[] = []
            for (const act of local.actions) {
              executed.push(await params.onExecuteAction(act))
            }
            setMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}-a`,
                role: 'assistant',
                text: local.reply,
                executedActions: executed,
              },
            ])
            return
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-a`,
              role: 'assistant',
              text: !params.vaultUnlocked
                ? 'Desbloquea tu bóveda en Cuenta para usar tu API Key de IA, o pídeme comandos locales como "ir a agenda", "abrir calculadora" o "dormir sesiones".'
                : !params.isOnline
                  ? 'Estás sin conexión a internet. Puedo ejecutar comandos locales como "ir a agenda", "abrir calculadora" o "dormir sesiones".'
                  : 'No hay ninguna API Key de IA configurada en Cuenta -> Inteligencia Artificial. Configura OpenAI, Claude o Gemini para respuestas inteligentes, o usa comandos locales.',
            },
          ])
          return
        }

        // 2. Llamar al proveedor IA configurado
        const systemPrompt = buildAssistantSystemPrompt({
          activeTool: params.activeTool,
          platform: params.platform,
          isOnline: params.isOnline,
          pendingRemindersCount: params.pendingRemindersCount,
          sessionsCount: params.sessionsCount,
          activeSessionsCount: params.activeSessionsCount,
          hasDatabase: params.hasDatabase,
        })

        const history = messages.slice(-8).map((m) => ({
          role: m.role,
          content: m.text,
        }))

        const rawReply = await integrationsBridge.aiChatCompletion(params.platform, {
          provider: resolved.provider,
          apiKey: resolved.apiKey,
          baseUrl: resolved.baseUrl,
          model: resolved.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: text },
          ],
        })

        const { cleanText, actions } = extractValidatedActions(rawReply)
        const executed: string[] = []
        for (const act of actions) {
          executed.push(await params.onExecuteAction(act))
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-a`,
            role: 'assistant',
            text: cleanText || 'Listo.',
            executedActions: executed.length > 0 ? executed : undefined,
          },
        ])
      } catch (e) {
        const localFallback = parseLocalOfflineCommand(text)
        if (localFallback) {
          const executed: string[] = []
          for (const act of localFallback.actions) {
            executed.push(await params.onExecuteAction(act))
          }
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-a`,
              role: 'assistant',
              text: localFallback.reply,
              executedActions: executed,
            },
          ])
          return
        }

        const rawMsg = e instanceof Error ? e.message : String(e)
        const friendlyMsg = /503|UNAVAILABLE|high demand/i.test(rawMsg)
          ? 'El modelo seleccionado está saturado temporalmente (HTTP 503). Intenta de nuevo en unos segundos o elige otro modelo en Cuenta → Inteligencia Artificial.'
          : /429|rate limit|quota/i.test(rawMsg)
            ? 'Límite de peticiones alcanzado (HTTP 429). Espera unos segundos o cambia de modelo en Cuenta → Inteligencia Artificial.'
            : /Load failed|Failed to fetch|network/i.test(rawMsg)
              ? 'No se pudo conectar con el proveedor de IA. Verifica tu conexión a internet o prueba otro modelo en Cuenta → Inteligencia Artificial.'
              : `Error: ${rawMsg}`

        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-e`,
            role: 'assistant',
            text: friendlyMsg,
          },
        ])
      } finally {
        setLoading(false)
      }
    },
    [loading, resolved, params, messages]
  )

  return {
    messages,
    loading,
    activeProviderLabel,
    sendMessage,
    clearMessages: () => setMessages([]),
  }
}
