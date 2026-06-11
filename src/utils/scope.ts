import type { AppUser } from '@/types'

export interface EffectiveScope {
  /** null = 전체(무제한, admin). 그 외 = 허용 regionId 목록. */
  regionIds: string[] | null
  /** 일정 생성 시 기본 seventyUid. 전체/미배정이면 null. */
  actingSeventyUid: string | null
}

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
 * @param users 전체 사용자 목록 (칠십인 regionIds 조회용)
 */
export function resolveEffectiveScope(
  user: AppUser | null,
  viewSeventyUid: string | null,
  users: AppUser[],
): EffectiveScope {
  if (!user) return EMPTY

  if (user.role === 'admin') {
    if (!viewSeventyUid) return ALL
    const regionIds = regionIdsOf(viewSeventyUid, users)
    if (regionIds === null) return ALL  // 선택한 칠십인 삭제됨 → 전체 폴백
    return { regionIds, actingSeventyUid: viewSeventyUid }
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
