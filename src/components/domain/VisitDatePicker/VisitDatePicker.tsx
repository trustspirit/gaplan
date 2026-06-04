import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { isFastSunday } from '@/utils/fastSunday'
import type { TimeSlot } from '@/types'
import styles from './VisitDatePicker.module.scss'

interface VisitDatePickerProps {
  slots: TimeSlot[]           // from computeAvailableSlots (Sundays only expected)
  selected: TimeSlot | null
  onSelect: (slot: TimeSlot) => void
}

export function VisitDatePicker({ slots, selected, onSelect }: VisitDatePickerProps) {
  const { t } = useTranslation()
  const DOW = Array.from({ length: 7 }, (_, i) => dayjs().day(i).format('ddd'))
  const [current, setCurrent] = useState(dayjs())

  const slotByDate = new Map(slots.map(s => [s.date, s]))

  const start = current.startOf('month').startOf('week')
  const end = current.endOf('month').endOf('week')
  const days: dayjs.Dayjs[] = []
  let day = start
  while (day.isBefore(end) || day.isSame(end, 'day')) {
    days.push(day)
    day = day.add(1, 'day')
  }

  const availableCount = slots.filter(s => s.isAvailable).length

  return (
    <div className={styles.picker}>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => setCurrent(c => c.subtract(1, 'month'))}
        >
          <ChevronLeft size={16} />
        </button>
        <span className={styles.period}>{current.format('YYYY년 M월')}</span>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => setCurrent(c => c.add(1, 'month'))}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className={styles.grid}>
        {DOW.map(d => (
          <div key={d} className={clsx(styles.dowLabel, d === '일' && styles.dowSun)}>
            {d}
          </div>
        ))}
        {days.map(d => {
          const dateStr = d.format('YYYY-MM-DD')
          const isSunday = d.day() === 0
          const isCurrentMonth = d.month() === current.month()
          const isToday = d.isSame(dayjs(), 'day')
          const isFast = isFastSunday(d)
          const slot = slotByDate.get(dateStr)
          const isAvailable = isSunday && !isFast && !!slot?.isAvailable
          const isSelected = selected?.date === dateStr
          const isPast = d.isBefore(dayjs(), 'day')

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && slot && onSelect(slot)}
              className={clsx(
                styles.cell,
                !isCurrentMonth && styles.otherMonth,
                isSunday && isCurrentMonth && !isFast && !isPast && styles.sunday,
                isFast && isCurrentMonth && styles.fastSunday,
                isToday && styles.today,
                isSelected && styles.selected,
              )}
            >
              <span className={styles.day}>{d.date()}</span>
              {isFast && isCurrentMonth && (
                <span className={styles.fastLabel}>{t('common.fastSunday')}</span>
              )}
            </button>
          )
        })}
      </div>

      {availableCount === 0 && (
        <p className={styles.empty}>{t('schedule.noDates')}</p>
      )}

      <div className={styles.legend}>
        <span className={clsx(styles.legendDot, styles.legendAvailable)} />
        <span className={styles.legendText}>{t('calendar.legendAvailable')}</span>
        <span className={clsx(styles.legendDot, styles.legendFast)} />
        <span className={styles.legendText}>{t('common.fastSundayLegend')}</span>
      </div>
    </div>
  )
}
