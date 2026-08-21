import dayjs from 'dayjs'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, CardBody } from '@/components/ui'
import type { Task } from '@/types'
import styles from './PrimaryTaskCard.module.scss'

/**
 * 회장 홈의 주 카드. 스펙 §4.6의 「지금 해야 할 일 하나 + 큰 CTA」다.
 * 강조는 크기·여백·글자 무게와 큰 버튼으로만 한다 — 카드 앞의 색 막대는
 * 스펙 §3이 금지한 표현이다.
 */
export function PrimaryTaskCard({
  task,
  onAction,
}: {
  task: Task
  onAction: (task: Task) => void
}) {
  const { t } = useTranslation()
  const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day')
  const isOverdue = daysLeft < 0
  const isUrgent = daysLeft <= 3

  const TASK_LABELS: Record<string, string> = {
    select_visit: t('schedule.type.ward_visit'),
    select_interview: t('task.type.select_interview'),
  }
  const label = task.title ?? TASK_LABELS[task.type] ?? task.type

  return (
    <Card className={styles.card} data-testid="primary-task">
      <CardBody>
        <div className={styles.head}>
          <span className={styles.label}>{label}</span>
          <Badge variant={isOverdue || isUrgent ? 'danger' : 'warning'}>
            {isOverdue
              ? t('home.overdueBy', { days: Math.abs(daysLeft) })
              : t('home.dueIn', { days: daysLeft })}
          </Badge>
        </div>
        {task.note && <p className={styles.note}>{task.note}</p>}
        <p className={clsx(styles.due, isOverdue && styles.dueOverdue)}>
          {t('taskProgress.dueShort', { date: dayjs(task.dueDate).format('M/D') })}
        </p>
        <Button size="lg" fullWidth onClick={() => onAction(task)}>
          {t('common.process')}
        </Button>
      </CardBody>
    </Card>
  )
}
