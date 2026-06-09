// IMPORTANT: This data is duplicated from src/constants/regions.ts (no shared package).
// Keep in sync when adding/removing stakes or districts.
const REGION_UNITS: Record<string, string[]> = {
  'seoul': ['seoul-stake', 'seoul-east-stake', 'seoul-west-stake', 'gyeonggi-stake', 'military-district', 'gangneung-district'],
  'seoul-south': ['seoul-south-stake', 'daejeon-stake', 'cheongju-stake', 'jeonju-stake', 'gwangju-stake'],
  'busan': ['busan-stake', 'daegu-stake', 'changwon-stake', 'ulsan-district'],
}

// All scope display names (regions + units)
const SCOPE_NAMES: Record<string, string> = {
  'seoul': '서울 CCM',
  'seoul-south': '서울남 CCM',
  'busan': '부산 CCM',
  'seoul-stake': '서울 스테이크',
  'seoul-east-stake': '서울동 스테이크',
  'seoul-west-stake': '서울서 스테이크',
  'gyeonggi-stake': '경기 스테이크',
  'seoul-south-stake': '서울남 스테이크',
  'daejeon-stake': '대전 스테이크',
  'cheongju-stake': '청주 스테이크',
  'jeonju-stake': '전주 스테이크',
  'gwangju-stake': '광주 스테이크',
  'busan-stake': '부산 스테이크',
  'daegu-stake': '대구 스테이크',
  'changwon-stake': '창원 스테이크',
  'ulsan-district': '울산 지방부',
  'military-district': '미군 지방부',
  'gangneung-district': '강릉 지방부',
}

/**
 * Returns the unit IDs that belong to a scope.
 * - For a region scopeId: returns all unit IDs in that region.
 * - For a unit scopeId: returns [scopeId] (a unit is its own scope).
 * - Unknown scopeId: returns [].
 */
export function getScopeUnitIds(scopeId: string): string[] {
  if (REGION_UNITS[scopeId]) return REGION_UNITS[scopeId]
  if (SCOPE_NAMES[scopeId]) return [scopeId]
  return []
}

/**
 * Returns the Korean display name for a scope.
 * Returns '' for unknown scopeIds.
 */
export function getScopeDisplayName(scopeId: string): string {
  return SCOPE_NAMES[scopeId] ?? ''
}
