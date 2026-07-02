import dayjs from 'dayjs'
import { getWardIdByName } from './regions'

// Pure mirror of src/utils/reminders.ts presence logic (see functions/src/regions.ts for the
// analogous mirroring pattern). Intentional duplication — do not import client code here.

export interface PresenceSchedule {
  id?: string
  type: string
  unitId: string
  seventyUid: string
  date: string
  status: string
  wardName?: string | null
  wardId?: string | null
  targetKind?: string | null
}

const ACTIVE = (s: PresenceSchedule) => s.status === 'confirmed' || s.status === 'pending'

export interface QuarterInfo { start: string; end: string }

export function currentQuarter(today: string): QuarterInfo {
  const t = dayjs(today)
  const q = Math.floor(t.month() / 3) // 0..3
  const start = t.month(q * 3).startOf('month')
  const end = t.month(q * 3 + 2).endOf('month')
  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
  }
}

const isStakeTarget = (s: PresenceSchedule) =>
  s.targetKind === 'stake_president' || (s.targetKind === undefined && !s.wardId)

function hasQuarterlyStakeContact(unitId: string, schedules: PresenceSchedule[], q: QuarterInfo): boolean {
  return schedules.some(s =>
    (s.type === 'interview' || s.type === 'meeting') &&
    s.unitId === unitId &&
    ACTIVE(s) &&
    isStakeTarget(s) &&
    s.date >= q.start && s.date <= q.end,
  )
}

function interviewReminderKey(unitId: string, quarterStart: string): string {
  return `interview:${unitId}:${quarterStart}`
}

/**
 * True if any unit lacks its quarterly stake-president interview/meeting (and it isn't
 * dismissed), OR any future ward_visit in scope lacks a satisfying ward_bishop
 * interview/meeting (and it isn't dismissed).
 */
export function hasPendingReminders(
  units: string[],
  schedules: PresenceSchedule[],
  scopeUnitIds: Set<string>,
  actingSeventyUid: string | null,
  dismissed: Set<string>,
  today: string,
): boolean {
  const q = currentQuarter(today)

  for (const unitId of units) {
    if (hasQuarterlyStakeContact(unitId, schedules, q)) continue
    const key = interviewReminderKey(unitId, q.start)
    if (dismissed.has(key)) continue
    return true
  }

  const inScope = (s: PresenceSchedule) =>
    scopeUnitIds.has(s.unitId) &&
    (actingSeventyUid ? s.seventyUid === actingSeventyUid : true)

  const wardVisits = schedules.filter(s => s.type === 'ward_visit' && inScope(s))
  const meetings = schedules.filter(s => (s.type === 'meeting' || s.type === 'interview') && inScope(s))

  for (const v of wardVisits) {
    if (!ACTIVE(v) || v.date <= today) continue
    const key = `meeting:${v.id ?? ''}`
    if (dismissed.has(key)) continue
    const visitWardId = v.wardId ?? (v.wardName ? getWardIdByName(v.wardName) : undefined)
    const satisfied = !!visitWardId && meetings.some(m =>
      m.targetKind === 'ward_bishop' &&
      m.wardId === visitWardId &&
      ACTIVE(m) &&
      m.date <= v.date,
    )
    if (!satisfied) return true
  }

  return false
}
