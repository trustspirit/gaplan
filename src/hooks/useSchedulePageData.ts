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

  // Base set: type + status only — stats and sidebar always reflect full picture
  const allConfirmed = schedules.filter(s => s.type === type && s.status === 'confirmed')

  // Range-filtered set: used only for the grouped list view
  const all = dateRange
    ? allConfirmed.filter(s => s.date >= dateRange.start && s.date <= dateRange.end)
    : allConfirmed

  const thisMonthCount = allConfirmed.filter(s => dayjs(s.date).format('YYYY-M') === thisMonth).length
  const upcomingCount = allConfirmed.filter(s => !dayjs(s.date).isBefore(today, 'day')).length
  const completedCount = allConfirmed.filter(s => dayjs(s.date).isBefore(today, 'day')).length

  const filtered = all.filter(s => {
    if (activeTab === 'upcoming') return !dayjs(s.date).isBefore(today, 'day')
    if (activeTab === 'completed') return dayjs(s.date).isBefore(today, 'day')
    return true
  })

  const sorted = [...filtered].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  )

  const grouped = groupByMonth(sorted)
  const monthKeys = sortMonthKeys(Array.from(grouped.keys()))

  const currentMonthKey = today.format('YYYY년 M월')
  const orderedKeys = [
    ...monthKeys.filter(k => k === currentMonthKey),
    ...monthKeys.filter(k => dayjs(k, 'YYYY년 M월').isAfter(today, 'month')),
    ...monthKeys.filter(k => dayjs(k, 'YYYY년 M월').isBefore(today, 'month')),
  ]

  // upcomingList: from unfiltered base so sidebar always shows real next items
  const upcomingList = allConfirmed
    .filter(s => !dayjs(s.date).isBefore(today, 'day'))
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
    .slice(0, upcomingLimit)

  return { orderedKeys, grouped, upcomingList, thisMonthCount, upcomingCount, completedCount }
}
