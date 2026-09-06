import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardBody, Skeleton } from '@/components/ui'
import { ScheduleItem } from '@/components/domain/ScheduleItem/ScheduleItem'
import { SwipeOpenRowProvider } from '@/components/domain/ScheduleItem/swipeOpenRow'
import type { Schedule } from '@/types'
import { groupByWhen, type WhenGroupKey } from './homeScheduleGroups'
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
  /** 'YYYY-MM-DD'. 호출자가 넘겨 테스트가 시계에 매이지 않게 한다. */
  today: string
}

const GROUP_LABEL_KEY: Record<WhenGroupKey, string> = {
  today: 'schedule.groupToday',
  tomorrow: 'schedule.groupTomorrow',
  thisWeek: 'schedule.groupThisWeek',
  later: 'schedule.groupLater',
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
  today,
}: ScheduleListCardProps) {
  const { t } = useTranslation()
  const groups = groupByWhen(schedules, today)

  return (
    <Card>
      <CardHeader title={t('schedule.upcoming')} action={action} />
      <CardBody>
        <SwipeOpenRowProvider>
          {loading ? (
            [1, 2].map((i) => <Skeleton key={i} height="44px" className={styles.skeletonItem} />)
          ) : schedules.length === 0 ? (
            <p className={styles.empty}>{t('schedule.noUpcoming')}</p>
          ) : (
            // 열린 행은 목록 전체에서 하나뿐이다 — 그룹을 가로질러도 마찬가지라
            // Provider가 그룹 바깥을 감싼다.
            [...groups.entries()].map(([key, group]) => (
              <section key={key} className={styles.group}>
                <h3 className={styles.groupLabel}>{t(GROUP_LABEL_KEY[key])}</h3>
                {group.map((schedule) => (
                  <ScheduleItem
                    key={schedule.id}
                    schedule={schedule}
                    unitName={getUnitName(schedule.unitId)}
                    showCalendarAdd={showCalendarAdd}
                    canEdit={canEdit}
                    onEdit={onEdit ? () => onEdit(schedule) : undefined}
                    onDelete={onDelete ? () => onDelete(schedule) : undefined}
                  />
                ))}
              </section>
            ))
          )}
        </SwipeOpenRowProvider>
      </CardBody>
    </Card>
  )
}
