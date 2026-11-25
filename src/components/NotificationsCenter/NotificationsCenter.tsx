import { useState } from 'react'
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  Volume2,
  Trash2,
  Play,
} from 'lucide-react'
import { useNotificationsCenter } from '@/hooks/useNotificationsCenter'
import { playNotificationSound } from '@/utils/soundEngine'
import type { NotificationSoundPreset } from '@/db/laryko.db'
import styles from './NotificationsCenter.module.css'

export interface NotificationsCenterProps {
  onClose: () => void
  onOpenAgenda: () => void
}

type FilterTab = 'unread' | 'missed' | 'upcoming' | 'read'

export function NotificationsCenter({ onClose, onOpenAgenda }: NotificationsCenterProps) {
  const {
    unreadItems,
    readItems,
    missedItems,
    upcomingItems,
    unreadCount,
    soundPreset,
    soundVolume,
    markAsRead,
    markAllAsRead,
    clearRead,
    completeFromNotification,
    updateSoundSettings,
  } = useNotificationsCenter()

  const [tab, setTab] = useState<FilterTab>(unreadCount > 0 ? 'unread' : 'missed')

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Centro de Notificaciones">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Bell size={18} strokeWidth={2.2} />
            <h3>Centro de Notificaciones</h3>
            {unreadCount > 0 && <span className={styles.countPill}>{unreadCount} nuevas</span>}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'unread' ? styles.tabActive : ''}`}
            onClick={() => setTab('unread')}
          >
            No vistas ({unreadItems.length})
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'missed' ? styles.tabActive : ''}`}
            onClick={() => setTab('missed')}
          >
            Perdidas ({missedItems.length})
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'upcoming' ? styles.tabActive : ''}`}
            onClick={() => setTab('upcoming')}
          >
            Próximas ({upcomingItems.length})
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'read' ? styles.tabActive : ''}`}
            onClick={() => setTab('read')}
          >
            Vistas ({readItems.length})
          </button>
        </div>

        <div className={styles.body}>
          {tab === 'unread' && (
            <>
              {unreadItems.length > 0 && (
                <div className={styles.toolbar}>
                  <button type="button" className={styles.linkBtn} onClick={markAllAsRead}>
                    <CheckCheck size={14} /> Marcar todas como vistas
                  </button>
                </div>
              )}
              {unreadItems.length === 0 ? (
                <div className={styles.empty}>No tienes notificaciones sin leer.</div>
              ) : (
                unreadItems.map((n) => (
                  <div key={n.uuid} className={styles.item}>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{n.title}</div>
                      {n.body && <div className={styles.itemDesc}>{n.body}</div>}
                      <div className={styles.itemTime}>{n.createdAt.toLocaleString()}</div>
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => markAsRead(n)}
                        title="Marcar como vista"
                      >
                        <Check size={14} />
                      </button>
                      {n.reminderUuid && (
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => completeFromNotification(n.reminderUuid)}
                          title="Completar y silenciar"
                        >
                          Listo
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {tab === 'missed' && (
            <>
              {missedItems.length > 0 && (
                <div className={styles.toolbar}>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={async () => {
                      await Promise.all(
                        missedItems.map((r) => completeFromNotification(r.uuid))
                      )
                    }}
                  >
                    <CheckCheck size={14} /> Completar todas
                  </button>
                </div>
              )}
              {missedItems.length === 0 ? (
                <div className={styles.empty}>No tienes tareas o alarmas perdidas.</div>
              ) : (
                missedItems.map((r) => (
                  <div key={r.uuid} className={styles.item}>
                    <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{r.title}</div>
                      {r.notes && <div className={styles.itemDesc}>{r.notes}</div>}
                      <div className={styles.itemTime}>Venció: {r.dueAt.toLocaleString()}</div>
                    </div>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => completeFromNotification(r.uuid)}
                    >
                      Completar
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {tab === 'upcoming' && (
            <>
              {upcomingItems.length === 0 ? (
                <div className={styles.empty}>No hay recordatorios en las próximas 24 horas.</div>
              ) : (
                upcomingItems.map((r) => (
                  <div key={r.uuid} className={styles.item}>
                    <Clock size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{r.title}</div>
                      {r.notes && <div className={styles.itemDesc}>{r.notes}</div>}
                      <div className={styles.itemTime}>Programado: {r.dueAt.toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {tab === 'read' && (
            <>
              {readItems.length > 0 && (
                <div className={styles.toolbar}>
                  <button type="button" className={styles.linkBtn} onClick={clearRead}>
                    <Trash2 size={14} /> Limpiar historial visto
                  </button>
                </div>
              )}
              {readItems.length === 0 ? (
                <div className={styles.empty}>No hay notificaciones vistas en el historial.</div>
              ) : (
                readItems.map((n) => (
                  <div key={n.uuid} className={`${styles.item} ${styles.itemRead}`}>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{n.title}</div>
                      {n.body && <div className={styles.itemDesc}>{n.body}</div>}
                      <div className={styles.itemTime}>{n.createdAt.toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* ── Control rápido de Sonido y Volumen ── */}
        <div className={styles.footer}>
          <div className={styles.soundRow}>
            <Volume2 size={15} />
            <select
              className={styles.select}
              value={soundPreset}
              onChange={(e) =>
                updateSoundSettings(e.target.value as NotificationSoundPreset, soundVolume)
              }
            >
              <option value="chime">Tono: Cristal</option>
              <option value="bell">Tono: Campana</option>
              <option value="alarm">Tono: Alarma</option>
              <option value="siren">Tono: Sirena fuerte</option>
              <option value="soft">Tono: Suave</option>
              <option value="custom">Tono: Audio Custom</option>
              <option value="mute">Silenciado</option>
            </select>
            <input
              type="range"
              min={0}
              max={100}
              value={soundVolume}
              onChange={(e) => updateSoundSettings(soundPreset, Number(e.target.value))}
              className={styles.slider}
              aria-label="Volumen de notificaciones"
            />
            <span className={styles.volLabel}>{soundVolume}%</span>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => playNotificationSound(soundPreset, soundVolume)}
              title="Probar sonido y volumen"
            >
              <Play size={12} />
            </button>
          </div>

          <button
            type="button"
            className={styles.agendaBtn}
            onClick={() => {
              onClose()
              onOpenAgenda()
            }}
          >
            Ir a Agenda
          </button>
        </div>
      </div>
    </div>
  )
}
