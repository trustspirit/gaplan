import { AlertCircle, Clock } from 'lucide-react'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import type { Task } from '@/types'
import { Badge, Button } from '@/components/ui'
import styles from './TaskCard.module.scss'

interface TaskCardProps { task: Task; onAction?: (task: Task) => void }

export function TaskCard({ task, onAction }: TaskCardProps) {
  const { t } = useTranslation()
  const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day')
  const isUrgent = daysLeft <= 3
  const isOverdue = daysLeft < 0
  const isResponded = task.status === 'responded'
  // Ward visit tasks in responded state can be reopened for editing
  const canReopen = isResponded && task.type === 'select_visit'
  const TASK_LABELS: Record<string, string> = {
    select_visit:     t('schedule.type.ward_visit'),
    select_interview: t('task.type.select_interview'),
  }
  const label = task.title ?? (TASK_LABELS[task.type] ?? task.type)
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
            <span className={styles.respondedHint}>
              {t('task.awaitingConfirmation')}
            </span>
          )}
        </div>
      </div>
      <div className={styles.right}>
        {!isResponded && (
          <Badge variant={isOverdue ? 'danger' : isUrgent ? 'danger' : 'warning'}>{dDayLabel}</Badge>
        )}
        {isResponded && !canReopen && (
          <Badge variant="default">{t('common.waiting')}</Badge>
        )}
        {(!isResponded || canReopen) && onAction && (
          <Button size="sm" variant={canReopen ? 'secondary' : 'primary'} onClick={() => onAction(task)}>
            {canReopen ? t('common.edit') : t('common.process')}
          </Button>
        )}
      </div>
    </div>
  )
}
