export type TaskType = 'select_visit' | 'select_interview' | 'select_meeting'
export type TaskStatus = 'pending' | 'responded' | 'completed'

export interface RespondedSlot {
  date: string
  startTime: string
  endTime: string
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
  // Ward visit: availableDays = [0] (Sundays)
  availableDays: number[]
  // Interview/Meeting: specific dates admin selected
  availableDates?: string[]          // YYYY-MM-DD[] for interview/meeting
  availableStartTime?: string        // HH:mm
  availableEndTime?: string          // HH:mm
  slotDurationMinutes?: number       // interview/meeting slot size (default 60)
  respondedSlots?: RespondedSlot[]   // submitted by president for interview/meeting
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
