export type TaskType = 'select_visit' | 'select_interview'
export type TaskStatus = 'pending' | 'completed'

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
  availableDays: number[]       // 0=Sun … 6=Sat
  availableStartTime?: string   // interview only (HH:mm)
  availableEndTime?: string     // interview only (HH:mm)
}

export interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  createdAt: string
  taskId?: string
}
