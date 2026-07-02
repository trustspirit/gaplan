import dayjs from 'dayjs'
import type { Schedule } from '@/types'

const ACTIVE = (s: Schedule) => s.status === 'confirmed' || s.status === 'pending'

export function selectGlanceSchedules(
  schedules: Schedule[],
  today: string,
  opts: { days?: number; minItems?: number; maxItems?: number } = {},
): Schedule[] {
  const { days = 14, minItems = 3, maxItems = 5 } = opts
  const horizon = dayjs(today).add(days, 'day').format('YYYY-MM-DD')

  const upcoming = schedules
    .filter(s => ACTIVE(s) && s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))

  const within = upcoming.filter(s => s.date <= horizon)
  if (within.length >= minItems) return within
  return upcoming.slice(0, maxItems)
}
