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
  /**
   * 달력 격자에 그릴 원본. 종류·지역 필터와 삭제 대기(hiddenIds)는 이미 적용돼
   * 있다. 기간(range)만은 일부러 빠져 있다 — 격자는 스스로 월/주를 넘기므로,
   * 범위 밖 달로 넘어가면 격자만 텅 비는 걸 막기 위해서다. 우측 목록(items)만
   * 기간까지 반영한다.
   */
  schedules: Schedule[]
  generalSchedules: GeneralSchedule[]
  /** 필터가 모두 적용된 병합 목록(기간 포함). 날짜 선택이 없을 때 우측 목록이 이걸 그린다. */
  items: BoardItem[]
  /**
   * 종류·지역·hiddenIds는 items와 같지만 기간(range)이 빠진 병합 목록. 격자가
   * 범위 밖 달의 일정도 그리기 때문에, 그 날을 클릭했을 때 우측 목록이
   * items로는 절대 못 찾는 항목을 여기서 찾는다. 날짜 선택이 있을 때만 쓴다.
   */
  allItems: BoardItem[]
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
  allItems,
  getUnitName,
  selectedDate,
  onSelectDate,
  renderItem,
}: ScheduleCalendarPanelProps) {
  const { t } = useTranslation()

  // 같은 날을 다시 누르면 선택이 풀린다.
  const handleDateClick = (date: string) => onSelectDate(selectedDate === date ? null : date)

  // 날짜가 선택되면 기간(range) 밖이라도 그 날의 항목을 보여준다 — 격자는
  // range를 안 타므로(위 주석) 선택된 날이 range 밖일 수 있다. items로
  // 찾으면 격자엔 보이는데 목록은 비는 모순이 생긴다.
  const listed = selectedDate ? allItems.filter((item) => item.date === selectedDate) : items

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
