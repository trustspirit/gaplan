import type { AppUser } from './user'

export type GeneralScheduleCategory = 'conference' | 'fasting' | 'other'

export interface GeneralSchedule {
  id: string
  title: string
  date: string           // YYYY-MM-DD
  startTime?: string     // HH:mm
  endTime?: string       // HH:mm
  description?: string
  category: GeneralScheduleCategory
  createdBy: string      // uid
  createdAt: string
  isPublic: boolean
  targetRegionIds?: string[]   // empty = org-wide
  targetUnitIds?: string[]     // empty = no unit restriction
}

export function isGeneralScheduleRelevant(gs: GeneralSchedule, user: AppUser): boolean {
  const isOrgWide = !gs.targetRegionIds?.length && !gs.targetUnitIds?.length
  if (isOrgWide || user.role === 'admin') return true

  const userRegions = user.regionIds ?? (user.regionId ? [user.regionId] : [])
  const regionMatch = !!gs.targetRegionIds?.some(r => userRegions.includes(r))
  const unitMatch = !!gs.targetUnitIds?.includes(user.unitId ?? '')
  return regionMatch || unitMatch
}
