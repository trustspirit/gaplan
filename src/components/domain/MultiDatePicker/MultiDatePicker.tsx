import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
dayjs.locale('ko')
import clsx from 'clsx'
import styles from './MultiDatePicker.module.scss'

const DOW = ['일', '월', '화', '수', '목', '금', '토'] as const

interface MultiDatePickerProps {
  selected: string[]          // YYYY-MM-DD[]
  onChange: (dates: string[]) => void
  minDate?: string            // default: today
  maxDate?: string            // default: today + 90 days
}

export function MultiDatePicker({ selected, onChange, minDate, maxDate }: MultiDatePickerProps) {
  const [current, setCurrent] = useState(dayjs())
  const min = dayjs(minDate ?? dayjs().format('YYYY-MM-DD'))
  const max = dayjs(maxDate ?? dayjs().add(90, 'day').format('YYYY-MM-DD'))

  const start = current.startOf('month').startOf('week')
  const end = current.endOf('month').endOf('week')
  const days: dayjs.Dayjs[] = []
  let d = start
  while (d.isBefore(end) || d.isSame(end, 'day')) {
    days.push(d)
    d = d.add(1, 'day')
  }

  const toggle = (dateStr: string) => {
    onChange(
      selected.includes(dateStr)
        ? selected.filter(s => s !== dateStr)
        : [...selected, dateStr].sort()
    )
  }

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
        {DOW.map(day => (
          <div key={day} className={styles.dowLabel}>{day}</div>
        ))}
        {days.map(day => {
          const dateStr = day.format('YYYY-MM-DD')
          const isCurrentMonth = day.month() === current.month()
          const isPast = day.isBefore(min, 'day')
          const isTooFar = day.isAfter(max, 'day')
          const isDisabled = !isCurrentMonth || isPast || isTooFar
          const isSelected = selected.includes(dateStr)
          const isToday = day.isSame(dayjs(), 'day')

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && toggle(dateStr)}
              className={clsx(
                styles.cell,
                !isCurrentMonth && styles.otherMonth,
                isToday && styles.today,
                isSelected && styles.selected,
                !isDisabled && !isSelected && styles.available,
              )}
            >
              {day.date()}
            </button>
          )
        })}
      </div>

      {selected.length > 0 && (
        <div className={styles.selectedList}>
          <p className={styles.selectedTitle}>선택된 날짜 ({selected.length}일)</p>
          <div className={styles.chips}>
            {selected.map(date => (
              <button
                key={date}
                type="button"
                className={styles.chip}
                onClick={() => toggle(date)}
              >
                {dayjs(date).format('M/D (ddd)')} ✕
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
