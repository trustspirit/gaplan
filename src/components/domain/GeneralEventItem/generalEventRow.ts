import dayjs from 'dayjs'
import type { DataListRow } from '@/components/ui'
import type { GeneralSchedule } from '@/types'
import { formatEventDateRange } from '@/types'
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
  const isMultiDay = !!event.endDate && event.endDate > event.date
  const meta =
    event.startTime && event.endTime ? `${event.startTime} – ${event.endTime}` : undefined

  return {
    id: event.id,
    // 여러 날 행사는 날짜를 범위로 보여준다(예: "9.3(수) – 9.4(목)") — 하루짜리는
    // 지금 그대로 primary/secondary로 나눈다.
    lead: isMultiDay
      ? { primary: formatEventDateRange(event, dayLabel) }
      : { primary: date.format('M.D'), secondary: dow },
    title: event.title,
    meta,
    dimmed: isPast,
  }
}
