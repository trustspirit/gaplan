import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardBody, Skeleton } from '@/components/ui'
import { ScheduleItem } from '@/components/domain/ScheduleItem/ScheduleItem'
import type { Schedule } from '@/types'
import styles from './HomePage.module.scss'

export interface ScheduleListCardProps {
  schedules: Schedule[]
  loading?: boolean
  action?: ReactNode
  showCalendarAdd?: boolean
  canEdit?: boolean
  getUnitName: (unitId: string) => string
  onEdit?: (schedule: Schedule) => void
  onDelete?: (schedule: Schedule) => void
}

export function ScheduleListCard({
  schedules,
  loading,
  action,
  showCalendarAdd,
  canEdit,
  getUnitName,
  onEdit,
  onDelete,
}: ScheduleListCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader title={t('schedule.upcoming')} action={action} />
      <CardBody>
        {loading ? (
          [1, 2].map((i) => <Skeleton key={i} height="44px" className={styles.skeletonItem} />)
        ) : schedules.length === 0 ? (
          <p className={styles.empty}>{t('schedule.noUpcoming')}</p>
        ) : (
          schedules.map((schedule) => (
            <ScheduleItem
              key={schedule.id}
              schedule={schedule}
              unitName={getUnitName(schedule.unitId)}
              showCalendarAdd={showCalendarAdd}
              canEdit={canEdit}
              onEdit={onEdit ? () => onEdit(schedule) : undefined}
              onDelete={onDelete ? () => onDelete(schedule) : undefined}
            />
          ))
        )}
      </CardBody>
    </Card>
  )
}
