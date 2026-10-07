import dayjs from 'dayjs'
import type { DataListRow } from '@/components/ui'
import type { GeneralSchedule } from '@/types'
import { formatEventDateRange, isMultiDayEvent } from '@/types'
import { DOW_LABELS } from '@/utils/date'

export interface GeneralEventRowInput {
  event: GeneralSchedule
  today: string // YYYY-MM-DD
}

function dayLabel(dateStr: string): string {
  const d = dayjs(dateStr)
  return `${d.format('M.D')}(${DOW_LABELS[d.day()]})`
}

export function toGeneralEventRow({ event, today }: GeneralEventRowInput): DataListRow {
  const date = dayjs(event.date)
  const dow = DOW_LABELS[date.day()]
  const isPast = date.isBefore(dayjs(today), 'day')
  const isMultiDay = isMultiDayEvent(event)
  const time =
    event.startTime && event.endTime ? `${event.startTime} – ${event.endTime}` : undefined
  // 여러 날 행사의 범위(예: "9.3(수) – 9.4(목)")는 lead(46px 고정폭)에 들어가지 않는다 —
  // lead는 하루짜리와 같게 시작일만 두고, 범위는 아래 줄(meta)에 시간과 함께 보여준다.
  const meta = isMultiDay
    ? [formatEventDateRange(event, dayLabel), time].filter(Boolean).join(' · ')
    : time

  return {
    id: event.id,
    lead: { primary: date.format('M.D'), secondary: dow },
    title: event.title,
    meta,
    dimmed: isPast,
  }
}
