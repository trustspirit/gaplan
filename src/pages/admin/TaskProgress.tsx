import { useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import clsx from 'clsx'
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { authUserAtom } from '@/store/authAtom'
import { useAllTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { adminConfirmSchedule } from '@/services/scheduleService'
import { ALL_UNITS } from '@/constants/regions'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Badge, Button, Skeleton } from '@/components/ui'
import type { Task, RespondedSlot } from '@/types'
import styles from './TaskProgress.module.scss'

const TASK_LABELS: Record<string, string> = {
  select_visit: '와드 방문',
  select_interview: '접견',
  select_meeting: '모임',
}

function StatusBadge({ status }: { status: Task['status'] }) {
  if (status === 'completed') return <Badge variant="success">완료</Badge>
  if (status === 'responded') return <Badge variant="default">응답 완료</Badge>
  return <Badge variant="warning">미응답</Badge>
}

interface RespondedSlotRowProps {
  slot: RespondedSlot
  taskId: string
  onConfirmed: () => void
}

function RespondedSlotRow({ slot, taskId, onConfirmed }: RespondedSlotRowProps) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const result = await adminConfirmSchedule({ taskId, slot })
      if (result.success) {
        toast.success('일정이 확정되었습니다!')
        onConfirmed()
      } else {
        toast.error(result.error ?? '확정에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.slotRow}>
      <span className={styles.slotDate}>{dayjs(slot.date).format('M/D (ddd)')}</span>
      <span className={styles.slotTime}>{slot.startTime} ~ {slot.endTime}</span>
      <Button size="sm" onClick={handleConfirm} loading={loading}>
        이 시간으로 확정
      </Button>
    </div>
  )
}

interface TaskRowProps {
  task: Task
  presidentName: string
  unitName: string
}

function TaskRow({ task, presidentName, unitName }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false)
  const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day')
  const isOverdue = daysLeft < 0
  const typeLabel = TASK_LABELS[task.type] ?? task.type
  const hasSlots = (task.respondedSlots?.length ?? 0) > 0

  return (
    <div className={clsx(styles.taskRow, task.status === 'responded' && styles.taskRowResponded)}>
      <div className={styles.taskRowMain}>
        <div className={styles.taskRowLeft}>
          <div className={styles.taskIcon}>
            {task.status === 'completed'
              ? <CheckCircle2 size={16} className={styles.iconDone} />
              : task.status === 'responded'
                ? <Clock size={16} className={styles.iconResponded} />
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
                  · {dayjs((task.respondedAt as unknown as { seconds: number }).seconds * 1000).format('M/D HH:mm')} 제출
                </span>
              )}
            </span>
          </div>
        </div>
        <div className={styles.taskRowRight}>
          <StatusBadge status={task.status} />
          {task.status === 'responded' && hasSlots && (
            <button
              type="button"
              className={styles.expandBtn}
              onClick={() => setExpanded(prev => !prev)}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {expanded ? '닫기' : `${task.respondedSlots!.length}개 시간 확인`}
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
  )
}

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

  const pending = tasks.filter(t => t.status === 'pending')
  const responded = tasks.filter(t => t.status === 'responded')
  const completed = tasks.filter(t => t.status === 'completed')

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext="Task 진행 현황" />}>
      <div className={styles.page}>
        {/* Summary row */}
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryNum}>{pending.length}</span>
            <span className={styles.summaryLabel}>미응답</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={clsx(styles.summaryNum, styles.summaryNumResponded)}>{responded.length}</span>
            <span className={styles.summaryLabel}>확정 대기</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={clsx(styles.summaryNum, styles.summaryNumDone)}>{completed.length}</span>
            <span className={styles.summaryLabel}>완료</span>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardBody>
              {[1,2,3].map(i => <Skeleton key={i} height="56px" className={styles.skeletonRow} />)}
            </CardBody>
          </Card>
        ) : (
          <>
            {responded.length > 0 && (
              <Card>
                <CardHeader title={`확정 대기 (${responded.length})`} />
                <CardBody>
                  {responded.map(t => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      presidentName={getUserName(t.assignedTo)}
                      unitName={getUnitName(t.assignedTo)}
                    />
                  ))}
                </CardBody>
              </Card>
            )}

            {pending.length > 0 && (
              <Card>
                <CardHeader title={`미응답 (${pending.length})`} />
                <CardBody>
                  {pending.map(t => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      presidentName={getUserName(t.assignedTo)}
                      unitName={getUnitName(t.assignedTo)}
                    />
                  ))}
                </CardBody>
              </Card>
            )}

            {completed.length > 0 && (
              <Card>
                <CardHeader title={`완료 (${completed.length})`} />
                <CardBody>
                  {completed.map(t => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      presidentName={getUserName(t.assignedTo)}
                      unitName={getUnitName(t.assignedTo)}
                    />
                  ))}
                </CardBody>
              </Card>
            )}

            {tasks.length === 0 && (
              <Card>
                <CardBody>
                  <p className={styles.empty}>생성된 Task가 없습니다.</p>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
