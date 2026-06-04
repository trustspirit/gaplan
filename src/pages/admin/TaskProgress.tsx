import { useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import clsx from 'clsx'
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, Pencil, XCircle } from 'lucide-react'
import { authUserAtom } from '@/store/authAtom'
import { useAllTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { adminConfirmSchedule } from '@/services/scheduleService'
import { expireTask, updateTaskDetails } from '@/services/taskService'
import { ALL_UNITS, REGIONS } from '@/constants/regions'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Badge, Button, Skeleton, Input, Select, Modal } from '@/components/ui'
import { MultiDatePicker, ResponseMatrix } from '@/components/domain'
import type { Task, RespondedSlot } from '@/types'
import styles from './TaskProgress.module.scss'

const TASK_LABELS: Record<string, string> = {
  select_visit:     '와드 방문',
  select_interview: '접견/모임',
}

const SLOT_DURATION_OPTIONS = [
  { value: '30', label: '30분' },
  { value: '60', label: '1시간' },
  { value: '90', label: '1.5시간' },
  { value: '120', label: '2시간' },
]

function StatusBadge({ status }: { status: Task['status'] }) {
  if (status === 'completed') return <Badge variant="success">완료</Badge>
  if (status === 'responded') return <Badge variant="default">응답 완료</Badge>
  if (status === 'expired') return <Badge variant="danger">만료</Badge>
  return <Badge variant="warning">미응답</Badge>
}

// ── Edit Task Modal (for pending tasks) ─────────────────────────────────────

interface EditTaskModalProps {
  task: Task
  onClose: () => void
}

function EditTaskModal({ task, onClose }: EditTaskModalProps) {
  const isVisit = task.type === 'select_visit'
  const [dueDate, setDueDate] = useState(task.dueDate)
  // For ward visits: just select available Sundays
  const [availableDates, setAvailableDates] = useState<string[]>(task.availableDates ?? [])
  // For interview/sacrament: per-date time ranges
  const [selectedDates, setSelectedDates] = useState<string[]>(
    (task.availableDateSlots ?? []).map(s => s.date)
  )
  const [dateRanges, setDateRanges] = useState<Record<string, { startTime: string; endTime: string }[]>>(
    Object.fromEntries(
      (task.availableDateSlots ?? []).map(s => [
        s.date,
        s.timeRanges?.length ? s.timeRanges : [{ startTime: '09:00', endTime: '18:00' }]
      ])
    )
  )
  const [slotDuration, setSlotDuration] = useState(String(task.slotDurationMinutes ?? 60))
  const [saving, setSaving] = useState(false)

  function handleDatesChange(dates: string[]) {
    setSelectedDates(dates)
    setDateRanges(prev => {
      const next: typeof prev = {}
      dates.forEach(d => { next[d] = prev[d] ?? [{ startTime: '09:00', endTime: '18:00' }] })
      return next
    })
  }

  const availableDateSlots = selectedDates
    .map(d => ({ date: d, timeRanges: dateRanges[d] ?? [{ startTime: '09:00', endTime: '18:00' }] }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isVisit && availableDates.length === 0) {
      toast.error('가능 일요일을 하나 이상 선택해주세요.')
      return
    }
    if (!isVisit && availableDateSlots.length === 0) {
      toast.error('가능 날짜를 하나 이상 선택해주세요.')
      return
    }
    setSaving(true)
    try {
      await updateTaskDetails(
        task.id,
        {
          dueDate,
          ...(isVisit ? { availableDates } : { availableDateSlots, slotDurationMinutes: parseInt(slotDuration) }),
        },
        task.status === 'responded',
      )
      toast.success('Task가 수정되었습니다.')
      onClose()
    } catch {
      toast.error('수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Task 수정">
      <form className={styles.editForm} onSubmit={handleSave}>
        {isVisit ? (
          <div className={styles.editSection}>
            <p className={styles.editLabel}>가능 방문 일요일 선택</p>
            <MultiDatePicker selected={availableDates} onChange={setAvailableDates} sundayOnly />
          </div>
        ) : (
          <>
            <div className={styles.editSection}>
              <p className={styles.editLabel}>가능 날짜 (캘린더에서 선택)</p>
              <MultiDatePicker selected={selectedDates} onChange={handleDatesChange} />
              {availableDateSlots.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {availableDateSlots.map(s => (
                    <div key={s.date}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                        {dayjs(s.date).format('M/D (ddd)')}
                      </div>
                      {(dateRanges[s.date] ?? []).map((r, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8125rem', marginBottom: '4px' }}>
                          <input type="time" value={r.startTime}
                            style={{ border: '1px solid #e4e4e6', borderRadius: 6, padding: '2px 6px' }}
                            onChange={e => setDateRanges(prev => ({
                              ...prev,
                              [s.date]: prev[s.date].map((x, i) => i === idx ? { ...x, startTime: e.target.value } : x)
                            }))} />
                          <span>~</span>
                          <input type="time" value={r.endTime}
                            style={{ border: '1px solid #e4e4e6', borderRadius: 6, padding: '2px 6px' }}
                            onChange={e => setDateRanges(prev => ({
                              ...prev,
                              [s.date]: prev[s.date].map((x, i) => i === idx ? { ...x, endTime: e.target.value } : x)
                            }))} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Select
              label="시간 단위"
              value={slotDuration}
              onChange={e => setSlotDuration(e.target.value)}
              options={SLOT_DURATION_OPTIONS}
            />
          </>
        )}
        <Input label="마감일" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        {task.status === 'responded' && (
          <p className={styles.resetNote}>⚠ 이미 응답한 내용이 초기화되고 회장이 다시 응답해야 합니다.</p>
        )}
        <div className={styles.modalActions}>
          <Button variant="ghost" type="button" onClick={onClose}>취소</Button>
          <Button type="submit" loading={saving}>저장 및 재전달</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Responded slot row ───────────────────────────────────────────────────────

function RespondedSlotRow({ slot, taskId, onConfirmed }: { slot: RespondedSlot; taskId: string; onConfirmed: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const result = await adminConfirmSchedule({ taskId, slot })
      if (result.success) { toast.success('일정이 확정되었습니다!'); onConfirmed() }
      else toast.error(result.error ?? '확정에 실패했습니다.')
    } catch { toast.error('오류가 발생했습니다.') }
    finally { setLoading(false) }
  }

  return (
    <div className={styles.slotRow}>
      <span className={styles.slotDate}>{dayjs(slot.date).format('M/D (ddd)')}</span>
      <span className={styles.slotTime}>{slot.startTime} ~ {slot.endTime}</span>
      <Button size="sm" onClick={handleConfirm} loading={loading}>이 시간으로 확정</Button>
    </div>
  )
}

// ── Single task row ──────────────────────────────────────────────────────────

interface TaskRowProps { task: Task; presidentName: string; unitName: string }

function TaskRow({ task, presidentName, unitName }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [expiring, setExpiring] = useState(false)
  const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day')
  const isOverdue = daysLeft < 0
  const typeLabel = TASK_LABELS[task.type] ?? task.type
  const hasSlots = (task.respondedSlots?.length ?? 0) > 0
  const canExpire = task.status === 'pending' || task.status === 'responded'
  const canEdit = task.status === 'pending' || task.status === 'responded'
  const isExpired = task.status === 'expired'

  const handleExpire = async () => {
    setExpiring(true)
    try {
      await expireTask(task.id)
      toast.success('Task가 만료되었습니다.')
    } catch { toast.error('만료 처리에 실패했습니다.') }
    finally { setExpiring(false) }
  }

  return (
    <>
      <div className={clsx(
        styles.taskRow,
        task.status === 'responded' && styles.taskRowResponded,
        isExpired && styles.taskRowExpired,
      )}>
        <div className={styles.taskRowMain}>
          <div className={styles.taskRowLeft}>
            <div className={styles.taskIcon}>
              {task.status === 'completed'
                ? <CheckCircle2 size={16} className={styles.iconDone} />
                : task.status === 'responded'
                  ? <Clock size={16} className={styles.iconResponded} />
                  : isExpired
                    ? <XCircle size={16} className={styles.iconExpired} />
                    : <AlertCircle size={16} className={styles.iconPending} />
              }
            </div>
            <div className={styles.taskInfo}>
              <span className={styles.taskPresident}>{presidentName}</span>
              <span className={styles.taskMeta}>
                {unitName} · {typeLabel} · 마감 {dayjs(task.dueDate).format('M/D')}
                {task.status === 'pending' && (
                  <span className={clsx(styles.dDay, isOverdue && styles.dDayOverdue)}>
                    {isOverdue ? ` (D+${Math.abs(daysLeft)})` : ` (D-${daysLeft})`}
                  </span>
                )}
                {task.status === 'responded' && task.respondedAt && (
                  <span className={styles.respondedAt}>
                    {' '}· {dayjs((task.respondedAt as unknown as { seconds: number }).seconds * 1000).format('M/D HH:mm')} 제출
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className={styles.taskRowRight}>
            <StatusBadge status={task.status} />

            {task.status === 'responded' && hasSlots && (
              <button type="button" className={styles.expandBtn} onClick={() => setExpanded(v => !v)}>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded ? '닫기' : `${task.respondedSlots!.length}개 확인`}
              </button>
            )}

            {canEdit && (
              <button type="button" className={styles.actionBtn} onClick={() => setEditing(true)} title="수정">
                <Pencil size={14} />
              </button>
            )}

            {canExpire && (
              <button
                type="button"
                className={clsx(styles.actionBtn, styles.actionBtnDanger)}
                onClick={handleExpire}
                disabled={expiring}
                title="만료"
              >
                <XCircle size={14} />
              </button>
            )}
          </div>
        </div>

        {expanded && task.respondedSlots && (
          <div className={styles.slotsPanel}>
            <p className={styles.slotsPanelTitle}>회장이 제출한 가능 시간</p>
            {task.respondedSlots.map(slot => (
              <RespondedSlotRow
                key={`${slot.date}-${slot.startTime}`}
                slot={slot}
                taskId={task.id}
                onConfirmed={() => setExpanded(false)}
              />
            ))}
          </div>
        )}
      </div>

      {editing && <EditTaskModal task={task} onClose={() => setEditing(false)} />}
    </>
  )
}

// ── Region group ─────────────────────────────────────────────────────────────

interface RegionGroupProps {
  regionId: string
  tasks: Task[]
  getUserName: (uid: string) => string
  getUnitName: (uid: string) => string
}

function RegionGroup({ regionId, tasks, getUserName, getUnitName }: RegionGroupProps) {
  const regionName = REGIONS.find(r => r.id === regionId)?.name ?? regionId
  const responded = tasks.filter(t => t.status === 'responded')
  const pending = tasks.filter(t => t.status === 'pending')
  const completed = tasks.filter(t => t.status === 'completed')
  const expired = tasks.filter(t => t.status === 'expired')

  const renderRows = (list: Task[]) => list.map(t => (
    <TaskRow
      key={t.id}
      task={t}
      presidentName={getUserName(t.assignedTo)}
      unitName={getUnitName(t.assignedTo)}
    />
  ))

  // Group interview/sacrament tasks by batchId for the ResponseMatrix
  const batchGroups: Record<string, Task[]> = {}
  const timeTasks = tasks.filter(t => t.type === 'select_interview')
  for (const t of timeTasks) {
    const key = t.batchId ?? t.id
    if (!batchGroups[key]) batchGroups[key] = []
    batchGroups[key].push(t)
  }
  const matrixBatches = Object.values(batchGroups).filter(
    batch => batch.some(t => t.status === 'responded' || t.status === 'completed')
  )

  return (
    <Card>
      <CardHeader
        title={regionName}
        action={
          <div className={styles.regionSummary}>
            {responded.length > 0 && <Badge variant="default">응답 {responded.length}</Badge>}
            {pending.length > 0 && <Badge variant="warning">미응답 {pending.length}</Badge>}
            {completed.length > 0 && <Badge variant="success">완료 {completed.length}</Badge>}
          </div>
        }
      />
      <CardBody>
        {tasks.length === 0
          ? <p className={styles.empty}>해당 지역 Task 없음</p>
          : (
            <>
              {/* Response Matrix for interview/sacrament batches */}
              {matrixBatches.map(batch => {
                const ref = batch[0]
                const title = ref.title ?? TASK_LABELS[ref.type] ?? ref.type
                return (
                  <div key={ref.batchId ?? ref.id} className={styles.statusSection}>
                    <p className={styles.statusLabel}>
                      {title} 응답 현황 ({batch.filter(t => t.status === 'responded' || t.status === 'completed').length}/{batch.length})
                    </p>
                    <ResponseMatrix
                      tasks={batch}
                      getPresidentName={getUserName}
                    />
                  </div>
                )
              })}

              {responded.length > 0 && (
                <div className={styles.statusSection}>
                  <p className={styles.statusLabel}>확정 대기 ({responded.length})</p>
                  {renderRows(responded.filter(t => t.type === 'select_visit'))}
                </div>
              )}
              {pending.length > 0 && (
                <div className={styles.statusSection}>
                  <p className={styles.statusLabel}>미응답 ({pending.length})</p>
                  {renderRows(pending)}
                </div>
              )}
              {completed.length > 0 && (
                <div className={styles.statusSection}>
                  <p className={styles.statusLabel}>완료 ({completed.length})</p>
                  {renderRows(completed.filter(t => t.type === 'select_visit'))}
                </div>
              )}
              {expired.length > 0 && (
                <div className={styles.statusSection}>
                  <p className={clsx(styles.statusLabel, styles.statusLabelExpired)}>만료 ({expired.length})</p>
                  {renderRows(expired)}
                </div>
              )}
            </>
          )
        }
      </CardBody>
    </Card>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export function TaskProgress() {
  const user = useAtomValue(authUserAtom)!
  const { tasks, loading } = useAllTasks()
  const { users } = useUsers()

  const getUserName = (uid: string) => users.find(u => u.uid === uid)?.name ?? uid
  const getUnitName = (uid: string) => {
    const president = users.find(u => u.uid === uid)
    const unit = ALL_UNITS.find(u => u.id === president?.unitId)
    return unit?.name ?? '-'
  }

  // Group tasks by regionId
  const tasksByRegion = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    const key = t.regionId || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const totalResponded = tasks.filter(t => t.status === 'responded').length
  const totalPending = tasks.filter(t => t.status === 'pending').length
  const totalCompleted = tasks.filter(t => t.status === 'completed').length
  const totalExpired = tasks.filter(t => t.status === 'expired').length

  // Order regions by REGIONS constant order, put unknown at end
  const regionIds = [
    ...REGIONS.map(r => r.id).filter(id => tasksByRegion[id]),
    ...Object.keys(tasksByRegion).filter(id => !REGIONS.find(r => r.id === id)),
  ]

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext="Task 진행 현황" />}>
      <div className={styles.page}>
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={clsx(styles.summaryNum, styles.summaryNumResponded)}>{totalResponded}</span>
            <span className={styles.summaryLabel}>확정 대기</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryNum}>{totalPending}</span>
            <span className={styles.summaryLabel}>미응답</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={clsx(styles.summaryNum, styles.summaryNumDone)}>{totalCompleted}</span>
            <span className={styles.summaryLabel}>완료</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={clsx(styles.summaryNum, styles.summaryNumExpired)}>{totalExpired}</span>
            <span className={styles.summaryLabel}>만료</span>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardBody>
              {[1,2,3].map(i => <Skeleton key={i} height="56px" className={styles.skeletonRow} />)}
            </CardBody>
          </Card>
        ) : tasks.length === 0 ? (
          <Card><CardBody><p className={styles.empty}>생성된 Task가 없습니다.</p></CardBody></Card>
        ) : (
          regionIds.map(regionId => (
            <RegionGroup
              key={regionId}
              regionId={regionId}
              tasks={tasksByRegion[regionId]}
              getUserName={getUserName}
              getUnitName={getUnitName}
            />
          ))
        )}
      </div>
    </AppShell>
  )
}
