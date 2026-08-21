import { useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react'
import { adminConfirmSchedule, adminConfirmWardVisit } from '@/services/scheduleService'
import { expireTask } from '@/services/taskService'
import { Button } from '@/components/ui'
import type { RespondedSlot, Task } from '@/types'
import { EditTaskModal } from './EditTaskModal'
import { TaskDetailModal } from './TaskDetailModal'
import { StatusBadge } from './TaskStatusBadge'
import styles from './tasks.module.scss'

function formatRespondedAt(respondedAt: unknown): string {
  if (!respondedAt) return ''
  // Firestore Timestamp shape
  if (typeof respondedAt === 'object' && respondedAt !== null && 'seconds' in respondedAt) {
    return dayjs((respondedAt as { seconds: number }).seconds * 1000).format('M/D HH:mm')
  }
  // String (e.g. ISO date stored by submitAvailability CF)
  if (typeof respondedAt === 'string') return dayjs(respondedAt).format('M/D HH:mm')
  return ''
}

// ── Responded slot row ───────────────────────────────────────────────────────

function RespondedSlotRow({
  slot,
  taskId,
  onConfirmed,
}: {
  slot: RespondedSlot
  taskId: string
  onConfirmed: () => void
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const result = await adminConfirmSchedule({ taskId, slot })
      if (result.success) {
        toast.success(t('taskProgress.confirmSuccess'))
        onConfirmed()
      } else toast.error(result.error ?? t('common.confirmFailed'))
    } catch {
      toast.error(t('taskProgress.genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.slotRow}>
      <span className={styles.slotDate}>{dayjs(slot.date).format('M/D (ddd)')}</span>
      <span className={styles.slotTime}>
        {slot.startTime} ~ {slot.endTime}
      </span>
      <Button size="sm" onClick={handleConfirm} loading={loading}>
        {t('taskProgress.confirmThisTime')}
      </Button>
    </div>
  )
}

// ── Single task row ──────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task
  presidentName: string
  unitName: string
  onDeleteTask?: (task: Task) => void
}

export function TaskRow({ task, presidentName, unitName, onDeleteTask }: TaskRowProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [expiring, setExpiring] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day')
  const isOverdue = daysLeft < 0
  const typeLabel = task.title ?? t(`task.type.${task.type}`, { defaultValue: task.type })
  const hasSlots = (task.respondedSlots?.length ?? 0) > 0
  const hasWardAssignments = (task.wardAssignments?.length ?? 0) > 0
  const isVisitTask = task.type === 'select_visit'
  const canExpire = task.status === 'pending' || task.status === 'responded'
  const canEdit = task.status === 'pending' || task.status === 'responded'
  const isExpired = task.status === 'expired'

  const handleExpire = async () => {
    setExpiring(true)
    try {
      await expireTask(task.id)
      toast.success(t('task.expireSuccess'))
    } catch {
      toast.error(t('task.expireFailed'))
    } finally {
      setExpiring(false)
    }
  }

  const handleConfirmWardVisit = async () => {
    setConfirming(true)
    try {
      const result = await adminConfirmWardVisit(task.id)
      if (result.success) {
        toast.success(t('admin.wardConfirmSuccess', { count: result.scheduleCount }))
      } else {
        toast.error(result.error ?? t('common.confirmFailed'))
      }
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? t('common.unknownError'))
    } finally {
      setConfirming(false)
    }
  }

  return (
    <>
      <div
        className={clsx(
          styles.taskRow,
          task.status === 'responded' && styles.taskRowResponded,
          isExpired && styles.taskRowExpired,
          task.status === 'completed' && styles.clickable,
        )}
        onClick={() => {
          if (task.status === 'completed') setDetailOpen(true)
        }}
      >
        <div className={styles.taskRowMain}>
          <div className={styles.taskRowLeft}>
            <div className={styles.taskIcon}>
              {task.status === 'completed' ? (
                <CheckCircle2 size={16} className={styles.iconDone} />
              ) : task.status === 'responded' ? (
                <Clock size={16} className={styles.iconResponded} />
              ) : isExpired ? (
                <XCircle size={16} className={styles.iconExpired} />
              ) : (
                <AlertCircle size={16} className={styles.iconPending} />
              )}
            </div>
            <div className={styles.taskInfo}>
              <span className={styles.taskPresident}>{presidentName}</span>
              <span className={styles.taskMeta}>
                {unitName} · {typeLabel} ·{' '}
                {t('taskProgress.dueShort', { date: dayjs(task.dueDate).format('M/D') })}
                {task.status === 'pending' && (
                  <span className={clsx(styles.dDay, isOverdue && styles.dDayOverdue)}>
                    {isOverdue ? ` (D+${Math.abs(daysLeft)})` : ` (D-${daysLeft})`}
                  </span>
                )}
                {task.status === 'responded' && task.respondedAt && (
                  <span className={styles.respondedAt}>
                    {' '}
                    · {formatRespondedAt(task.respondedAt)}{' '}
                    {t('task.submitted', { defaultValue: '제출' })}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className={styles.taskRowRight}>
            <StatusBadge status={task.status} />

            {task.status === 'responded' && hasSlots && !isVisitTask && (
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded
                  ? t('common.close')
                  : t('task.slotsCount', {
                      count: task.respondedSlots!.length,
                      defaultValue: `${task.respondedSlots!.length}개 확인`,
                    })}
              </button>
            )}
            {task.status === 'responded' && isVisitTask && hasWardAssignments && (
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded
                  ? t('common.close')
                  : t('task.wardCount', {
                      count: task.wardAssignments!.length,
                      defaultValue: `${task.wardAssignments!.length}개 배정 확인`,
                    })}
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setEditing(true)}
                title={t('common.edit')}
              >
                <Pencil size={14} />
              </button>
            )}

            {canExpire && (
              <button
                type="button"
                className={clsx(styles.actionBtn, styles.actionBtnDanger)}
                onClick={handleExpire}
                disabled={expiring}
                title={t('taskProgress.expire')}
              >
                <XCircle size={14} />
              </button>
            )}

            {isExpired && onDeleteTask && (
              <button
                type="button"
                className={clsx(styles.actionBtn, styles.actionBtnDanger)}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteTask(task)
                }}
                title={t('common.delete')}
                aria-label={t('common.delete')}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Interview/meeting: time slot rows */}
        {expanded && task.respondedSlots && !isVisitTask && (
          <div className={styles.slotsPanel}>
            <p className={styles.slotsPanelTitle}>{t('taskProgress.presidentSubmittedTimes')}</p>
            {task.respondedSlots.map((slot) => (
              <RespondedSlotRow
                key={`${slot.date}-${slot.startTime}`}
                slot={slot}
                taskId={task.id}
                onConfirmed={() => setExpanded(false)}
              />
            ))}
          </div>
        )}

        {/* Ward visit: ward assignment list + confirm button */}
        {expanded && isVisitTask && task.wardAssignments && (
          <div className={styles.slotsPanel}>
            <p className={styles.slotsPanelTitle}>{t('taskProgress.presidentSubmittedWards')}</p>
            {task.wardAssignments.map((a, i) => (
              <div key={i} className={styles.slotRow}>
                <span className={styles.slotDate}>{dayjs(a.date).format('M/D (ddd)')}</span>
                <span className={styles.slotTime}>{a.wardName}</span>
              </div>
            ))}
            {task.status === 'responded' && (
              <div className={styles.wardConfirmRow}>
                <Button onClick={handleConfirmWardVisit} loading={confirming} size="sm">
                  {t('taskProgress.confirmAllAssignments', { count: task.wardAssignments.length })}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && <EditTaskModal task={task} onClose={() => setEditing(false)} />}
      {detailOpen && (
        <TaskDetailModal
          task={task}
          presidentName={presidentName}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </>
  )
}
