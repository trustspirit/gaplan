export interface PublicScheduleItem {
  id: string
  type: string
  unitId: string
  regionId?: string   // 협의 평의회: unitId 대신 CC로 범위를 표현한다
  targetKind?: string
  date: string
  startTime: string
  endTime: string
  status: string
  wardName?: string
  zoomLink?: string | null
  customTitle?: string | null
  notes?: string | null
  presidentAccompanied?: boolean
}

export type PublicGeneralScheduleCategory = 'conference' | 'fasting' | 'other'

export interface PublicGeneralScheduleItem {
  id: string
  title: string
  date: string
  startTime?: string
  endTime?: string
  category: PublicGeneralScheduleCategory
  isPublic: true
}

export interface PublicSchedulePageData {
  schedules: PublicScheduleItem[]
  generalSchedules: PublicGeneralScheduleItem[]
  scopeDisplayName: string | null
}
