import dayjs from 'dayjs'
import type { Schedule, GeneralSchedule } from '@/types'
import { getRegionIdByUnit } from '@/constants/regions'

export const CONFERENCE_PROXIMITY_DAYS = 14

export interface BalanceEntry {
  unitId: string
  name: string
  actualCount: number    // 최근 윈도우 내 실제 확정 ward_visit
  plannedCount: number   // 이 초안의 계획 항목
  total: number
}

// 특정 unit(의 region)에 relevant한 general schedule인가
export function isGeneralScheduleRelevantToUnit(gs: GeneralSchedule, unitId: string): boolean {
  const isOrgWide = !gs.targetRegionIds?.length && !gs.targetUnitIds?.length
  if (isOrgWide) return true
  const regionId = getRegionIdByUnit(unitId)
  const regionMatch = !!(regionId && gs.targetRegionIds?.includes(regionId))
  const unitMatch = !!gs.targetUnitIds?.includes(unitId)
  return regionMatch || unitMatch
}

// 방문일 ±windowDays 내, 해당 unit에 relevant한 general schedule 목록
export function findNearbyEvents(
  date: string,
  unitId: string,
  generalSchedules: GeneralSchedule[],
  windowDays: number = CONFERENCE_PROXIMITY_DAYS,
): GeneralSchedule[] {
  const d = dayjs(date)
  return generalSchedules.filter(gs =>
    isGeneralScheduleRelevantToUnit(gs, unitId) &&
    Math.abs(dayjs(gs.date).diff(d, 'day')) <= windowDays,
  )
}

// 칠십인 담당 unit별 (최근 실제 + 초안 계획) 분포
export function computeUnitBalance(
  units: { id: string; name: string }[],
  schedules: Schedule[],
  planItems: { unitId: string }[],
  sinceDate: string,   // YYYY-MM-DD, 실제 방문 집계 시작
  today: string,       // YYYY-MM-DD
): BalanceEntry[] {
  return units.map(u => {
    const actualCount = schedules.filter(s =>
      s.unitId === u.id &&
      s.type === 'ward_visit' &&
      s.status === 'confirmed' &&
      s.date >= sinceDate && s.date <= today,
    ).length
    const plannedCount = planItems.filter(i => i.unitId === u.id).length
    return { unitId: u.id, name: u.name, actualCount, plannedCount, total: actualCount + plannedCount }
  })
}
