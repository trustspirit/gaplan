export type ScheduleType = 'ward_visit' | 'interview' | 'meeting'
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
}

export interface TimeSlot {
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
}
