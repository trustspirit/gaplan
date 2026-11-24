import type { RequestUnit as VisitRequestUnit, WardVisitStat } from './visitRequestLogic'

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
  /** 예비(1순위와 다른 스테이크의 첫 후보)를 얼마나 물어본 것으로 셀지 — 마지막 방문이 같은 스테이크끼리 가를 때만 쓴다. 기본 0 */
  backupWeight?: number
}

/** 방문 이력 없음 → 마지막 방문이 오래된 순. 통계 화면의 방문 우선순위(computeVisitInsights)와 같은 순서. */
function byUrgency(a: SundayWardPick, b: SundayWardPick): number {
  if (a.lastVisit === b.lastVisit) return a.wardName.localeCompare(b.wardName)
  if (a.lastVisit === null) return -1
  if (b.lastVisit === null) return 1
  return a.lastVisit.localeCompare(b.lastVisit)
}

/** null(방문 없음)이 가장 앞 */
function byDate(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return -1
  if (b === null) return 1
  return a.localeCompare(b)
}

const later = (a: string | null, b: string | null) => (a === null ? b : b === null ? a : a > b ? a : b)

/**
 * 요청을 만들기 전에, 일요일마다 그날 CC에서 먼저 가 볼 만한 와드/지부를 고른다.
 *
 * 1. 스테이크/지방부 순서: 방문을 받은 적 없는 스테이크 → 마지막 방문이 오래된 스테이크.
 *    스테이크의 마지막 방문 = 그 와드들 중 가장 최근 방문. 이미 잡힌 예정 방문(nextVisit)도 방문으로 친다.
 *    이 계획의 앞 일요일에 1순위로 나온 스테이크는 그날 방문한 것으로 보고 뒤로 보낸다.
 *    마지막 방문이 같으면(둘 다 기록 없음 등) 이 계획에서 덜 물어본 스테이크(예비는 backupWeight만큼) →
 *    더 급한 와드가 있는 스테이크.
 * 2. 한 일요일의 후보는 스테이크를 위 순서로 하나씩 돌아가며 고른다 — 그래야 예비(1순위와 다른 스테이크)가 생긴다.
 * 3. 고른 스테이크 안에서는 방문 기록 없음 → 마지막 방문이 오래된 순(통계 화면의 방문 우선순위와 같다).
 *    이 계획에서 앞서 보인 와드는 그 스테이크의 다른 와드를 다 보인 뒤에 다시 보인다.
 * 4. 이미 방문이 잡힌 와드(nextVisit)와 그날 막힌 스테이크(unitBlocks; 스테이크 대회 등)는 뺀다.
 */
export function sundayWardPicks({
  sundays,
  regionOf,
  units,
  wardStats,
  unitBlocks,
  perSunday,
  backupWeight = 0,
}: Input): Record<string, SundayWardPick[]> {
  // 스테이크의 마지막 방문(예정 포함) — 계획을 따라가며 1순위로 나온 일요일로 늦춰진다
  const touched = new Map<string, string | null>()
  for (const u of units) {
    touched.set(
      u.id,
      u.wards.reduce<string | null>((acc, w) => {
        const st = wardStats[w.id]
        return later(later(acc, st?.lastVisit ?? null), st?.nextVisit ?? null)
      }, null),
    )
  }
  // 이 계획에서 물어본 정도 — 마지막 방문이 같은 스테이크끼리만 가른다
  const asked = new Map<string, number>()
  // 이 계획에서 와드를 보인 횟수
  const shown = new Map<string, number>()

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

  const out: Record<string, SundayWardPick[]> = {}
  for (const date of [...sundays].sort()) {
    const regionId = regionOf(date)
    if (regionId === undefined) {
      out[date] = []
      continue
    }
    const blocked = unitBlocks[date] ?? {}
    // 스테이크마다 와드를 보일 순서로: 덜 보인 와드 → 급한 와드
    const byUnit = new Map<string, SundayWardPick[]>()
    for (const p of candidatesOf(regionId)) {
      if (p.unitId in blocked) continue
      byUnit.set(p.unitId, [...(byUnit.get(p.unitId) ?? []), p])
    }
    for (const list of byUnit.values()) {
      list.sort((a, b) => (shown.get(a.wardId) ?? 0) - (shown.get(b.wardId) ?? 0) || byUrgency(a, b))
    }
    const stakeOrder = (x: string, y: string) =>
      byDate(touched.get(x) ?? null, touched.get(y) ?? null) ||
      (asked.get(x) ?? 0) - (asked.get(y) ?? 0) ||
      byUrgency(byUnit.get(x)![0], byUnit.get(y)![0])
    const ranked = [...byUnit.keys()].sort(stakeOrder)

    // 스테이크 순서대로 한 바퀴씩 — 와드가 남은 스테이크만
    const picks: SundayWardPick[] = []
    for (let round = 0; picks.length < perSunday; round++) {
      const before = picks.length
      for (const id of ranked) {
        if (picks.length >= perSunday) break
        const p = byUnit.get(id)![round]
        if (p) picks.push(p)
      }
      if (picks.length === before) break
    }

    picks.forEach((p) => shown.set(p.wardId, (shown.get(p.wardId) ?? 0) + 1))
    // 1순위는 그날 방문한 것으로 본다. 예비는 순서를 바꾸지 않고, 마지막 방문이 같은 스테이크끼리만 backupWeight만큼 뒤로.
    const primary = picks[0]
    if (primary) {
      touched.set(primary.unitId, later(touched.get(primary.unitId) ?? null, date))
      asked.set(primary.unitId, (asked.get(primary.unitId) ?? 0) + 1)
      const backup = picks.find((p) => p.unitId !== primary.unitId)
      if (backup && backupWeight > 0) asked.set(backup.unitId, (asked.get(backup.unitId) ?? 0) + backupWeight)
    }
    out[date] = picks
  }
  return out
}
