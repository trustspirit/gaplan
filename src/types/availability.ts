export type SlotType = 'recurring' | 'override'

export interface AvailabilitySlot {
  id: string
  seventyUid: string
  type: SlotType
  recurringDays?: number[]
  date?: string
  startTime: string
  endTime: string
  isBlocked: boolean
}
