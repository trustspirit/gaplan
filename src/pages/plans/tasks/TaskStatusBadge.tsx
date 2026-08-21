import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui'
import type { Task } from '@/types'

export function StatusBadge({ status }: { status: Task['status'] }) {
  const { t } = useTranslation()
  if (status === 'completed') return <Badge variant="success">{t('task.status.completed')}</Badge>
  if (status === 'responded')
    return <Badge variant="default">{t('task.statusBadge.responded')}</Badge>
  if (status === 'expired') return <Badge variant="danger">{t('task.status.expired')}</Badge>
  return <Badge variant="warning">{t('task.status.pending')}</Badge>
}
