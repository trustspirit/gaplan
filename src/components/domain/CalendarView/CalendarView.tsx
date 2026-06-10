import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import type { Schedule, GeneralSchedule } from '@/types'
import { isFastSunday } from '@/utils/fastSunday'
import { Button } from '@/components/ui'
import styles from './CalendarView.module.scss'

// Day-of-week abbreviations derived from dayjs locale (auto-updates with language switch)
const getDOW = () => Array.from({ length: 7 }, (_, i) => dayjs().day(i).format('ddd')) as string[]
const MAX_CHIPS = 2 // max chips shown per cell before "+N"

type ViewMode = 'month' | 'week'

const SCHEDULE_TYPE_COLORS: Record<Schedule['type'], { bg: string; text: string; border: string }> =
  {
    ward_visit: { bg: '#e7f2f6', text: '#0f5f78', border: '#99c9d8' },
    interview: { bg: '#f1ecfb', text: '#5f3ea8', border: '#c4b5fd' },
    meeting: { bg: '#fff3df', text: '#8a4b0f', border: '#f8c471' },
  }

const GENERAL_CATEGORY_COLORS = {
  conference: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  fasting:    { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
  other:      { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
} as const

interface CalendarViewProps {
  schedules: Schedule[]
  generalSchedules?: GeneralSchedule[]
  onDateClick?: (date: string) => void
  selectedDate?: string | null
  /** Resolve a unitId to its display name for schedule chips */
  getUnitName?: (unitId: string) => string
  defaultView?: ViewMode
}

function chipLabel(s: Schedule, getUnitName?: (id: string) => string): string {
  if (s.customTitle) return s.customTitle
  if (s.wardName) return s.wardName
  return getUnitName ? getUnitName(s.unitId) : s.unitId
}

function scheduleTypeColor(type: Schedule['type']) {
  return SCHEDULE_TYPE_COLORS[type]
}

function ScheduleChip({
  schedule,
  getUnitName,
}: {
  schedule: Schedule
  getUnitName?: (id: string) => string
}) {
  const { t } = useTranslation()
  const label = chipLabel(schedule, getUnitName)
  const color = scheduleTypeColor(schedule.type)

  return (
    <span
      className={styles.chip}
      style={{ background: color.bg, color: color.text, borderColor: color.border }}
      title={`${t(`schedule.type.${schedule.type}`)} · ${label}`}
    >
      {label}
    </span>
  )
}

export function CalendarView({
  schedules,
  generalSchedules,
  onDateClick,
  selectedDate,
  getUnitName,
  defaultView = 'month',
}: CalendarViewProps) {
  const { t } = useTranslation()
  const [view, setView] = useState<ViewMode>(defaultView)
  const [current, setCurrent] = useState(dayjs())
  const [weekOffset, setWeekOffset] = useState(0) // mobile 3-day sliding offset
  // Re-derive DOW whenever language changes
  const DOW = getDOW()

  const getSchedulesForDate = (date: string) =>
    schedules.filter((s) => s.date === date && s.status === 'confirmed')

  const getGeneralEventsForDate = (date: string) =>
    (generalSchedules ?? []).filter(gs => gs.date === date)

  const movePeriod = (amount: number) => {
    setCurrent((c) => c.add(amount, view === 'month' ? 'month' : 'week'))
    setWeekOffset(0)
  }

  // ── Month view ─────────────────────────────────────────────────────────────
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
        {DOW.map((d) => (
          <div key={d} className={styles.dow}>
            {d}
          </div>
        ))}
        {days.map((d) => {
          const dateStr = d.format('YYYY-MM-DD')
          const daySchedules = getSchedulesForDate(dateStr)
          const isToday = d.isSame(dayjs(), 'day')
          const isCurrentMonth = d.month() === current.month()
          const isBlocked = isFastSunday(d)
          const isSelected = selectedDate === dateStr
          const visible = daySchedules.slice(0, MAX_CHIPS)
          const extra = daySchedules.length - MAX_CHIPS

          return (
            <div
              key={dateStr}
              className={clsx(
                styles.cell,
                !isCurrentMonth && styles.otherMonth,
                isToday && styles.today,
                isBlocked && styles.blocked,
                isSelected && styles.selected,
              )}
              onClick={() => onDateClick?.(dateStr)}
            >
              <span className={styles.cellDay}>{d.date()}</span>
              {getGeneralEventsForDate(dateStr).map(gs => {
                const c = GENERAL_CATEGORY_COLORS[gs.category]
                return (
                  <span
                    key={gs.id}
                    className={clsx(styles.chip, styles.generalChip)}
                    style={{ background: c.bg, color: c.text, borderColor: c.border }}
                    title={gs.title}
                  >
                    {gs.title}
                  </span>
                )
              })}
              {daySchedules.length > 0 && (
                <div className={styles.chips}>
                  {visible.map((s) => (
                    <ScheduleChip key={s.id} schedule={s} getUnitName={getUnitName} />
                  ))}
                  {extra > 0 && <span className={styles.chipMore}>+{extra}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Week view (time-axis block calendar) ──────────────────────────────────
  const renderWeekView = () => {
    const weekStart = current.startOf('week')
    const allDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'))

    const HOUR_START = 8
    const HOUR_END = 22
    const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
    const HOUR_HEIGHT = 56 // px per hour

    function timeToOffset(time: string): number {
      const [h, m] = time.split(':').map(Number)
      return (h - HOUR_START + m / 60) * HOUR_HEIGHT
    }

    function timeToDuration(start: string, end: string): number {
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      const mins = eh * 60 + em - (sh * 60 + sm)
      return (mins / 60) * HOUR_HEIGHT
    }

    return (
      <div className={styles.timeAxisWrap}>
        {/* Mobile 3-day nav */}
        <div className={styles.mobileDayNav}>
          <button
            type="button"
            className={styles.mobileDayNavBtn}
            onClick={() => setWeekOffset((o) => Math.max(0, o - 3))}
            disabled={weekOffset === 0}
          >
            <ChevronLeft size={16} />
          </button>
          <span className={styles.mobileDayNavLabel}>
            {allDays[weekOffset]?.format('M/D')} –{' '}
            {allDays[Math.min(weekOffset + 2, 6)]?.format('M/D')}
          </span>
          <button
            type="button"
            className={styles.mobileDayNavBtn}
            onClick={() => setWeekOffset((o) => Math.min(4, o + 3))}
            disabled={weekOffset >= 4}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className={styles.timeAxis}>
          {/* Time gutter */}
          <div className={styles.timeGutter}>
            <div className={styles.timeGutterHeader} />
            {HOURS.map((h) => (
              <div key={h} className={styles.timeLabel} style={{ height: HOUR_HEIGHT }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className={styles.dayColumns}>
            {allDays.map((d, idx) => {
              const dateStr = d.format('YYYY-MM-DD')
              const daySchedules = getSchedulesForDate(dateStr)
              const isToday = d.isSame(dayjs(), 'day')
              const isBlocked = isFastSunday(d)
              const isSelected = selectedDate === dateStr
              const isMobileVisible = idx >= weekOffset && idx <= weekOffset + 2

              return (
                <div
                  key={dateStr}
                  className={clsx(
                    styles.dayCol,
                    isToday && styles.dayColToday,
                    isBlocked && styles.dayColBlocked,
                    isSelected && styles.dayColSelected,
                    !isMobileVisible && styles.dayColHiddenMobile,
                  )}
                  onClick={() => !isBlocked && onDateClick?.(dateStr)}
                >
                  {/* Day header */}
                  <div className={clsx(styles.dayHeader, isToday && styles.dayHeaderToday)}>
                    <span className={styles.dayHeaderDow}>{DOW[d.day()]}</span>
                    <span
                      className={clsx(styles.dayHeaderNum, isToday && styles.dayHeaderNumToday)}
                    >
                      {d.format('D')}
                    </span>
                  </div>
                  {getGeneralEventsForDate(dateStr).map(gs => {
                    const c = GENERAL_CATEGORY_COLORS[gs.category]
                    return (
                      <div
                        key={gs.id}
                        className={styles.generalDayBanner}
                        style={{ background: c.bg, color: c.text, borderColor: c.border }}
                      >
                        {gs.title}
                      </div>
                    )
                  })}

                  {/* Time grid background + schedule blocks */}
                  <div className={styles.dayBody} style={{ height: HOURS.length * HOUR_HEIGHT }}>
                    {/* Hour grid lines */}
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className={styles.hourLine}
                        style={{ top: (h - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Schedule blocks */}
                    {daySchedules.map((s) => {
                      const top = timeToOffset(s.startTime)
                      const height = Math.max(timeToDuration(s.startTime, s.endTime), 20)
                      const color = scheduleTypeColor(s.type)
                      return (
                        <div
                          key={s.id}
                          className={styles.scheduleBlock}
                          style={{
                            top,
                            height,
                            background: color.bg,
                            color: color.text,
                            borderColor: color.border,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className={styles.scheduleBlockLabel}>
                            {chipLabel(s, getUnitName)}
                          </span>
                          <span className={styles.scheduleBlockTime}>
                            {s.startTime}–{s.endTime}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.controls}>
        <Button variant="ghost" size="sm" onClick={() => movePeriod(-1)}>
          <ChevronLeft size={16} />
        </Button>
        <span className={styles.period}>
          {view === 'month'
            ? current.format('YYYY년 M월')
            : `${current.startOf('week').format('M/D')} – ${current.endOf('week').format('M/D')}`}
        </span>
        <Button variant="ghost" size="sm" onClick={() => movePeriod(1)}>
          <ChevronRight size={16} />
        </Button>
        <div className={styles.viewToggle}>
          <Button
            variant={view === 'month' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setView('month')}
          >
            {t('common.monthView')}
          </Button>
          <Button
            variant={view === 'week' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setView('week')}
          >
            {t('common.weekView')}
          </Button>
        </div>
      </div>

      {view === 'month' ? renderMonthView() : renderWeekView()}

      <div className={styles.legend}>
        {(['ward_visit', 'interview', 'meeting'] as const)
          .filter((type) => schedules.some((s) => s.type === type && s.status === 'confirmed'))
          .map((type) => {
            const c = scheduleTypeColor(type)
            return (
              <span key={type} style={{ color: c.text }}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: c.bg, borderColor: c.border }}
                />{' '}
                {t(`schedule.type.${type}`)}
              </span>
            )
          })}
        <span className={styles.legendBlocked}>
          <span className={clsx(styles.legendSwatch, styles.swatchBlocked)} />{' '}
          {t('common.fastSundayLegend')}
        </span>
      </div>
    </div>
  )
}
