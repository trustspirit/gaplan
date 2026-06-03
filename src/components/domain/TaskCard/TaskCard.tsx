import { AlertCircle } from 'lucide-react'
import dayjs from 'dayjs'
import clsx from 'clsx'
import type { Task } from '@/types'
import { Badge, Button } from '@/components/ui'
import styles from './TaskCard.module.scss'

interface TaskCardProps { task: Task; onAction: (task: Task) => void }
export function TaskCard({ task, onAction }: TaskCardProps) {
  const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day')
  const isUrgent = daysLeft <= 3
  const isOverdue = daysLeft < 0
  const label = task.type === 'select_visit' ? '와드 방문 일정 선택' : '접견 일정 선택'
  const dDayLabel = isOverdue ? `D+${Math.abs(daysLeft)}` : `D-${daysLeft}`
  return (
    <div className={clsx(styles.card, isUrgent && styles.urgent)}>
      <div className={styles.left}>
        <AlertCircle size={14} className={styles.icon} />
        <span className={styles.label}>{label}</span>
      </div>
      <div className={styles.right}>
        <Badge variant={isOverdue ? 'danger' : isUrgent ? 'danger' : 'warning'}>{dDayLabel}</Badge>
        <Button size="sm" onClick={() => onAction(task)}>처리</Button>
      </div>
    </div>
  )
}
