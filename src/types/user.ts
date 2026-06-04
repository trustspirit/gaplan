export type UserRole = 'admin' | 'seventy' | 'president' | 'pending'

export interface AppUser {
  uid: string
  email: string
  name: string
  role: UserRole
  regionId?: string        // primary region (first of regionIds, kept for backward compat)
  regionIds?: string[]     // all assigned regions for seventy
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
