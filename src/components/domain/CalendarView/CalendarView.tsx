import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import clsx from 'clsx'
import type { Schedule } from '@/types'
import { Button } from '@/components/ui'
import styles from './CalendarView.module.scss'

type ViewMode = 'month' | 'week'

interface CalendarViewProps {
  schedules: Schedule[]
  onDateClick?: (date: string) => void
  defaultView?: ViewMode
}
export function CalendarView({ schedules, onDateClick, defaultView = 'month' }: CalendarViewProps) {
  const [view, setView] = useState<ViewMode>(defaultView)
  const [current, setCurrent] = useState(dayjs())

  const getSchedulesForDate = (date: string) =>
    schedules.filter(s => s.date === date && s.status === 'confirmed')

  const isFastSunday = (d: dayjs.Dayjs) => {
    const firstDay = d.startOf('month')
    const daysToSunday = (7 - firstDay.day()) % 7
    const firstSundayDate = firstDay.date() + daysToSunday
    return d.date() === firstSundayDate && d.day() === 0
  }

  const renderMonthView = () => {
    const start = current.startOf('month').startOf('week')
    const end = current.endOf('month').endOf('week')
    const days: dayjs.Dayjs[] = []
    let day = start
    while (day.isBefore(end) || day.isSame(end, 'day')) {
      days.push(day)
      day = day.add(1, 'day')
    }
    return (
      <div className={styles.monthGrid}>
        {['일','월','화','수','목','금','토'].map(d => (
          <div key={d} className={styles.dow}>{d}</div>
        ))}
        {days.map(d => {
          const dateStr = d.format('YYYY-MM-DD')
          const daySchedules = getSchedulesForDate(dateStr)
          const isToday = d.isSame(dayjs(), 'day')
          const isCurrentMonth = d.month() === current.month()
          const isBlocked = isFastSunday(d)
          return (
            <div
              key={dateStr}
              className={clsx(
                styles.cell,
                !isCurrentMonth && styles.otherMonth,
                isToday && styles.today,
                isBlocked && styles.blocked,
              )}
              onClick={() => onDateClick?.(dateStr)}
            >
              <span className={styles.cellDay}>{d.date()}</span>
              <div className={styles.dots}>
                {daySchedules.map(s => (
                  <span key={s.id} className={clsx(styles.dot, s.type === 'ward_visit' ? styles.dotVisit : styles.dotInterview)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.controls}>
        <Button variant="ghost" size="sm" onClick={() => setCurrent(c => c.subtract(1, view === 'month' ? 'month' : 'week'))}>
          <ChevronLeft size={16} />
        </Button>
        <span className={styles.period}>
          {view === 'month' ? current.format('YYYY년 M월') : `${current.startOf('week').format('M/D')} – ${current.endOf('week').format('M/D')}`}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setCurrent(c => c.add(1, view === 'month' ? 'month' : 'week'))}>
          <ChevronRight size={16} />
        </Button>
        <div className={styles.viewToggle}>
          <Button variant={view === 'month' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('month')}>월</Button>
          <Button variant={view === 'week' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('week')}>주</Button>
        </div>
      </div>
      {view === 'month' ? renderMonthView() : (
        <p className={styles.wip}>주간 뷰 — 추후 구현</p>
      )}
      <div className={styles.legend}>
        <span><span className={clsx(styles.dot, styles.dotVisit)} /> 와드 방문</span>
        <span><span className={clsx(styles.dot, styles.dotInterview)} /> 접견</span>
        <span><span className={clsx(styles.dot, styles.dotBlocked)} /> 금식일</span>
      </div>
    </div>
  )
}
