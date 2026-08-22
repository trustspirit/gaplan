/**
 * 행사(generalSchedules)가 공개 스코프(전체 공유 또는 특정 CC 링크)에 실려야 하는지 판단하는
 * 순수 규칙. CF(getPublicSchedules, publicScheduleIcs)와 브라우저 양쪽에서 같은 규칙을 써야
 * 두 진입점이 다른 결과를 내지 않는다. 그래서 이 파일에는 import가 하나도 없다 —
 * `scheduleRules.ts`와 같은 방식이다.
 *
 * 로그인 사용자에게 이 행사가 "관련 있는지"는 다른 질문이다(역할·소속 기반) —
 * `src/types/generalSchedule.ts`의 `isGeneralScheduleRelevant`를 봐라. 합치지 마라.
 */

export interface GeneralScheduleTargets {
  targetRegionIds?: string[]
  targetUnitIds?: string[]
}

/**
 * 이 행사가 주어진 공개 스코프에 실려야 하는가.
 *
 * 지역과 유닛을 함께 지정하면 **교집합**으로 좁힌다. 합집합이면 "서울 CC + 경기 스테이크"처럼
 * 서로 어긋난 지정이 서울 CC(지역 일치)와 서울남 CC(경기 스테이크가 그 CC 소속) 양쪽 공개
 * 캘린더에 동시에 실린다 — 어느 쪽도 의도가 아니다.
 *
 * @param scopeRegionId 전체 공개면 null, 그 외에는 이 링크가 속한 CC id.
 *   유닛 하나만 공개한 링크에서도 유닛 id가 아니라 그 유닛의 CC를 넘겨야 한다
 *   (`getScopeRegionId`). 그래야 CC 전체 행사가 유닛 링크에서도 보인다.
 * @param scopeUnitIds  전체 공개면 null, CC 링크면 그 CC의 유닛 id 목록,
 *   유닛 링크면 그 유닛 하나.
 */
export function generalScheduleInScope(
  gs: GeneralScheduleTargets,
  scopeRegionId: string | null,
  scopeUnitIds: string[] | null,
): boolean {
  // 1. 전체 공개(지역 칠십인 스케줄)는 공개 행사를 전부 본다.
  if (scopeRegionId === null) return true

  const regionTargets = gs.targetRegionIds ?? []
  const unitTargets = gs.targetUnitIds ?? []

  // 2. 대상이 하나도 없으면 조직 전체 행사이므로 모든 스코프에 실린다.
  if (!regionTargets.length && !unitTargets.length) return true

  // 3. 지정된 축만 각각 검사하고, 둘 다 지정됐으면 둘 다 통과해야 한다.
  const regionMatches = !regionTargets.length || regionTargets.includes(scopeRegionId)
  const unitMatches =
    !unitTargets.length || !!scopeUnitIds?.some((id) => unitTargets.includes(id))

  return regionMatches && unitMatches
}
