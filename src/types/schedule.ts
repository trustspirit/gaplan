export type ScheduleType = 'ward_visit' | 'interview' | 'meeting' | 'general_attendance'
export type ScheduleStatus = 'pending' | 'confirmed' | 'cancelled'
export type InterviewTargetKind = 'stake_president' | 'ward_bishop' | 'other' | 'cc_council'

export interface Schedule {
  id: string
  type: ScheduleType
  seventyUid: string
  unitId: string
  regionId?: string   // CC(협의 평의회) 단위 일정 — cc_council 모임에만 채워지고 unitId는 빈 값이다
  presidentUid: string | null
  date: string
  startTime: string
  endTime: string
  status: ScheduleStatus
  createdBy: string
  confirmedAt?: string
  googleCalendarEventId?: string
  wardName?: string   // ward visit: specific ward/branch name
  wardId?: string             // 대상/방문 와드·지부 id (WARDS.id) — ward_visit 및 ward_bishop 접견/모임
  targetKind?: InterviewTargetKind  // interview/meeting 대상 유형 (cc_council = CC 내 스테이크 회장들)
  taskId?: string     // ward visit: links schedule back to source task (for re-confirmation cleanup)
  notes?: string
  zoomLink?: string | null
  customTitle?: string | null
  generalScheduleId?: string   // general_attendance일 때만 사용
  visitPlanId?: string        // 방문 계획에서 발행된 경우
  visitPlanItemId?: string    // 해당 계획 항목 id
  projectId?: string          // 연계 프로젝트
  presidentAccompanied?: boolean  // 스테이크 회장 동행 여부 (ward_visit only)
  relatedVisitId?: string | null  // interview/meeting: 이 일정이 사전 모임인 대상 ward_visit 문서 id
}

export interface TimeSlot {
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
}
