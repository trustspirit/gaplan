import dayjs from 'dayjs'
import type { Schedule, ScheduleType } from '@/types'
import { groupByMonth, sortMonthKeys } from '@/utils/scheduleGrouping'

type FilterTab = 'all' | 'upcoming' | 'completed'

interface SchedulePageData {
  orderedKeys: string[]
  grouped: Map<string, Schedule[]>
  upcomingList: Schedule[]
  thisMonthCount: number
  upcomingCount: number
  completedCount: number
}

export function useSchedulePageData(
  schedules: Schedule[],
  type: ScheduleType,
  activeTab: FilterTab,
  dateRange?: { start: string; end: string },
  upcomingLimit = 5,
): SchedulePageData {
  const today = dayjs()
  const thisMonth = today.format('YYYY-M')

  const all = schedules
    .filter(s => s.type === type && s.status === 'confirmed')
    .filter(s => !dateRange || (s.date >= dateRange.start && s.date <= dateRange.end))
  const thisMonthCount = all.filter(s => dayjs(s.date).format('YYYY-M') === thisMonth).length
  const upcomingCount = all.filter(s => !dayjs(s.date).isBefore(today, 'day')).length
  const completedCount = all.filter(s => dayjs(s.date).isBefore(today, 'day')).length

  const filtered = all.filter(s => {
    if (activeTab === 'upcoming') return !dayjs(s.date).isBefore(today, 'day')
    if (activeTab === 'completed') return dayjs(s.date).isBefore(today, 'day')
    return true
  })

  const sorted = [...filtered].sort((a, b) =>
    dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1
  )

  const grouped = groupByMonth(sorted)
  const monthKeys = sortMonthKeys(Array.from(grouped.keys()))

  const currentMonthKey = today.format('YYYY년 M월')
  const orderedKeys = [
    ...monthKeys.filter(k => k === currentMonthKey),
    ...monthKeys.filter(k => dayjs(k, 'YYYY년 M월').isAfter(today, 'month')),
    ...monthKeys.filter(k => dayjs(k, 'YYYY년 M월').isBefore(today, 'month')),
  ]

  const upcomingList = all
    .filter(s => !dayjs(s.date).isBefore(today, 'day'))
    .sort((a, b) => dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1)
    .slice(0, upcomingLimit)

  return { orderedKeys, grouped, upcomingList, thisMonthCount, upcomingCount, completedCount }
}
