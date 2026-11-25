import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Lock,
  Plus,
  Moon,
  Trash2,
  ExternalLink,
  Layers,
  FolderPlus,
  Cpu,
  ShieldAlert,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { SESSION_TEMPLATES, type useMultiSession } from '@/hooks/useMultiSession'
import { multiSessionBridge, type SessionBounds } from '@/utils/multiSessionBridge'
import { triggerNativeHaptic } from '@/utils/nativeIOSBridge'
import type { WebSession } from '@/db/laryko.db'
import type { Platform } from '@/types'
import { PinLock } from './PinLock'
import styles from './MultiSession.module.css'

export interface MultiSessionProps {
  platform: Platform
  multiSession: ReturnType<typeof useMultiSession>
  currentUuid: string | null
  onSelectUuid: (uuid: string | null) => void
  showManager: boolean
  onToggleManager: (open: boolean) => void
  showAddFormSignal: number
}

const COLOR_SWATCHES = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#e11d48', '#06b6d4']

export function MultiSession({
  platform,
  multiSession,
  currentUuid,
  onSelectUuid,
  showManager,
  onToggleManager,
  showAddFormSignal,
}: MultiSessionProps) {
  const {
    pinConfig,
    hasPinSetup,
    isUnlocked,
    pinError,
    isRateLimited,
    lockoutRemainingSec,
    groups,
    sessions,
    notice,
    clearNotice,
    supportsTrueIsolation,
    setupPin,
    verifyPin,
    lockNow,
    createGroup,
    createSession,
    openSession,
    sleepSession,
    sleepAllSessions,
    deleteSession,
    reorderSession,
  } = multiSession

  const [selectedGroupId, setSelectedGroupId] = useState<number | 'all'>('all')
  const [showAddSession, setShowAddSession] = useState(false)
  const [showAddGroup, setShowAddGroup] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null)
  const isDesktopEmbedded = multiSessionBridge.isDesktopEmbedded(platform)

  useEffect(() => {
    if (showAddFormSignal > 0) {
      setShowAddSession(true)
      setShowAddGroup(false)
    }
  }, [showAddFormSignal])

  // Form states
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newColor, setNewColor] = useState(COLOR_SWATCHES[0])
  const [newGroupId, setNewGroupId] = useState<number | ''>('')
  const [groupName, setGroupName] = useState('')
  const [groupColor, setGroupColor] = useState(COLOR_SWATCHES[1])

  const activeCount = useMemo(
    () => sessions.filter((s) => s.status === 'active').length,
    [sessions]
  )

  const filteredSessions = useMemo(() => {
    if (selectedGroupId === 'all') return sessions
    return sessions.filter((s) => s.groupId === selectedGroupId)
  }, [sessions, selectedGroupId])

  const currentSession = useMemo(
    () => sessions.find((s) => s.uuid === currentUuid) ?? null,
    [sessions, currentUuid]
  )

  const getViewportBounds = useCallback((): SessionBounds | undefined => {
    const el = viewportRef.current
    if (!el) return undefined
    const rect = el.getBoundingClientRect()
    if (rect.width < 120 || rect.height < 120) return undefined
    return {
      x: Math.floor(rect.left),
      y: Math.floor(rect.top),
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
    }
  }, [])

  // Sincronizar tamaño del WebView embebido al redimensionar la ventana en Desktop
  useEffect(() => {
    if (!isUnlocked || !isDesktopEmbedded || !currentUuid) return
    const el = viewportRef.current
    if (!el) return

    const syncBounds = () => {
      requestAnimationFrame(() => {
        const bounds = getViewportBounds()
        if (bounds) {
          multiSessionBridge.setSessionBounds(platform, currentUuid, bounds).catch(() => {})
        } else {
          multiSessionBridge.hideAllSessions(platform).catch(() => {})
        }
      })
    }

    syncBounds()
    const observer = new ResizeObserver(syncBounds)
    observer.observe(el)
    window.addEventListener('resize', syncBounds)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncBounds)
    }
  }, [isUnlocked, isDesktopEmbedded, currentUuid, showManager, platform, getViewportBounds])

  // Si volvemos a la pestaña Sesiones o cerramos el Home de Multi-Sesión, mostrar/ocultar el WebView
  useEffect(() => {
    if (!isUnlocked || !isDesktopEmbedded) return
    if (showManager || !currentSession) {
      multiSessionBridge.hideAllSessions(platform).catch(() => {})
      return
    }
    requestAnimationFrame(() => {
      const bounds = getViewportBounds()
      if (bounds) {
        openSession(currentSession, bounds)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, isDesktopEmbedded, showManager, currentSession?.uuid])

  if (!isUnlocked) {
    return (
      <PinLock
        hasPinSetup={hasPinSetup}
        configuredLength={pinConfig?.pinLength ?? 4}
        error={pinError}
        isRateLimited={isRateLimited}
        lockoutRemainingSec={lockoutRemainingSec}
        onVerify={verifyPin}
        onSetup={setupPin}
      />
    )
  }

  const handleOpenSession = async (session: WebSession) => {
    triggerNativeHaptic('selection')
    onSelectUuid(session.uuid)
    if (isDesktopEmbedded) {
      onToggleManager(false)
    }
    requestAnimationFrame(async () => {
      const bounds = getViewportBounds()
      await openSession(session, bounds)
    })
  }

  const handleSleepSession = async (session: WebSession) => {
    triggerNativeHaptic('light')
    if (currentUuid === session.uuid) {
      onSelectUuid(null)
    }
    await sleepSession(session)
  }

  const handleSleepAll = async () => {
    triggerNativeHaptic('selection')
    onSelectUuid(null)
    await sleepAllSessions()
  }

  const handleDeleteSession = async (session: WebSession) => {
    triggerNativeHaptic('warning')
    if (currentUuid === session.uuid) {
      onSelectUuid(null)
    }
    await deleteSession(session)
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetGroupId = Number(newGroupId || groups[0]?.id || 1)
    const ok = await createSession({
      name: newName,
      url: newUrl,
      groupId: targetGroupId,
      color: newColor,
    })
    if (ok) {
      triggerNativeHaptic('success')
      setNewName('')
      setNewUrl('')
      setShowAddSession(false)
    } else {
      triggerNativeHaptic('error')
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = await createGroup(groupName, groupColor)
    if (id) {
      triggerNativeHaptic('success')
      setGroupName('')
      setShowAddGroup(false)
    }
  }

  const managerContent = (
    <div className={isDesktopEmbedded ? styles.homeDashboard : styles.leftPane}>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <div className={styles.titleIcon}>
            <Layers size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className={styles.title}>Espacio de Trabajo Multi-Sesión</h2>
            <p className={styles.subtitle}>
              {activeCount} activa{activeCount === 1 ? '' : 's'} · {sessions.length - activeCount} dormida
              {sessions.length - activeCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          {isDesktopEmbedded && currentSession && (
            <button
              type="button"
              className={styles.iconActionBtn}
              onClick={() => onToggleManager(false)}
              title="Volver a la sesión activa"
            >
              <ExternalLink size={15} strokeWidth={2.2} />
              <span>Volver a {currentSession.name}</span>
            </button>
          )}
          {activeCount > 0 && (
            <button
              type="button"
              className={styles.iconActionBtn}
              onClick={handleSleepAll}
              title="Dormir todas las sesiones (liberar 100% RAM)"
              aria-label="Dormir todas las sesiones"
            >
              <Moon size={16} strokeWidth={2.2} />
              <span>Dormir todas</span>
            </button>
          )}
          <button
            type="button"
            className={styles.lockBtn}
            onClick={() => {
              triggerNativeHaptic('medium')
              onSelectUuid(null)
              lockNow(true)
            }}
            title="Bloquear y dormir sesiones"
            aria-label="Bloquear con PIN"
          >
            <Lock size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>

        {!supportsTrueIsolation && (
          <div className={styles.infoBanner}>
            <ShieldAlert size={16} strokeWidth={2.2} />
            <span>
              Modo Web: las pestañas comparten cookies. Usa la app de Escritorio (Tauri) o Móvil para aislamiento nativo.
            </span>
          </div>
        )}

        {notice && (
          <div className={styles.noticeBanner}>
            <span>{notice}</span>
            <button type="button" onClick={clearNotice} className={styles.closeNotice} aria-label="Cerrar aviso">
              <X size={14} />
            </button>
          </div>
        )}

        <div className={styles.groupsBar}>
          <button
            type="button"
            className={`${styles.groupChip} ${selectedGroupId === 'all' ? styles.groupChipActive : ''}`}
            onClick={() => {
              triggerNativeHaptic('selection')
              setSelectedGroupId('all')
            }}
          >
            Todas ({sessions.length})
          </button>

          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`${styles.groupChip} ${selectedGroupId === g.id ? styles.groupChipActive : ''}`}
              onClick={() => {
                triggerNativeHaptic('selection')
                if (g.id !== undefined) setSelectedGroupId(g.id)
              }}
            >
              <span className={styles.groupDot} style={{ backgroundColor: g.color }} />
              {g.name}
            </button>
          ))}

          <button
            type="button"
            className={styles.addGroupChip}
            onClick={() => {
              triggerNativeHaptic('selection')
              setShowAddGroup((v) => !v)
              setShowAddSession(false)
            }}
            title="Nuevo grupo"
          >
            <FolderPlus size={14} />
          </button>
        </div>

        {showAddGroup && (
          <form className={styles.inlineForm} onSubmit={handleCreateGroup}>
            <div className={styles.formHeader}>
              <span>Nuevo Grupo / Cliente</span>
              <button type="button" onClick={() => setShowAddGroup(false)} className={styles.closeNotice}>
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              className={styles.input}
              placeholder="Nombre (ej. Cliente ACME)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
            <div className={styles.swatchRow}>
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.swatch} ${groupColor === c ? styles.swatchSelected : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setGroupColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
            <button type="submit" className={styles.primaryBtn}>
              Crear Grupo
            </button>
          </form>
        )}

        {!showAddSession ? (
          <button
            type="button"
            className={styles.addSessionBtn}
            onClick={() => {
              triggerNativeHaptic('selection')
              setShowAddSession(true)
              setShowAddGroup(false)
            }}
          >
            <Plus size={18} strokeWidth={2.4} />
            <span>Nueva Sesión Aislada</span>
          </button>
        ) : (
          <form className={styles.inlineForm} onSubmit={handleCreateSession}>
            <div className={styles.formHeader}>
              <span>Agregar Contenedor de Sesión</span>
              <button type="button" onClick={() => setShowAddSession(false)} className={styles.closeNotice}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.templatesRow}>
              {SESSION_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  className={styles.templateBtn}
                  onClick={() => {
                    setNewName(tpl.name)
                    setNewUrl(tpl.url)
                    setNewColor(tpl.color)
                  }}
                >
                  <span className={styles.groupDot} style={{ backgroundColor: tpl.color }} />
                  {tpl.name}
                </button>
              ))}
            </div>

            <input
              type="text"
              className={styles.input}
              placeholder="Nombre (ej. Gmail Trabajo)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />

            <input
              type="text"
              className={styles.input}
              placeholder="URL (ej. https://mail.google.com)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              required
            />

            {groups.length > 0 && (
              <select
                className={styles.input}
                value={newGroupId || groups[0]?.id || ''}
                onChange={(e) => setNewGroupId(Number(e.target.value))}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    Grupo: {g.name}
                  </option>
                ))}
              </select>
            )}

            <div className={styles.swatchRow}>
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.swatch} ${newColor === c ? styles.swatchSelected : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>

            <button type="submit" className={styles.primaryBtn}>
              Guardar Contenedor
            </button>
          </form>
        )}

        <div className={styles.sessionsList}>
          {filteredSessions.length === 0 ? (
            <div className={styles.emptyState}>
              <Cpu size={28} strokeWidth={1.8} />
              <p>No hay sesiones en este grupo.</p>
              <span>Agrega una cuenta para aislar sus cookies y ahorrar RAM cuando esté dormida.</span>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const group = groups.find((g) => g.id === session.groupId)
              const isActive = session.status === 'active'
              const isSelected = currentUuid === session.uuid
              return (
                <div
                  key={session.uuid}
                  className={`${styles.sessionCard} ${isSelected ? styles.sessionCardSelected : ''}`}
                >
                  <button
                    type="button"
                    className={styles.sessionMain}
                    onClick={() => handleOpenSession(session)}
                  >
                    <div className={styles.sessionAvatar} style={{ backgroundColor: session.color }}>
                      {session.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className={styles.sessionMeta}>
                      <div className={styles.sessionTitleRow}>
                        <span className={styles.sessionName}>{session.name}</span>
                        <span className={`${styles.ramBadge} ${isActive ? styles.ramActive : styles.ramSleeping}`}>
                          {isActive ? 'Activa' : 'Dormida 💤'}
                        </span>
                      </div>
                      <span className={styles.sessionUrl}>
                        {group ? `${group.name} · ` : ''}
                        {session.url.replace(/^https?:\/\//, '')}
                      </span>
                    </div>
                    <ExternalLink size={16} className={styles.openIcon} />
                  </button>

                  <div className={styles.sessionActions}>
                    <button
                      type="button"
                      className={styles.miniActionBtn}
                      onClick={() => reorderSession(session.uuid, 'up')}
                      title="Subir posición"
                      aria-label={`Subir ${session.name}`}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.miniActionBtn}
                      onClick={() => reorderSession(session.uuid, 'down')}
                      title="Bajar posición"
                      aria-label={`Bajar ${session.name}`}
                    >
                      <ArrowDown size={14} />
                    </button>
                    {isActive && (
                      <button
                        type="button"
                        className={styles.miniActionBtn}
                        onClick={() => handleSleepSession(session)}
                        title="Dormir sesión (liberar RAM)"
                        aria-label={`Dormir ${session.name}`}
                      >
                        <Moon size={13} />
                        <span>Dormir</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${styles.miniActionBtn} ${styles.deleteActionBtn}`}
                      onClick={() => handleDeleteSession(session)}
                      title="Eliminar sesión y borrar cookies"
                      aria-label={`Eliminar ${session.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
    </div>
  )

  return (
    <div className={styles.workspace}>
      {!isDesktopEmbedded ? (
        managerContent
      ) : (
        <div className={styles.rightPane}>
          {showManager || !currentSession ? (
            <div className={styles.homeScroll}>{managerContent}</div>
          ) : (
            <div ref={viewportRef} data-session-viewport className={styles.viewportHost} />
          )}
        </div>
      )}
    </div>
  )
}
