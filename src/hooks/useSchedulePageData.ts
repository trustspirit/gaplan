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

  // Base set: type + active statuses — includes both confirmed and pending
  const allActive = schedules.filter(s => s.type === type && (s.status === 'confirmed' || s.status === 'pending'))

  // Range-filtered set: used only for the grouped list view
  const all = dateRange
    ? allActive.filter(s => s.date >= dateRange.start && s.date <= dateRange.end)
    : allActive

  const thisMonthCount = allActive.filter(s => dayjs(s.date).format('YYYY-M') === thisMonth).length
  const upcomingCount = allActive.filter(s => !dayjs(s.date).isBefore(today, 'day')).length
  // completed = only confirmed past visits (pending past = not completed, just expired)
  const completedCount = allActive.filter(s => s.status === 'confirmed' && dayjs(s.date).isBefore(today, 'day')).length

  const filtered = all.filter(s => {
    if (activeTab === 'upcoming') return !dayjs(s.date).isBefore(today, 'day')
    if (activeTab === 'completed') return s.status === 'confirmed' && dayjs(s.date).isBefore(today, 'day')
    return true
  })

  const sorted = [...filtered].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  )

  const grouped = groupByMonth(sorted)
  const monthKeys = sortMonthKeys(Array.from(grouped.keys()))

  const currentMonthKey = today.format('YYYY-MM')
  const orderedKeys = [
    ...monthKeys.filter(k => k === currentMonthKey),
    ...monthKeys.filter(k => k > currentMonthKey),
    ...monthKeys.filter(k => k < currentMonthKey),
  ]

  // upcomingList: from unfiltered base so sidebar always shows real next items
  const upcomingList = allActive
    .filter(s => !dayjs(s.date).isBefore(today, 'day'))
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
    .slice(0, upcomingLimit)

  return { orderedKeys, grouped, upcomingList, thisMonthCount, upcomingCount, completedCount }
}
