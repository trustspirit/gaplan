/**
 * 방문 요청의 스테이크별 일요일 배정 — 추천(recommendUnitSundays)과 분포 점검(checkPlanBalance).
 * firebase를 import하지 않는 순수 모듈이라 클라이언트(만들기·상세 화면)와 서버(AI 검토)가 함께 쓴다.
 */
import type { RequestUnit, WardVisitStat } from './visitRequestLogic'
import { sundayWardPicks, type SundayWardPick } from './sundayWardPicks'
import { regionOfSunday } from './unitSundays'

/** 일요일마다 추천한 스테이크. 칠십인 화면에서만 쓴다 — 회장 링크에는 구분 없이 일요일만 간다 */
export interface SundayRoles {
  primary?: string
  backup?: string
}

export interface UnitSundayPlan {
  /** unitId -> 그 스테이크 링크에 넣을 일요일. 모든 스테이크 키가 있고, 묻지 않으면 빈 배열 */
  unitSundays: Record<string, string[]>
  /** date -> 1순위/예비. 확정된 일요일은 없다 */
  roles: Record<string, SundayRoles>
  /** date -> 그날 우선 와드(만들기 화면 목록) */
  picks: Record<string, SundayWardPick[]>
}

/** 예비 스테이크를 부담에 얼마나 셀지 — 1순위는 1 */
export const BACKUP_WEIGHT = 0.5
const PICKS_PER_SUNDAY = 3

/**
 * 일요일마다 1순위와 예비(1순위와 다른 스테이크) 두 곳에 묻도록 배정한다.
 * 우선순위는 sundayWardPicks(방문 부담이 적은 스테이크 → 오래 방문받지 못한 와드).
 * 확정된 일요일은 다시 고르지 않고 확정된 스테이크의 목록에 그대로 둔다 — 빼면 그 회장 링크에서 그날이 사라진다.
 */
export function recommendUnitSundays(input: {
  /** 배정할 일요일(칠십인이 막힌 날은 호출하는 쪽이 뺀다) */
  sundays: string[]
  request: {
    units: RequestUnit[]
    sundayRegions?: Record<string, string>
    decisions?: Record<string, { unitId: string }>
  }
  wardStats: Record<string, WardVisitStat>
  /** date -> (unitId -> 행사 제목). 그 스테이크가 막힌 일요일 */
  unitBlocks: Record<string, Record<string, string>>
  perSunday?: number
}): UnitSundayPlan {
  const { request } = input
  const decisions = request.decisions ?? {}
  const open = input.sundays.filter((d) => !decisions[d])
  const picks = sundayWardPicks({
    sundays: open,
    regionOf: (d) => regionOfSunday(request, d),
    units: request.units,
    wardStats: input.wardStats,
    unitBlocks: input.unitBlocks,
    perSunday: input.perSunday ?? PICKS_PER_SUNDAY,
    backupWeight: BACKUP_WEIGHT,
  })

  const asked = new Map<string, Set<string>>(request.units.map((u) => [u.id, new Set()]))
  const roles: Record<string, SundayRoles> = {}
  for (const date of open) {
    const list = picks[date] ?? []
    const primary = list[0]?.unitId
    if (!primary) continue
    const backup = list.find((p) => p.unitId !== primary)?.unitId
    roles[date] = backup ? { primary, backup } : { primary }
    asked.get(primary)?.add(date)
    if (backup) asked.get(backup)?.add(date)
  }
  for (const date of input.sundays) {
    const d = decisions[date]
    if (d) asked.get(d.unitId)?.add(date)
  }

  return {
    unitSundays: Object.fromEntries([...asked].map(([id, dates]) => [id, [...dates].sort()])),
    roles,
    picks,
  }
}
