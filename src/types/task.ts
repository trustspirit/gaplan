// select_visit    = day-level ward visit (Sundays only)
// select_interview = date + time-range based (interviews, meetings, sacrament, etc.)
export type TaskType = 'select_visit' | 'select_interview'
export type TaskStatus = 'pending' | 'responded' | 'completed' | 'expired'

export interface RespondedSlot {
  date: string
  startTime: string
  endTime: string
}

export interface TimeRange {
  startTime: string  // HH:mm
  endTime: string    // HH:mm
}

// Each date gets one or more time ranges (e.g. 09:00-10:00 and 13:00-14:00)
export interface AvailableDateSlot {
  date: string
  timeRanges: TimeRange[]
}

export interface WardAssignment {
  wardName: string
  date: string  // YYYY-MM-DD, one of the availableDates
}

export interface Task {
  id: string
  batchId?: string
  title?: string
  note?: string      // admin memo shown to president when they receive the task
  type: TaskType
  assignedTo: string
  seventyUid: string
  scheduleId?: string
  regionId: string
  status: TaskStatus
  dueDate: string
  createdBy: string
  createdAt: string
  notifiedAt: string[]
  availableDays: number[]
  // Ward visit: specific Sundays admin selected
  availableDates?: string[]
  // Interview/Sacrament: dates with per-date time ranges
  availableDateSlots?: AvailableDateSlot[]
  slotDurationMinutes?: number
  // President responses
  respondedSlots?: RespondedSlot[]    // interview/sacrament
  wardAssignments?: WardAssignment[]  // ward visit
  respondedAt?: string
}

export interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  createdAt: string
  taskId?: string
}
