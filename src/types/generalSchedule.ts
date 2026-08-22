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

// 날짜 범위만 있으면 판단할 수 있어야 한다 — 공개 페이지가 받는 항목(PublicGeneralScheduleItem)은
// GeneralSchedule 전체가 아니라 공개해도 되는 필드만 갖고 있다.
export type EventDateRange = Pick<GeneralSchedule, 'date' | 'endDate'>

// 여러 날 행사인가. endDate가 date보다 이르거나 같으면(깨진 데이터·동일값) 하루짜리다.
// 목록·상세·공개 페이지가 각자 이 비교를 적어 두면 한 곳만 고쳐지고 나머지가 남는다.
export function isMultiDayEvent(gs: EventDateRange): boolean {
  return !!gs.endDate && gs.endDate > gs.date
}

// 여러 날 행사의 날짜 범위 문자열(예: "9.3(수) – 9.4(목)")을 한 곳에서 조립한다 —
// GeneralEventItem(목록)과 GeneralScheduleDetailSheet(상세)가 각자 이 로직을 따로
// 만들지 않도록. 실제 날짜 한 칸의 포맷은 소비처마다 다르므로(목록은 "M.D(dow)",
// 상세는 i18n dateFormat) formatDay 콜백으로 주입받는다.
export function formatEventDateRange(
  gs: EventDateRange,
  formatDay: (dateStr: string) => string,
): string {
  if (!isMultiDayEvent(gs)) return formatDay(gs.date)
  return `${formatDay(gs.date)} – ${formatDay(gs.endDate!)}`
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
