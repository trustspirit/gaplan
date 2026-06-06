import dayjs from 'dayjs'
import type { Schedule } from '@/types'

export function groupByMonth(schedules: Schedule[]): Map<string, Schedule[]> {
  const map = new Map<string, Schedule[]>()
  for (const s of schedules) {
    const key = dayjs(s.date).format('YYYY년 M월')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return map
}

export function sortMonthKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const da = dayjs(a, 'YYYY년 M월')
    const db = dayjs(b, 'YYYY년 M월')
    return da.isBefore(db) ? -1 : 1
  })
}
