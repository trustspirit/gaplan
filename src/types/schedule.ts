export type ScheduleType = 'ward_visit' | 'interview'
export type ScheduleStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Schedule {
  id: string
  type: ScheduleType
  seventyUid: string
  unitId: string
  presidentUid: string
  date: string
  startTime: string
  endTime: string
  status: ScheduleStatus
  createdBy: string
  confirmedAt?: string
  googleCalendarEventId?: string
}

export interface TimeSlot {
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
}
