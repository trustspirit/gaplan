import type { AppUser } from './user'

export type GeneralScheduleCategory = 'conference' | 'fasting' | 'other'

export interface GeneralSchedule {
  id: string
  title: string
  date: string           // YYYY-MM-DD, 시작일
  endDate?: string        // YYYY-MM-DD. 없으면 하루짜리. 있으면 date 이상이어야 한다(여러 날 행사, 예: 1박 2일).
  startTime?: string     // HH:mm — 여러 날 행사에서는 첫날의 시작 시각
  endTime?: string       // HH:mm — 여러 날 행사에서는 마지막 날의 종료 시각
  description?: string
  category: GeneralScheduleCategory
  createdBy: string      // uid
  createdAt: string
  isPublic: boolean
  targetRegionIds?: string[]   // empty = org-wide
  targetUnitIds?: string[]     // empty = no unit restriction
}

// 이 행사가 주어진 날짜(YYYY-MM-DD)에 걸쳐 있는가. endDate가 없으면 date와 같은 날만.
// endDate가 date보다 이르면(깨진 데이터) date 하루짜리로 취급한다.
export function eventCoversDate(gs: GeneralSchedule, date: string): boolean {
  if (!gs.endDate || gs.endDate < gs.date) return gs.date === date
  return gs.date <= date && date <= gs.endDate
}

// 공개 스코프(전체 공유 vs 특정 CC 링크)에 실려야 하는지는 이것과 다른 질문이다 —
// 그건 functions/src/generalScheduleScope.ts의 generalScheduleInScope가 판단한다(로그인 없는 방문자용).
export function isGeneralScheduleRelevant(gs: GeneralSchedule, user: AppUser): boolean {
  const isOrgWide = !gs.targetRegionIds?.length && !gs.targetUnitIds?.length
  if (isOrgWide || user.role === 'admin') return true

  const userRegions = user.regionIds ?? (user.regionId ? [user.regionId] : [])
  const regionMatch = !!gs.targetRegionIds?.some(r => userRegions.includes(r))
  const unitMatch = !!gs.targetUnitIds?.includes(user.unitId ?? '')
  return regionMatch || unitMatch
}
