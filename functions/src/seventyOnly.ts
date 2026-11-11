/**
 * "칠십인 전용" 표시(seventyOnly)의 유일한 판정.
 *
 * 행사(generalSchedules)와 개별 일정(schedules) 양쪽에 같은 이름의 필드가 있다. 켜져 있으면
 * 그 항목은 칠십인 전용 공개 페이지(전체 공유 토큰)와 그 구독에만 실리고, CC·스테이크별
 * 공개 링크와 CC별 구글 캘린더에는 실리지 않는다.
 *
 * 행사는 seventyOnly일 때 isPublic을 false로 저장한다 — 이 필드를 모르는 경로는 그 행사를
 * 비공개로 취급하므로, 빠뜨린 경로가 있어도 CC 쪽으로 새지 않는다.
 *
 * `scheduleRules.ts`·`generalScheduleScope.ts`와 같은 이유로 import가 하나도 없다.
 */
export function isSeventyOnly(doc: { seventyOnly?: unknown } | null | undefined): boolean {
  return doc?.seventyOnly === true
}

/** id가 같은 항목은 먼저 나온 것만 남긴다 — 여러 쿼리 결과를 합칠 때 쓴다. */
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

/**
 * 개별 일정(schedules)에 칠십인 전용을 둘 수 있는가.
 *
 * 대상이 '기타'인 접견/모임만 된다. 방문·협의 평의회·스테이크 회장·와드 감독은 대상이 곧 공개
 * 범위를 정하므로 고를 것이 없다. 화면(src/utils/seventyOnly.ts)도 같은 규칙으로 선택지를 보여준다.
 */
export function canBeSeventyOnly(schedule: { type?: string | null; targetKind?: string | null }): boolean {
  return (schedule.type === 'interview' || schedule.type === 'meeting') && schedule.targetKind === 'other'
}
