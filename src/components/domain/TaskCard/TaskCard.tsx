import { AlertCircle, Clock } from 'lucide-react'
import dayjs from 'dayjs'
import clsx from 'clsx'
import type { Task } from '@/types'
import { Badge, Button } from '@/components/ui'
import styles from './TaskCard.module.scss'

const TASK_LABELS: Record<string, string> = {
  select_visit:     '와드 방문',
  select_interview: '접견/모임 일정',
}

interface TaskCardProps { task: Task; onAction?: (task: Task) => void }

export function TaskCard({ task, onAction }: TaskCardProps) {
  const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day')
  const isUrgent = daysLeft <= 3
  const isOverdue = daysLeft < 0
  const isResponded = task.status === 'responded'
  const label = TASK_LABELS[task.type] ?? task.type
  const dDayLabel = isOverdue ? `D+${Math.abs(daysLeft)}` : `D-${daysLeft}`

  return (
    <div className={clsx(styles.card, isUrgent && !isResponded && styles.urgent, isResponded && styles.responded)}>
      <div className={styles.left}>
        {isResponded
          ? <Clock size={14} className={styles.iconResponded} />
          : <AlertCircle size={14} className={styles.icon} />
        }
        <div className={styles.labelGroup}>
          <span className={styles.label}>{label}</span>
          {isResponded && (
            <span className={styles.respondedHint}>제출 완료 · 확정 대기 중</span>
          )}
        </div>
      </div>
      <div className={styles.right}>
        {!isResponded && (
          <Badge variant={isOverdue ? 'danger' : isUrgent ? 'danger' : 'warning'}>{dDayLabel}</Badge>
        )}
        {isResponded
          ? <Badge variant="default">대기 중</Badge>
          : <Button size="sm" onClick={() => onAction?.(task)}>처리</Button>
        }
      </div>
    </div>
  )
}
