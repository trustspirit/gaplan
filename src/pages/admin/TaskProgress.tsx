import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react'
import { authUserAtom } from '@/store/authAtom'
import { useAllTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useGeneralSchedules } from '@/hooks/useGeneralSchedules'
import { useDeleteWithUndo } from '@/hooks/useDeleteWithUndo'
import { adminConfirmSchedule, adminConfirmWardVisit } from '@/services/scheduleService'
import { deleteTask, expireTask, updateTaskDetails } from '@/services/taskService'
import { ALL_UNITS, REGIONS } from '@/constants/regions'
import { useTopBar } from '@/hooks/useTopBar'
import { Card, CardHeader, CardBody, Badge, Button, Skeleton, Input, Modal } from '@/components/ui'
import { MultiDatePicker } from '@/components/domain/MultiDatePicker/MultiDatePicker'
import { ResponseMatrix } from '@/components/domain/ResponseMatrix/ResponseMatrix'
import { ScheduleSuggestions } from '@/components/domain/ScheduleSuggestions/ScheduleSuggestions'
import type { Task, RespondedSlot, GeneralSchedule, AppUser } from '@/types'
import styles from './TaskProgress.module.scss'

function StatusBadge({ status }: { status: Task['status'] }) {
  const { t } = useTranslation()
  if (status === 'completed') return <Badge variant="success">{t('task.status.completed')}</Badge>
  if (status === 'responded')
    return <Badge variant="default">{t('task.statusBadge.responded')}</Badge>
  if (status === 'expired') return <Badge variant="danger">{t('task.status.expired')}</Badge>
  return <Badge variant="warning">{t('task.status.pending')}</Badge>
}

// ── Task Detail Modal (for completed tasks) ──────────────────────────────────

function TaskDetailModal({
  task,
  presidentName,
  onClose,
}: {
  task: Task
  presidentName: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Modal open onClose={onClose} title={t('taskProgress.detailTitle')}>
      <div className={styles.modalBody}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{t('taskProgress.statusLabel')}</span>
          <StatusBadge status={task.status} />
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{t('taskProgress.assigneeLabel')}</span>
          <span className={styles.detailValue}>{presidentName}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{t('taskProgress.dueDateLabel')}</span>
          <span className={styles.detailValue}>{task.dueDate}</span>
        </div>
        {task.note && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('taskProgress.memoLabel')}</span>
            <span className={styles.detailValue}>{task.note}</span>
          </div>
        )}
        {task.respondedSlots && task.respondedSlots.length > 0 && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>{t('taskProgress.respondedTimes')}</div>
            {task.respondedSlots.map((slot, i) => (
              <div key={i} className={styles.detailSlotRow}>
                {slot.date} {slot.startTime}–{slot.endTime}
              </div>
            ))}
          </div>
        )}
        {task.wardAssignments && task.wardAssignments.length > 0 && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>{t('taskProgress.wardAssignments')}</div>
            {task.wardAssignments.map((wa, i) => (
              <div key={i} className={styles.detailSlotRow}>
                {wa.wardName}: {wa.date}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Edit Task Modal (for pending tasks) ─────────────────────────────────────

interface EditTaskModalProps {
  task: Task
  onClose: () => void
}

function EditTaskModal({ task, onClose }: EditTaskModalProps) {
  const { t } = useTranslation()
  const isVisit = task.type === 'select_visit'
  const [dueDate, setDueDate] = useState(task.dueDate)
  // For ward visits: just select available Sundays
  const [availableDates, setAvailableDates] = useState<string[]>(task.availableDates ?? [])
  // For interview/sacrament: per-date time ranges
  const [selectedDates, setSelectedDates] = useState<string[]>(
    (task.availableDateSlots ?? []).map((s) => s.date),
  )
  const [dateRanges, setDateRanges] = useState<
    Record<string, { startTime: string; endTime: string }[]>
  >(
    Object.fromEntries(
      (task.availableDateSlots ?? []).map((s) => [
        s.date,
        s.timeRanges?.length ? s.timeRanges : [{ startTime: '09:00', endTime: '18:00' }],
      ]),
    ),
  )
  const [slotDuration, setSlotDuration] = useState(String(task.slotDurationMinutes ?? 60))
  const [saving, setSaving] = useState(false)

  function handleDatesChange(dates: string[]) {
    setSelectedDates(dates)
    setDateRanges((prev) => {
      const next: typeof prev = {}
      dates.forEach((d) => {
        next[d] = prev[d] ?? [{ startTime: '09:00', endTime: '18:00' }]
      })
      return next
    })
  }

  const availableDateSlots = selectedDates
    .map((d) => ({
      date: d,
      timeRanges: dateRanges[d] ?? [{ startTime: '09:00', endTime: '18:00' }],
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isVisit && availableDates.length === 0) {
      toast.error(t('taskProgress.errorSelectSunday'))
      return
    }
    if (!isVisit && availableDateSlots.length === 0) {
      toast.error(t('taskProgress.errorSelectDate'))
      return
    }
    setSaving(true)
    try {
      await updateTaskDetails(
        task.id,
        {
          dueDate,
          ...(isVisit
            ? { availableDates }
            : { availableDateSlots, slotDurationMinutes: parseInt(slotDuration) }),
        },
        task.status === 'responded',
      )
      toast.success(t('task.editSuccess'))
      onClose()
    } catch {
      toast.error(t('task.editFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={t('task.editTitle', { defaultValue: 'Task 수정' })}>
      <form className={styles.editForm} onSubmit={handleSave}>
        {isVisit ? (
          <div className={styles.editSection}>
            <p className={styles.editLabel}>
              {t('task.selectSundays', { defaultValue: '가능 방문 일요일 선택' })}
            </p>
            <MultiDatePicker selected={availableDates} onChange={setAvailableDates} sundayOnly />
          </div>
        ) : (
          <>
            <div className={styles.editSection}>
              <p className={styles.editLabel}>
                {t('task.selectDates', { defaultValue: '가능 날짜 (캘린더에서 선택)' })}
              </p>
              <MultiDatePicker selected={selectedDates} onChange={handleDatesChange} />
              {availableDateSlots.length > 0 && (
                <div className={styles.dateSlotList}>
                  {availableDateSlots.map((s) => (
                    <div key={s.date} className={styles.dateSlotItem}>
                      <div className={styles.dateSlotDate}>{dayjs(s.date).format('M/D (ddd)')}</div>
                      {(dateRanges[s.date] ?? []).map((r, idx) => (
                        <div key={idx} className={styles.timeRangeRow}>
                          <Input
                            type="time"
                            value={r.startTime}
                            className={styles.timeInput}
                            wrapperClassName={styles.timeField}
                            aria-label={`${dayjs(s.date).format('M/D')} ${t('common.startTime')}`}
                            onChange={(e) =>
                              setDateRanges((prev) => ({
                                ...prev,
                                [s.date]: prev[s.date].map((x, i) =>
                                  i === idx ? { ...x, startTime: e.target.value } : x,
                                ),
                              }))
                            }
                          />
                          <span>~</span>
                          <Input
                            type="time"
                            value={r.endTime}
                            className={styles.timeInput}
                            wrapperClassName={styles.timeField}
                            aria-label={`${dayjs(s.date).format('M/D')} ${t('common.endTime')}`}
                            onChange={(e) =>
                              setDateRanges((prev) => ({
                                ...prev,
                                [s.date]: prev[s.date].map((x, i) =>
                                  i === idx ? { ...x, endTime: e.target.value } : x,
                                ),
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Input
              label={t('slotDuration.label')}
              type="number"
              min="5"
              max="480"
              step="5"
              value={slotDuration}
              onChange={(e) => setSlotDuration(e.target.value)}
            />
          </>
        )}
        <Input
          label={t('task.dueDate')}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        {task.status === 'responded' && (
          <p className={styles.resetNote}>
            <AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {t('task.resetWarning')}
          </p>
        )}
        <div className={styles.modalActions}>
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={saving}>
            {t('task.editAndResend')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

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

function TaskRow({ task, presidentName, unitName, onDeleteTask }: TaskRowProps) {
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
                {unitName} · {typeLabel} · {t('taskProgress.dueShort', { date: dayjs(task.dueDate).format('M/D') })}
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

// ── Region group ─────────────────────────────────────────────────────────────

interface RegionGroupProps {
  regionId: string
  tasks: Task[]
  getUserName: (uid: string) => string
  getUnitName: (uid: string) => string
  generalSchedules?: GeneralSchedule[]
  currentUser?: AppUser
  onDeleteTask?: (task: Task) => void
}

function RegionGroup({
  regionId,
  tasks,
  getUserName,
  getUnitName,
  generalSchedules,
  currentUser,
  onDeleteTask,
}: RegionGroupProps) {
  const { t } = useTranslation()
  const regionName = REGIONS.find((r) => r.id === regionId)?.name ?? regionId
  const responded = tasks.filter((t) => t.status === 'responded')
  const pending = tasks.filter((t) => t.status === 'pending')
  const completed = tasks.filter((t) => t.status === 'completed')
  const expired = tasks.filter((t) => t.status === 'expired')
  const visitResponded = responded.filter((t) => t.type === 'select_visit')
  const visitCompleted = completed.filter((t) => t.type === 'select_visit')

  const renderRows = (list: Task[]) =>
    list.map((t) => (
      <TaskRow
        key={t.id}
        task={t}
        presidentName={getUserName(t.assignedTo)}
        unitName={getUnitName(t.assignedTo)}
        onDeleteTask={onDeleteTask}
      />
    ))

  // Group interview/sacrament tasks by batchId for the ResponseMatrix
  const batchGroups: Record<string, Task[]> = {}
  const timeTasks = tasks.filter((t) => t.type === 'select_interview')
  for (const t of timeTasks) {
    const key = t.batchId ?? t.id
    if (!batchGroups[key]) batchGroups[key] = []
    batchGroups[key].push(t)
  }
  const matrixBatches = Object.values(batchGroups).filter((batch) =>
    batch.some((t) => t.status === 'responded' || t.status === 'completed'),
  )

  return (
    <Card>
      <CardHeader
        title={regionName}
        action={
          <div className={styles.regionSummary}>
            {responded.length > 0 && <Badge variant="default">{t('taskProgress.respondedBadge', { count: responded.length })}</Badge>}
            {pending.length > 0 && <Badge variant="warning">{t('taskProgress.pendingBadge', { count: pending.length })}</Badge>}
            {completed.length > 0 && <Badge variant="success">{t('taskProgress.completedBadge', { count: completed.length })}</Badge>}
          </div>
        }
      />
      <CardBody>
        {tasks.length === 0 ? (
          <p className={styles.empty}>{t('taskProgress.emptyRegion')}</p>
        ) : (
          <>
            {/* Response Matrix + Schedule Suggestions for interview batches */}
            {matrixBatches.map((batch) => {
              const ref = batch[0]
              const title = ref.title ?? t(`task.type.${ref.type}`, { defaultValue: ref.type })
              const hasResponded = batch.some(
                (t) => t.status === 'responded' || t.status === 'completed',
              )
              return (
                <div key={ref.batchId ?? ref.id} className={styles.statusSection}>
                  <p className={styles.statusLabel}>
                    {t('taskProgress.responseStatus', {
                      title,
                      responded: batch.filter(
                        (b) => b.status === 'responded' || b.status === 'completed',
                      ).length,
                      total: batch.length,
                    })}
                  </p>
                  <ResponseMatrix tasks={batch} getPresidentName={getUserName} />
                  {hasResponded && (
                    <div className={styles.suggestionsWrap}>
                      <ScheduleSuggestions
                        tasks={batch}
                        getPresidentName={getUserName}
                        generalSchedules={generalSchedules}
                        currentUser={currentUser}
                      />
                    </div>
                  )}
                </div>
              )
            })}

            {visitResponded.length > 0 && (
              <div className={styles.statusSection}>
                <p className={styles.statusLabel}>{t('taskProgress.awaitingConfirm', { count: visitResponded.length })}</p>
                {renderRows(visitResponded)}
              </div>
            )}
            {pending.length > 0 && (
              <div className={styles.statusSection}>
                <p className={styles.statusLabel}>{t('taskProgress.noResponse', { count: pending.length })}</p>
                {renderRows(pending)}
              </div>
            )}
            {visitCompleted.length > 0 && (
              <div className={styles.statusSection}>
                <p className={styles.statusLabel}>{t('taskProgress.completedCount', { count: visitCompleted.length })}</p>
                {renderRows(visitCompleted)}
              </div>
            )}
            {expired.length > 0 && (
              <div className={styles.statusSection}>
                <p className={clsx(styles.statusLabel, styles.statusLabelExpired)}>
                  {t('taskProgress.expiredCount', { count: expired.length })}
                </p>
                {renderRows(expired)}
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export function TaskProgress() {
  const { t } = useTranslation()
  useTopBar({ subtext: t('admin.taskProgress'), helpInfoKey: 'pageHelp.taskProgress' })
  const navigate = useNavigate()
  const user = useAtomValue(authUserAtom)!
  // Seventy: only their assigned tasks. exec_secretary: their assigned seventy's tasks. Admin: all tasks.
  const { tasks, loading } = useAllTasks(
    user.role === 'seventy'
      ? user.uid
      : user.role === 'exec_secretary'
        ? (user.assignedSeventyUid ?? undefined)
        : undefined,
  )
  const { users } = useUsers()
  const { generalSchedules } = useGeneralSchedules()
  const { pendingIds: pendingDeleteTaskIds, scheduleDelete } = useDeleteWithUndo()
  const canDeleteTasks = user.role === 'admin' || user.role === 'exec_secretary'

  const getUserName = (uid: string) => users.find((u) => u.uid === uid)?.name ?? uid
  const getUnitName = (uid: string) => {
    const president = users.find((u) => u.uid === uid)
    const unit = ALL_UNITS.find((u) => u.id === president?.unitId)
    return unit?.name.ko ?? '-'
  }

  const visibleTasks = tasks.filter((t) => !pendingDeleteTaskIds.has(t.id))

  const handleDeleteTask = (task: Task) => {
    scheduleDelete(task.id, () => deleteTask(task.id), t('common.deleted'))
  }

  // Group tasks by regionId
  const tasksByRegion = visibleTasks.reduce<Record<string, Task[]>>((acc, t) => {
    const key = t.regionId || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const totalResponded = visibleTasks.filter((t) => t.status === 'responded').length
  const totalPending = visibleTasks.filter((t) => t.status === 'pending').length
  const totalCompleted = visibleTasks.filter((t) => t.status === 'completed').length
  const totalExpired = visibleTasks.filter((t) => t.status === 'expired').length

  // Order regions by REGIONS constant order, put unknown at end
  const regionIds = [
    ...REGIONS.map((r) => r.id).filter((id) => tasksByRegion[id]),
    ...Object.keys(tasksByRegion).filter((id) => !REGIONS.find((r) => r.id === id)),
  ]

  return (
    <div className={styles.page}>
      {(user.role === 'admin' || user.role === 'exec_secretary') && (
        <div className={styles.pageActions}>
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/visit-planner')}>
            + {t('task.createNew')}
          </Button>
        </div>
      )}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={clsx(styles.summaryNum, styles.summaryNumResponded)}>
            {totalResponded}
          </span>
          <span className={styles.summaryLabel}>{t('taskProgress.summaryAwaiting')}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum}>{totalPending}</span>
          <span className={styles.summaryLabel}>{t('taskProgress.summaryPending')}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={clsx(styles.summaryNum, styles.summaryNumDone)}>{totalCompleted}</span>
          <span className={styles.summaryLabel}>{t('common.complete')}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={clsx(styles.summaryNum, styles.summaryNumExpired)}>{totalExpired}</span>
          <span className={styles.summaryLabel}>{t('taskProgress.expire')}</span>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardBody>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height="56px" className={styles.skeletonRow} />
            ))}
          </CardBody>
        </Card>
      ) : visibleTasks.length === 0 ? (
        <Card>
          <CardBody>
            <p className={styles.empty}>{t('taskProgress.emptyTasks')}</p>
          </CardBody>
        </Card>
      ) : (
        regionIds.map((regionId) => (
          <RegionGroup
            key={regionId}
            regionId={regionId}
            tasks={tasksByRegion[regionId]}
            getUserName={getUserName}
            getUnitName={getUnitName}
            generalSchedules={generalSchedules}
            currentUser={user}
            onDeleteTask={canDeleteTasks ? handleDeleteTask : undefined}
          />
        ))
      )}
    </div>
  )
}
