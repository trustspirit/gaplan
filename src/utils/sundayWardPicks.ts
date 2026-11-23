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
 *
 * 1. 스테이크/지방부별로 방문이 고르게 가도록, 자리마다 방문 부담이 가장 적은 스테이크를 먼저 고른다.
 *    부담 = 최근 12개월 방문 수 + 이미 잡힌 예정 방문 + 이 계획의 앞 일요일들에 1순위로 보인 수.
 *    한 일요일 안의 후보들도 같은 방식으로 스테이크를 번갈아 고른다.
 * 2. 고른 스테이크 안에서는 방문 기록 없음 → 마지막 방문이 오래된 순(통계 화면의 방문 우선순위와 같다).
 * 3. 이미 방문이 잡힌 와드(nextVisit)와 그날 막힌 스테이크(unitBlocks; 스테이크 대회 등)는 뺀다.
 * 4. 같은 CC의 일요일들이 같은 와드를 되풀이하지 않도록 앞에서 보인 와드는 뒤로 미룬다.
 *    CC의 와드를 다 한 번씩 보였으면 처음부터 다시 돈다.
 */
export function sundayWardPicks({
  sundays,
  regionOf,
  units,
  wardStats,
  unitBlocks,
  perSunday,
}: Input): Record<string, SundayWardPick[]> {
  // 스테이크의 방문 부담 — 계획을 따라가며 1순위로 보인 만큼 늘어난다
  const load = new Map<string, number>()
  for (const u of units) {
    load.set(
      u.id,
      u.wards.reduce((sum, w) => {
        const st = wardStats[w.id]
        return sum + (st?.count12m ?? 0) + (st?.nextVisit ? 1 : 0)
      }, 0),
    )
  }

  const candidatesOf = (regionId: string): SundayWardPick[] =>
    units
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

  /** 부담이 가장 적은 스테이크의 가장 급한 와드. 부담이 같으면 더 급한 와드가 있는 스테이크. */
  const pickFrom = (pool: SundayWardPick[], extra: Map<string, number>) => {
    let best: SundayWardPick | undefined
    let bestLoad = Infinity
    for (const p of pool) {   // pool은 급한 순이라 스테이크마다 처음 만난 것이 그 스테이크의 1순위
      const l = (load.get(p.unitId) ?? 0) + (extra.get(p.unitId) ?? 0)
      if (l < bestLoad) {
        best = p
        bestLoad = l
      }
    }
    return best
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
    const open = candidatesOf(regionId).filter((p) => !(p.unitId in blocked))
    let seen = shown.get(regionId) ?? new Set<string>()
    if (open.every((p) => seen.has(p.wardId))) seen = new Set()

    const fresh = open.filter((p) => !seen.has(p.wardId))
    const stale = open.filter((p) => seen.has(p.wardId))
    const extra = new Map<string, number>()   // 이 일요일 안에서만 — 후보끼리 스테이크를 번갈아
    const picks: SundayWardPick[] = []
    while (picks.length < perSunday) {
      const pool = fresh.length > 0 ? fresh : stale
      const p = pickFrom(pool, extra)
      if (!p) break
      pool.splice(pool.indexOf(p), 1)
      picks.push(p)
      extra.set(p.unitId, (extra.get(p.unitId) ?? 0) + 1)
    }
    picks.forEach((p) => seen.add(p.wardId))
    shown.set(regionId, seen)
    // 1순위만 실제 방문으로 셈한다 — 나머지는 대안이라 부담에 넣으면 스테이크가 과하게 밀린다.
    if (picks[0]) load.set(picks[0].unitId, (load.get(picks[0].unitId) ?? 0) + 1)
    out[date] = picks
  }
  return out
}
