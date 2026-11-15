/**
 * 지역 칠십인이 CC를 둘 이상 맡으면 한 CC를 연달아 방문하지 않도록, 요청의 일요일마다 차례인 CC를
 * 정해 둔다(visitRequests.sundayRegions: date -> regionId). 그 일요일에는 그 CC의 스테이크/지방부만
 * 추천할 수 있다. 순수 함수라 CF와 브라우저가 같이 쓴다 — import가 하나도 없다.
 */

/**
 * 일요일들에 CC를 차례로 돌려 붙인다. lastRegion은 바로 앞 방문의 CC — 그 CC로는 시작하지 않는다.
 * pinned는 CC가 정해진 날(오후 협의 평의회가 있는 일요일 → 그 CC). 나머지는 앞 일요일과도,
 * 바로 다음의 고정된 일요일과도 다른 CC를 붙인다.
 */
export function rotateRegions(
  sundays: string[],
  regionIds: string[],
  lastRegion?: string | null,
  pinned: Record<string, string> = {},
): Record<string, string> {
  if (regionIds.length === 0) return {}
  const sorted = [...sundays].sort()
  const out: Record<string, string> = {}
  let prev = lastRegion ?? null
  sorted.forEach((d, i) => {
    let region = pinned[d]
    if (!region) {
      const next = sorted[i + 1]
      const nextPinned = next ? pinned[next] : undefined
      const from = (regionIds.indexOf(prev ?? '') + 1) % regionIds.length
      const order = regionIds.map((_, k) => regionIds[(from + k) % regionIds.length])
      region =
        order.find((r) => r !== prev && r !== nextPinned) ??
        order.find((r) => r !== prev) ??
        order[0]
    }
    out[d] = region
    prev = region
  })
  return out
}

/** 바로 앞에 배정된 일요일과 같은 CC인 날들(오름차순). 비어 있으면 잘 번갈아 있다. */
export function consecutiveSameRegion(sundayRegions: Record<string, string>): string[] {
  const dates = Object.keys(sundayRegions).sort()
  return dates.filter((d, i) => i > 0 && sundayRegions[dates[i - 1]] === sundayRegions[d])
}

/**
 * date 하나를 새로 넣을 때 붙일 CC — 앞뒤로 배정된 일요일과 다른 CC를 고른다. 모두 겹치면
 * 앞 일요일과만이라도 다르게.
 */
export function regionForNewSunday(
  date: string,
  sundayRegions: Record<string, string>,
  regionIds: string[],
): string {
  const dates = Object.keys(sundayRegions).filter((d) => d !== date).sort()
  const prev = [...dates].reverse().find((d) => d < date)
  const next = dates.find((d) => d > date)
  const avoid = [prev && sundayRegions[prev], next && sundayRegions[next]]
  return (
    regionIds.find((r) => !avoid.includes(r)) ??
    regionIds.find((r) => r !== (prev && sundayRegions[prev])) ??
    regionIds[0] ??
    ''
  )
}

/**
 * before 전 마지막 와드 방문(취소 제외)의 CC. 새 요청의 CC 차례를 그 다음 CC부터 시작해
 * 분기 경계에서도 같은 CC가 이어지지 않게 한다. 모르면 null.
 */
export function lastVisitRegion(
  schedules: { type?: unknown; status?: unknown; date?: unknown; unitId?: unknown }[],
  before: string,
  unitRegions: Record<string, string>,
): string | null {
  let best: { date: string; region: string } | null = null
  for (const s of schedules) {
    if (s.type !== 'ward_visit' || s.status === 'cancelled') continue
    if (typeof s.date !== 'string' || s.date >= before) continue
    const region = typeof s.unitId === 'string' ? unitRegions[s.unitId] : undefined
    if (!region) continue
    if (!best || s.date > best.date) best = { date: s.date, region }
  }
  return best?.region ?? null
}
