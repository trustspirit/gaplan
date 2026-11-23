import type { VisitRequestUnit, WardVisitStat } from '@/types'

export interface SundayWardPick {
  wardId: string
  wardName: string
  unitId: string
  unitName: string
  lastVisit: string | null
}

interface Input {
  /** 고른 일요일들 (YYYY-MM-DD) */
  sundays: string[]
  /** 그 일요일에 방문할 CC. 정할 수 없으면 undefined */
  regionOf: (date: string) => string | undefined
  units: VisitRequestUnit[]
  wardStats: Record<string, WardVisitStat>
  /** date -> (unitId -> 행사 제목). 그 단위가 막힌 일요일 */
  unitBlocks: Record<string, Record<string, string>>
  perSunday: number
}

/** 방문 이력 없음 → 마지막 방문이 오래된 순. 통계 화면의 방문 우선순위(computeVisitInsights)와 같은 순서. */
function byUrgency(a: SundayWardPick, b: SundayWardPick): number {
  if (a.lastVisit === b.lastVisit) return a.wardName.localeCompare(b.wardName)
  if (a.lastVisit === null) return -1
  if (b.lastVisit === null) return 1
  return a.lastVisit.localeCompare(b.lastVisit)
}

/**
 * 요청을 만들기 전에, 일요일마다 그날 CC에서 먼저 가 볼 만한 와드/지부를 고른다.
 * - 이미 방문이 잡혀 있는 와드(nextVisit)와 그날 막힌 스테이크(unitBlocks)는 뺀다.
 * - 같은 CC의 일요일들이 같은 와드를 되풀이해 보여 주지 않도록, 앞 일요일에 보인 와드는
 *   뒤로 미룬다. CC의 와드를 다 한 번씩 보였으면 처음부터 다시 돈다.
 */
export function sundayWardPicks({
  sundays,
  regionOf,
  units,
  wardStats,
  unitBlocks,
  perSunday,
}: Input): Record<string, SundayWardPick[]> {
  const ranked = new Map<string, SundayWardPick[]>()
  const rankedFor = (regionId: string) => {
    let list = ranked.get(regionId)
    if (!list) {
      list = units
        .filter((u) => u.regionId === regionId)
        .flatMap((u) =>
          u.wards
            .filter((w) => !wardStats[w.id]?.nextVisit)
            .map((w) => ({
              wardId: w.id,
              wardName: w.ko,
              unitId: u.id,
              unitName: u.ko,
              lastVisit: wardStats[w.id]?.lastVisit ?? null,
            })),
        )
        .sort(byUrgency)
      ranked.set(regionId, list)
    }
    return list
  }

  const shown = new Map<string, Set<string>>()
  const out: Record<string, SundayWardPick[]> = {}
  for (const date of [...sundays].sort()) {
    const regionId = regionOf(date)
    if (!regionId) {
      out[date] = []
      continue
    }
    const blocked = unitBlocks[date] ?? {}
    const open = rankedFor(regionId).filter((p) => !(p.unitId in blocked))
    let seen = shown.get(regionId) ?? new Set<string>()
    if (open.every((p) => seen.has(p.wardId))) seen = new Set()
    const picks = [
      ...open.filter((p) => !seen.has(p.wardId)),
      ...open.filter((p) => seen.has(p.wardId)),
    ].slice(0, perSunday)
    picks.forEach((p) => seen.add(p.wardId))
    shown.set(regionId, seen)
    out[date] = picks
  }
  return out
}
