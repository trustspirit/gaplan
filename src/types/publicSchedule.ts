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
}
