import { getScopeDisplayName } from './regions'

/**
 * CC(Coordinating Council) 협의 평의회 관련 헬퍼.
 *
 * 협의 평의회는 CC 전체를 대상으로 하고 참석자가 그 CC의 스테이크 회장들이라, 다른 모임과 달리
 * 특정 스테이크에 속하지 않는다. 그래서 unitId는 비우고 regionId로 범위를 표현한다.
 */

export const CC_COUNCIL_TARGET_KIND = 'cc_council' as const

const REGION_IDS = ['seoul', 'seoul-south', 'busan'] as const

export function isKnownRegionId(regionId: string): boolean {
  return (REGION_IDS as readonly string[]).includes(regionId)
}

/** 예: 'seoul' → '서울 CC 협의 평의회' */
export function buildCcCouncilTitle(regionId: string): string {
  const name = getScopeDisplayName(regionId)
  return name ? `${name} 협의 평의회` : '협의 평의회'
}

/**
 * CC 스코프 공개 캘린더가 이 일정을 노출해야 하는지.
 *
 * 지역 공유는 원래 와드 방문만 내보내는데, 협의 평의회는 그 CC의 스테이크 회장들이
 * 참석 대상이므로 해당 CC 스코프에 한해 함께 노출한다.
 */
export function isCcCouncilForScope(
  data: { targetKind?: unknown; regionId?: unknown },
  scopeValue: string,
): boolean {
  return data.targetKind === CC_COUNCIL_TARGET_KIND && data.regionId === scopeValue
}
