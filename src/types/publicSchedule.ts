export interface PublicScheduleItem {
  id: string
  type: string
  unitId: string
  regionId?: string   // 협의 평의회: unitId 대신 CC로 범위를 표현한다
  targetKind?: string
  date: string
  endDate?: string    // 여러 날 모임의 마지막 날. 없으면 하루짜리.
  allDay?: boolean    // 종일 일정 — 시각 대신 "종일"로 보여준다
  startTime: string
  endTime: string
  status: string
  wardName?: string
  zoomLink?: string | null
  customTitle?: string | null
  notes?: string | null
  seventyNotes?: string   // 칠십인 전용 메모 — 칠십인 전용 페이지(전체 공유)에서만 온다
  presidentAccompanied?: boolean
}

export type PublicGeneralScheduleCategory = 'conference' | 'fasting' | 'other'

export interface PublicGeneralScheduleItem {
  id: string
  title: string
  date: string
  endDate?: string   // 여러 날 행사의 종료일. 없으면 하루짜리.
  startTime?: string
  endTime?: string
  category: PublicGeneralScheduleCategory
  isPublic: true
  seventyAttends?: boolean   // 담당 지역 칠십인이 참석하는 행사
  seventyNotes?: string   // 칠십인 전용 메모 — 칠십인 전용 페이지(전체 공유)에서만 온다
}

export interface PublicSchedulePageData {
  schedules: PublicScheduleItem[]
  generalSchedules: PublicGeneralScheduleItem[]
  scopeDisplayName: string | null
  // 이 응답이 담은 가장 이른 날짜. 이전 일정은 이 날짜를 before로 넘겨 받는다.
  // 서버가 이 필드를 모르는(배포 전) 경우엔 빠지고, 화면은 이전 일정 불러오기를 감춘다.
  historyBefore?: string
}

/** getPublicScheduleHistory 한 쪽. nextBefore가 null이면 더 이전 일정이 없다. */
export interface PublicScheduleHistoryPage {
  schedules: PublicScheduleItem[]
  generalSchedules: PublicGeneralScheduleItem[]
  nextBefore: string | null
}
