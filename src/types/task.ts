export type TaskType = 'select_visit' | 'select_interview' | 'select_meeting'
export type TaskStatus = 'pending' | 'responded' | 'completed' | 'expired'

export interface RespondedSlot {
  date: string
  startTime: string
  endTime: string
}

export interface AvailableDateSlot {
  date: string       // YYYY-MM-DD
  startTime: string  // HH:mm
  endTime: string    // HH:mm
}

export interface WardAssignment {
  wardName: string
  date: string  // YYYY-MM-DD, one of the availableDates
}

export interface Task {
  id: string
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
  // Interview/Meeting: dates with per-date times
  availableDateSlots?: AvailableDateSlot[]
  slotDurationMinutes?: number
  // President responses
  respondedSlots?: RespondedSlot[]    // interview/meeting
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
