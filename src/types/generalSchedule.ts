export type GeneralScheduleCategory = 'conference' | 'fasting' | 'other'

export interface GeneralSchedule {
  id: string
  title: string
  date: string           // YYYY-MM-DD
  startTime?: string     // HH:mm
  endTime?: string       // HH:mm
  description?: string
  category: GeneralScheduleCategory
  createdBy: string      // uid
  createdAt: string
  isPublic: boolean
}
