export type UserRole = 'admin' | 'exec_secretary' | 'seventy' | 'president' | 'pending'

export interface AppUser {
  uid: string
  email: string
  name: string
  role: UserRole
  regionId?: string        // primary region (first of regionIds, kept for backward compat)
  regionIds?: string[]     // all assigned regions for seventy
  unitId?: string
  assignedSeventyUid?: string  // exec_secretary/admin: 담당 칠십인 uid
  calendarConnected?: boolean
  preRegistered?: boolean  // true = admin-created placeholder, not yet linked to Firebase Auth
  createdAt: string
}

export interface Invite {
  email: string
  role: UserRole
  assignedRegionId?: string
  assignedSeventyUid?: string  // exec_secretary 초대 시 담당 칠십인
  invitedBy: string
  createdAt: string
}
