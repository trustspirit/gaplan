import type { ReactNode } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { EmptyState, StatCard } from '@/components/ui'
import { countBoardItems, groupBoardItemsByMonth, type BoardItem } from './scheduleFilters'
import styles from './ScheduleListPanel.module.scss'

interface ScheduleListPanelProps {
  /** 종류·지역·기간까지 반영한 목록. 지표는 이걸로 센다(판정 R27). */
  items: BoardItem[]
  /** 상태 필터까지 반영한 목록. 화면에 그리는 건 이것뿐이다. */
  visible: BoardItem[]
  /** 'YYYY-MM-DD'. 호출자가 넘겨 테스트가 시계에 매이지 않게 한다. */
  today: string
  renderItem: (item: BoardItem) => ReactNode
}

export function ScheduleListPanel({ items, visible, today, renderItem }: ScheduleListPanelProps) {
  const { t } = useTranslation()
  const counts = countBoardItems(items, today)
  const grouped = groupBoardItemsByMonth(visible)

  return (
    <div className={styles.panel}>
      <div className={styles.stats}>
        <StatCard label={t('schedules.thisMonth')} value={counts.thisMonth} />
        <StatCard label={t('schedules.upcoming')} value={counts.upcoming} />
        <StatCard label={t('schedules.completed')} value={counts.completed} />
      </div>

      {grouped.size === 0 ? (
        <EmptyState title={t('schedules.emptyTitle')} description={t('schedules.emptyDesc')} />
      ) : (
        [...grouped.entries()].map(([monthKey, monthItems]) => (
          <section key={monthKey} className={styles.monthGroup}>
            <h3 className={styles.monthLabel}>
              {dayjs(monthKey).format(t('calendar.monthTitleFormat'))}
            </h3>
            <div className={styles.itemList}>{monthItems.map(renderItem)}</div>
          </section>
        ))
      )}
    </div>
  )
}
