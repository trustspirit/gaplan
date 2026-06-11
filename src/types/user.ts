export type UserRole = 'admin' | 'exec_secretary' | 'seventy' | 'president' | 'pending'
export type SecondaryRole = 'exec_secretary' | 'seventy' | 'president'

export interface AppUser {
  uid: string
  email: string
  name: string
  role: UserRole
  secondaryRole?: SecondaryRole  // admin only: additional role (집행서기/지역칠십인/회장)
  regionId?: string        // primary region (first of regionIds, kept for backward compat)
  regionIds?: string[]     // all assigned regions for seventy
  unitId?: string
  assignedSeventyUid?: string  // exec_secretary / admin+exec_secretary: 담당 칠십인 uid
  calendarConnected?: boolean
  preRegistered?: boolean  // true = admin-created placeholder, not yet linked to Firebase Auth
  createdAt: string
}

export interface Invite {
  email: string
  role: UserRole
  secondaryRole?: SecondaryRole
  assignedRegionId?: string
  assignedSeventyUid?: string
  unitId?: string
  invitedBy: string
  createdAt: string
}
