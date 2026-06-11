import type { AppUser } from '@/types'

export interface EffectiveScope {
  /** null = 전체(무제한, admin). 그 외 = 허용 regionId 목록. */
  regionIds: string[] | null
  /** 일정 생성 시 기본 seventyUid. 전체/미배정이면 null. */
  actingSeventyUid: string | null
}

/** admin이 전체 스코프를 명시적으로 선택할 때 사용하는 sentinel 값 */
export const SCOPE_ALL = '__all__' as const

const EMPTY: EffectiveScope = { regionIds: [], actingSeventyUid: null }
const ALL: EffectiveScope = { regionIds: null, actingSeventyUid: null }

function regionIdsOf(uid: string, users: AppUser[]): string[] | null {
  const s = users.find(x => x.uid === uid && x.role === 'seventy')
  if (!s) return null  // 칠십인을 못 찾음(삭제 등)
  return s.regionIds ?? (s.regionId ? [s.regionId] : [])
}

/**
 * 사용자/선택/유저목록으로 유효 스코프를 계산.
 * @param user 현재 사용자
 * @param viewSeventyUid admin 전역 선택기 값 (admin에서만 의미, 그 외 무시)
 *   - null → 기본값(assignedSeventyUid 있으면 그 칠십인, 없으면 전체)
 *   - '__all__' → 명시적으로 전체 선택
 *   - <uid> → 해당 칠십인 스코프
 * @param users 전체 사용자 목록 (칠십인 regionIds 조회용)
 */
export function resolveEffectiveScope(
  user: AppUser | null,
  viewSeventyUid: string | null,
  users: AppUser[],
): EffectiveScope {
  if (!user) return EMPTY

  if (user.role === 'admin') {
    // '__all__' = 전체 보기 명시 선택
    if (viewSeventyUid === SCOPE_ALL) return ALL
    // null = 기본값: assignedSeventyUid가 있으면 그 칠십인 스코프, 없으면 전체
    const activeUid = viewSeventyUid ?? user.assignedSeventyUid ?? null
    if (!activeUid) return ALL
    const regionIds = regionIdsOf(activeUid, users)
    if (regionIds === null) return ALL  // 선택한 칠십인 삭제됨 → 전체 폴백
    return { regionIds, actingSeventyUid: activeUid }
  }

  if (user.role === 'exec_secretary') {
    const sid = user.assignedSeventyUid
    if (!sid) return EMPTY
    const regionIds = regionIdsOf(sid, users)
    if (regionIds === null) return EMPTY  // 담당 칠십인 삭제됨 → 빈 스코프
    return { regionIds, actingSeventyUid: sid }
  }

  if (user.role === 'seventy') {
    const regionIds = user.regionIds ?? (user.regionId ? [user.regionId] : [])
    return { regionIds, actingSeventyUid: user.uid }
  }

  return EMPTY
}
