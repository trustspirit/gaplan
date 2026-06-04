import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import type { Schedule } from '@/types'
import { isFastSunday } from '@/utils/fastSunday'
import { ALL_UNITS, getUnitColor, getRegionColor, REGIONS } from '@/constants/regions'
import { Button } from '@/components/ui'
import styles from './CalendarView.module.scss'

// Day-of-week abbreviations derived from dayjs locale (auto-updates with language switch)
const getDOW = () => Array.from({ length: 7 }, (_, i) => dayjs().day(i).format('ddd')) as string[]
const MAX_CHIPS = 2   // max chips shown per cell before "+N"

type ViewMode = 'month' | 'week'

interface CalendarViewProps {
  schedules: Schedule[]
  onDateClick?: (date: string) => void
  selectedDate?: string | null
  /** Resolve a unitId to its display name for schedule chips */
  getUnitName?: (unitId: string) => string
  defaultView?: ViewMode
}

function chipLabel(s: Schedule, getUnitName?: (id: string) => string): string {
  if (s.wardName) return s.wardName
  return getUnitName ? getUnitName(s.unitId) : s.unitId
}

function regionLabel(unitId: string): string {
  const unit = ALL_UNITS.find(u => u.id === unitId)
  return unit?.name ?? unitId
}

function ScheduleChip({ schedule, getUnitName }: { schedule: Schedule; getUnitName?: (id: string) => string }) {
  const label = chipLabel(schedule, getUnitName)
  const color = getUnitColor(schedule.unitId)

  return (
    <span
      className={styles.chip}
      style={{ background: color.bg, color: color.text }}
      title={regionLabel(schedule.unitId)}
    >
      {label}
    </span>
  )
}

export function CalendarView({
  schedules,
  onDateClick,
  selectedDate,
  getUnitName,
  defaultView = 'month',
}: CalendarViewProps) {
  const { t } = useTranslation()
  const [view, setView] = useState<ViewMode>(defaultView)
  const [current, setCurrent] = useState(dayjs())
  // Re-derive DOW whenever language changes
  const DOW = getDOW()

  const getSchedulesForDate = (date: string) =>
    schedules.filter(s => s.date === date && s.status === 'confirmed')

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
        {DOW.map(d => (
          <div key={d} className={styles.dow}>{d}</div>
        ))}
        {days.map(d => {
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
              {daySchedules.length > 0 && (
                <div className={styles.chips}>
                  {visible.map(s => (
                    <ScheduleChip key={s.id} schedule={s} getUnitName={getUnitName} />
                  ))}
                  {extra > 0 && (
                    <span className={styles.chipMore}>+{extra}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Week view ──────────────────────────────────────────────────────────────
  const renderWeekView = () => {
    const weekStart = current.startOf('week')
    const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'))

    return (
      <div className={styles.weekGrid}>
        {days.map(d => {
          const dateStr = d.format('YYYY-MM-DD')
          const daySchedules = getSchedulesForDate(dateStr)
          const isToday = d.isSame(dayjs(), 'day')
          const isBlocked = isFastSunday(d)
          const isSelected = selectedDate === dateStr

          return (
            <div
              key={dateStr}
              className={clsx(
                styles.weekRow,
                isSelected && styles.weekRowSelected,
              )}
              onClick={() => !isBlocked && onDateClick?.(dateStr)}
            >
              <span className={clsx(
                styles.weekDayLabel,
                isToday && styles.weekDayLabelToday,
                isBlocked && styles.weekDayBlocked,
              )}>
                {DOW[d.day()]} {d.format('M/D')}{isBlocked ? ` ${t('common.fastSundayLabel')}` : ''}
              </span>
              <div className={styles.weekSchedules}>
                {daySchedules.length === 0 ? (
                  <span className={styles.weekEmpty}>—</span>
                ) : (
                  daySchedules.map(s => (
                    <ScheduleChip key={s.id} schedule={s} getUnitName={getUnitName} />
                  ))
                )}
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
          {view === 'month'
            ? current.format('YYYY년 M월')
            : `${current.startOf('week').format('M/D')} – ${current.endOf('week').format('M/D')}`}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setCurrent(c => c.add(1, view === 'month' ? 'month' : 'week'))}>
          <ChevronRight size={16} />
        </Button>
        <div className={styles.viewToggle}>
          <Button variant={view === 'month' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('month')}>{t('common.monthView')}</Button>
          <Button variant={view === 'week' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('week')}>{t('common.weekView')}</Button>
        </div>
      </div>

      {view === 'month' ? renderMonthView() : renderWeekView()}

      <div className={styles.legend}>
        {(() => {
          const visibleRegionIds = new Set(
            schedules
              .map(s => ALL_UNITS.find(u => u.id === s.unitId)?.regionId)
              .filter((id): id is string => Boolean(id))
          )
          const legendRegions = visibleRegionIds.size > 0
            ? REGIONS.filter(r => visibleRegionIds.has(r.id))
            : REGIONS
          return legendRegions.map(r => {
            const c = getRegionColor(r.id)
            return (
              <span key={r.id} style={{ color: c.text }}>
                <span className={styles.legendSwatch} style={{ background: c.bg }} /> {r.name}
              </span>
            )
          })
        })()}
        <span className={styles.legendBlocked}><span className={clsx(styles.legendSwatch, styles.swatchBlocked)} /> {t('common.fastSundayLegend')}</span>
      </div>
    </div>
  )
}
