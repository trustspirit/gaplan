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
 * @param scopeRegionId 전체 공개면 null, CC 링크면 그 CC id
 * @param scopeUnitIds  전체 공개면 null, CC 링크면 그 CC의 유닛 id 목록
 */
export function generalScheduleInScope(
  gs: GeneralScheduleTargets,
  scopeRegionId: string | null,
  scopeUnitIds: string[] | null,
): boolean {
  // 1. 전체 공개(지역 칠십인 스케줄)는 공개 행사를 전부 본다.
  if (scopeRegionId === null) return true

  // 2. 대상이 하나도 없으면 조직 전체 행사이므로 모든 CC에 실린다.
  const hasRegionTargets = !!gs.targetRegionIds?.length
  const hasUnitTargets = !!gs.targetUnitIds?.length
  if (!hasRegionTargets && !hasUnitTargets) return true

  // 3. 이 CC가 직접 타겟이면 true
  if (gs.targetRegionIds?.includes(scopeRegionId)) return true

  // 4. 이 CC의 유닛과 하나라도 겹치면 true
  if (scopeUnitIds && gs.targetUnitIds?.some((id) => scopeUnitIds.includes(id))) return true

  // 5. 그 외에는 false
  return false
}
