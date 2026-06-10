import dayjs from 'dayjs'
import type { Schedule } from '@/types'
import { ALL_UNITS, WARDS, REGIONS, getRegionIdByUnit } from '@/constants/regions'

export type StatsPeriod = '3m' | '6m' | '12m' | 'thisYear'
export type StatsGranularity = 'ward' | 'unit'

export interface StatsFilters {
  regionId: string | 'all'
  period: StatsPeriod
  granularity: StatsGranularity
}

export interface CountEntry { id: string; name: string; count: number }
export interface MonthEntry { month: string; count: number }   // YYYY-MM
export type Severity = 'green' | 'amber' | 'red'

export interface LastVisitEntry {
  id: string
  name: string
  regionId: string
  lastVisitDate: string | null
  daysSince: number | null
  severity: Severity
}

export interface VisitStats {
  byRegion: CountEntry[]
  byUnit: CountEntry[]
  monthlyTrend: MonthEntry[]
  lastVisit: LastVisitEntry[]
  staleTopN: LastVisitEntry[]
}

export const STALE_TOP_N = 10
const COUNT_TYPES: Schedule['type'][] = ['ward_visit', 'interview']
const ACTIVE_STATUS: Schedule['status'][] = ['confirmed', 'pending']

export function periodStart(period: StatsPeriod, today: string): string {
  const t = dayjs(today)
  switch (period) {
    case '3m':  return t.subtract(3, 'month').format('YYYY-MM-DD')
    case '6m':  return t.subtract(6, 'month').format('YYYY-MM-DD')
    case '12m': return t.subtract(12, 'month').format('YYYY-MM-DD')
    case 'thisYear': return t.startOf('year').format('YYYY-MM-DD')
  }
}

export function severityOf(daysSince: number | null): Severity {
  if (daysSince === null) return 'red'
  if (daysSince <= 60) return 'green'
  if (daysSince <= 120) return 'amber'
  return 'red'
}

function inRegionScope(
  regionId: string | undefined,
  allowedRegionIds: string[] | null,
  selected: string | 'all',
): boolean {
  if (!regionId) return false
  if (allowedRegionIds && !allowedRegionIds.includes(regionId)) return false
  if (selected !== 'all' && regionId !== selected) return false
  return true
}

function computeWardLastVisit(
  scoped: Schedule[],
  allowedRegionIds: string[] | null,
  selected: string | 'all',
  today: string,
): LastVisitEntry[] {
  const latest = new Map<string, string>()
  for (const s of scoped) {
    if (s.type !== 'ward_visit' || !s.wardName) continue
    const prev = latest.get(s.wardName)
    if (!prev || s.date > prev) latest.set(s.wardName, s.date)
  }
  return WARDS
    .filter(w => inRegionScope(getRegionIdByUnit(w.unitId), allowedRegionIds, selected))
    .map(w => {
      const last = latest.get(w.name) ?? null
      const daysSince = last ? dayjs(today).diff(dayjs(last), 'day') : null
      return {
        id: w.id,
        name: w.name,
        regionId: getRegionIdByUnit(w.unitId)!,
        lastVisitDate: last,
        daysSince,
        severity: severityOf(daysSince),
      }
    })
}

function computeUnitLastVisit(
  scoped: Schedule[],
  allowedRegionIds: string[] | null,
  selected: string | 'all',
  today: string,
): LastVisitEntry[] {
  const latest = new Map<string, string>()
  for (const s of scoped) {
    if (!COUNT_TYPES.includes(s.type)) continue
    const prev = latest.get(s.unitId)
    if (!prev || s.date > prev) latest.set(s.unitId, s.date)
  }
  return ALL_UNITS
    .filter(u => inRegionScope(u.regionId, allowedRegionIds, selected))
    .map(u => {
      const last = latest.get(u.id) ?? null
      const daysSince = last ? dayjs(today).diff(dayjs(last), 'day') : null
      return {
        id: u.id,
        name: u.name,
        regionId: u.regionId,
        lastVisitDate: last,
        daysSince,
        severity: severityOf(daysSince),
      }
    })
}

// allowedRegionIds: null = admin(전체), 배열 = 해당 지역만
export function computeVisitStats(
  schedules: Schedule[],
  filters: StatsFilters,
  allowedRegionIds: string[] | null,
  today: string,
): VisitStats {
  const start = periodStart(filters.period, today)

  const scoped = schedules.filter(s =>
    ACTIVE_STATUS.includes(s.status) &&
    inRegionScope(getRegionIdByUnit(s.unitId), allowedRegionIds, filters.regionId),
  )

  const countSet = scoped.filter(s =>
    COUNT_TYPES.includes(s.type) && s.date >= start && s.date <= today,
  )

  const regionCounts = new Map<string, number>()
  for (const s of countSet) {
    const r = getRegionIdByUnit(s.unitId)!
    regionCounts.set(r, (regionCounts.get(r) ?? 0) + 1)
  }
  const byRegion: CountEntry[] = REGIONS
    .filter(r =>
      (!allowedRegionIds || allowedRegionIds.includes(r.id)) &&
      (filters.regionId === 'all' || r.id === filters.regionId),
    )
    .map(r => ({ id: r.id, name: r.name, count: regionCounts.get(r.id) ?? 0 }))

  const unitCounts = new Map<string, number>()
  for (const s of countSet) unitCounts.set(s.unitId, (unitCounts.get(s.unitId) ?? 0) + 1)
  const byUnit: CountEntry[] = ALL_UNITS
    .filter(u => inRegionScope(u.regionId, allowedRegionIds, filters.regionId))
    .map(u => ({ id: u.id, name: u.name, count: unitCounts.get(u.id) ?? 0 }))

  const monthCounts = new Map<string, number>()
  for (const s of countSet) {
    const m = s.date.slice(0, 7)
    monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1)
  }
  const monthlyTrend: MonthEntry[] = []
  let cursor = dayjs(start).startOf('month')
  const endMonth = dayjs(today).startOf('month')
  while (cursor.isBefore(endMonth) || cursor.isSame(endMonth)) {
    const m = cursor.format('YYYY-MM')
    monthlyTrend.push({ month: m, count: monthCounts.get(m) ?? 0 })
    cursor = cursor.add(1, 'month')
  }

  const lastVisit = filters.granularity === 'ward'
    ? computeWardLastVisit(scoped, allowedRegionIds, filters.regionId, today)
    : computeUnitLastVisit(scoped, allowedRegionIds, filters.regionId, today)

  const staleTopN = [...lastVisit]
    .sort((a, b) => {
      if (a.daysSince === null && b.daysSince === null) return a.name.localeCompare(b.name)
      if (a.daysSince === null) return -1
      if (b.daysSince === null) return 1
      return b.daysSince - a.daysSince
    })
    .slice(0, STALE_TOP_N)

  return { byRegion, byUnit, monthlyTrend, lastVisit, staleTopN }
}
