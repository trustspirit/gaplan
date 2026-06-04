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
  availableDays: number[]
  availableStartTime?: string   // interview/meeting (HH:mm)
  availableEndTime?: string     // interview/meeting (HH:mm)
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
