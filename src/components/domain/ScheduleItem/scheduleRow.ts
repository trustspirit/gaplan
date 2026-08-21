import dayjs from 'dayjs'
import type { DataListRow } from '@/components/ui'
import type { Schedule } from '@/types'
import { DOW_LABELS } from '@/utils/date'

export interface ScheduleRowInput {
  schedule: Schedule
  unitName: string
  today: string // YYYY-MM-DD
  t: (key: string, opts?: Record<string, unknown>) => string
}

export function toScheduleRow({ schedule, unitName, today, t }: ScheduleRowInput): DataListRow {
  const date = dayjs(schedule.date)
  const dow = DOW_LABELS[date.day()]
  const isPast = date.isBefore(dayjs(today), 'day')
  const title = schedule.customTitle ?? unitName
  const subtitle = !schedule.customTitle && schedule.wardName ? schedule.wardName : undefined

  return {
    id: schedule.id,
    lead: { primary: date.format('M.D'), secondary: dow },
    title,
    subtitle,
    meta: `${schedule.startTime} – ${schedule.endTime}`,
    tag: t(`schedule.type.${schedule.type}`),
    highlighted: !isPast,
  }
}
