import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardBody, EmptyState } from '@/components/ui'
import { CalendarView, type ViewMode } from '@/components/domain/CalendarView/CalendarView'
import type { GeneralSchedule, Schedule } from '@/types'
import type { BoardItem } from './scheduleFilters'
import styles from './ScheduleCalendarPanel.module.scss'

interface ScheduleCalendarPanelProps {
  view: ViewMode
  /** 달력 격자에 그릴 원본. 종류·지역 필터는 이미 적용돼 있다. */
  schedules: Schedule[]
  generalSchedules: GeneralSchedule[]
  /** 필터가 모두 적용된 병합 목록. 우측 목록이 이걸 그린다. */
  items: BoardItem[]
  getUnitName: (unitId: string) => string
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
  /** 행 하나를 그리는 방법. 페이지가 편집·삭제·참석 핸들러를 안고 있으므로 위에서 내려온다. */
  renderItem: (item: BoardItem) => ReactNode
}

export function ScheduleCalendarPanel({
  view,
  schedules,
  generalSchedules,
  items,
  getUnitName,
  selectedDate,
  onSelectDate,
  renderItem,
}: ScheduleCalendarPanelProps) {
  const { t } = useTranslation()

  // 같은 날을 다시 누르면 선택이 풀린다.
  const handleDateClick = (date: string) => onSelectDate(selectedDate === date ? null : date)

  const listed = selectedDate ? items.filter((item) => item.date === selectedDate) : items

  const listTitle = selectedDate
    ? t('calendar.selectedDateTitle', { date: dayjs(selectedDate).format('M/D (ddd)') })
    : t('calendar.upcomingTitle')

  return (
    <div className={styles.layout}>
      <div className={styles.calendarCol}>
        <CalendarView
          view={view}
          schedules={schedules}
          generalSchedules={generalSchedules}
          onDateClick={handleDateClick}
          selectedDate={selectedDate}
          getUnitName={getUnitName}
        />
      </div>
      <div className={styles.listCol}>
        <Card>
          <CardHeader
            title={listTitle}
            action={
              selectedDate ? (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => onSelectDate(null)}
                  aria-label={t('calendar.clearSelection')}
                >
                  <X size={14} />
                </button>
              ) : undefined
            }
          />
          <CardBody>
            {listed.length === 0 ? (
              <EmptyState
                title={t('schedules.emptyTitle')}
                description={t('schedules.emptyDesc')}
              />
            ) : (
              listed.map(renderItem)
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
