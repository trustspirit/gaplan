import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { isInDateRange, nextDateRange, type DateRange } from './dateRange'
import styles from './DateRangePicker.module.scss'

interface DateRangePickerProps {
  label: string
  value: DateRange
  onChange: (range: DateRange) => void
  /** 선택이 없을 때 처음 보여줄 달(YYYY-MM-DD). 없으면 이번 달. */
  initialMonth?: string
  /** 한 칸의 날짜를 사람이 읽는 문자열로 — 선택 요약 줄에 쓴다. */
  formatDay: (date: string) => string
}

/**
 * 시작일과 종료일을 달력 하나에서 고른다. 예전 행사 폼은 "날짜"와 "종료일" 칸이 따로 있어
 * 달력을 두 번 열어야 했다.
 *
 * 무엇이 선택되는지는 dateRange.ts의 nextDateRange가 정한다 — 이 컴포넌트는 그리기만 한다.
 * 달력 모양은 MultiDatePicker와 맞췄다(같은 격자·같은 이동 버튼).
 */
export function DateRangePicker({ label, value, onChange, initialMonth, formatDay }: DateRangePickerProps) {
  const { t } = useTranslation()
  const DOW = Array.from({ length: 7 }, (_, i) => dayjs().day(i).format('ddd'))
  const [current, setCurrent] = useState(() => dayjs(value.start || initialMonth || undefined))

  const gridStart = current.startOf('month').startOf('week')
  const gridEnd = current.endOf('month').endOf('week')
  const days: dayjs.Dayjs[] = []
  for (let d = gridStart; !d.isAfter(gridEnd, 'day'); d = d.add(1, 'day')) days.push(d)

  const today = dayjs().format('YYYY-MM-DD')
  const summary = !value.start
    ? t('generalSchedule.dateRangeEmpty')
    : value.end
      ? `${formatDay(value.start)} – ${formatDay(value.end)}`
      : formatDay(value.start)

  return (
    <div className={styles.field} role="group" aria-label={label}>
      <span className={styles.label}>{label}</span>
      <p className={clsx(styles.summary, !value.start && styles.summaryEmpty)} aria-live="polite">
        {summary}
      </p>

      <div className={styles.picker}>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => setCurrent((c) => c.subtract(1, 'month'))}
            aria-label={t('generalSchedule.prevMonth')}
          >
            <ChevronLeft size={16} />
          </button>
          <span className={styles.period}>{current.format(t('calendar.monthTitleFormat'))}</span>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => setCurrent((c) => c.add(1, 'month'))}
            aria-label={t('generalSchedule.nextMonth')}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className={styles.grid}>
          {DOW.map((dow) => (
            <div key={dow} className={styles.dowLabel}>{dow}</div>
          ))}
          {days.map((day) => {
            const dateStr = day.format('YYYY-MM-DD')
            // 옆 달 날짜는 자리만 채운다 — 누르려면 그 달로 넘어가서 누른다.
            if (day.month() !== current.month()) {
              return <div key={dateStr} className={styles.blank} aria-hidden="true" />
            }
            const inRange = isInDateRange(value, dateStr)
            const isStart = dateStr === value.start
            const isEnd = dateStr === (value.end || value.start)
            return (
              <button
                key={dateStr}
                type="button"
                aria-label={dateStr}
                aria-pressed={inRange}
                onClick={() => onChange(nextDateRange(value, dateStr))}
                className={clsx(
                  styles.cell,
                  dateStr === today && styles.today,
                  inRange && styles.inRange,
                  isStart && styles.rangeStart,
                  isEnd && styles.rangeEnd,
                )}
              >
                {day.date()}
              </button>
            )
          })}
        </div>
      </div>

      <p className={styles.hint}>{t('generalSchedule.dateRangeHint')}</p>
    </div>
  )
}
