export type UserRole = 'admin' | 'seventy' | 'president'

export interface AppUser {
  uid: string
  email: string
  name: string
  role: UserRole
  regionId?: string
  unitId?: string
  calendarConnected?: boolean
  createdAt: string
}

export interface Invite {
  email: string
  role: UserRole
  assignedRegionId?: string
  invitedBy: string
  createdAt: string
}
