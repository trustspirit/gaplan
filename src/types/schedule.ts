export type ScheduleType = 'ward_visit' | 'interview' | 'meeting' | 'general_attendance'
export type ScheduleStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Schedule {
  id: string
  type: ScheduleType
  seventyUid: string
  unitId: string
  presidentUid: string | null
  date: string
  startTime: string
  endTime: string
  status: ScheduleStatus
  createdBy: string
  confirmedAt?: string
  googleCalendarEventId?: string
  wardName?: string   // ward visit: specific ward/branch name
  taskId?: string     // ward visit: links schedule back to source task (for re-confirmation cleanup)
  notes?: string
  zoomLink?: string | null
  customTitle?: string | null
  generalScheduleId?: string   // general_attendance일 때만 사용
  visitPlanId?: string        // 방문 계획에서 발행된 경우
  visitPlanItemId?: string    // 해당 계획 항목 id
}

export interface TimeSlot {
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
}
