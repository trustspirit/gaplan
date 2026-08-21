import dayjs from 'dayjs'
import type { DataListRow } from '@/components/ui'
import type { GeneralSchedule } from '@/types'
import { DOW_LABELS } from '@/utils/date'

export interface GeneralEventRowInput {
  event: GeneralSchedule
  today: string // YYYY-MM-DD
}

export function toGeneralEventRow({ event, today }: GeneralEventRowInput): DataListRow {
  const date = dayjs(event.date)
  const dow = DOW_LABELS[date.day()]
  const isPast = date.isBefore(dayjs(today), 'day')
  const meta =
    event.startTime && event.endTime ? `${event.startTime} – ${event.endTime}` : undefined

  return {
    id: event.id,
    lead: { primary: date.format('M.D'), secondary: dow },
    title: event.title,
    meta,
    dimmed: isPast,
  }
}
