import dayjs from 'dayjs'
import type { Schedule } from '@/types'
import { getWardIdByName } from '@/constants/regions'

export type ReminderSeverity = 'green' | 'amber' | 'red'

export interface QuarterInfo { start: string; end: string; daysLeft: number }

export interface InterviewReminder {
  key: string            // `interview:{unitId}:{quarterStart}`
  unitId: string
  unitName: string
  presidentName: string | null
  severity: ReminderSeverity
}

export interface MeetingReminder {
  key: string            // `meeting:{visitScheduleId}`
  scheduleId: string
  wardName: string
  unitId: string
  visitDate: string
  meetingByDate: string  // visitDate - 14d
  severity: ReminderSeverity
}

export const MEETING_LEAD_DAYS = 14

const ACTIVE = (s: Schedule) => s.status === 'confirmed' || s.status === 'pending'

export function currentQuarter(today: string): QuarterInfo {
  const t = dayjs(today)
  const q = Math.floor(t.month() / 3)           // 0..3
  const start = t.month(q * 3).startOf('month')
  const end = t.month(q * 3 + 2).endOf('month')
  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
    daysLeft: end.startOf('day').diff(t.startOf('day'), 'day'),
  }
}

export function interviewSeverity(daysLeft: number): ReminderSeverity {
  if (daysLeft > 42) return 'green'
  if (daysLeft >= 15) return 'amber'
  return 'red'
}

export function meetingSeverity(daysUntilMeetingBy: number): ReminderSeverity {
  if (daysUntilMeetingBy > 7) return 'green'
  if (daysUntilMeetingBy >= 0) return 'amber'
  return 'red'
}

const SEVERITY_RANK: Record<ReminderSeverity, number> = { red: 0, amber: 1, green: 2 }

export function sortBySeverity<T extends { severity: ReminderSeverity }>(items: T[]): T[] {
  return [...items].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

export function interviewReminderKey(unitId: string, quarterStart: string) {
  return `interview:${unitId}:${quarterStart}`
}

export function computeInterviewReminders(
  units: { id: string; name: string }[],
  presidentNameByUnit: Map<string, string>,
  schedules: Schedule[],
  dismissedKeys: Set<string>,
  today: string,
): InterviewReminder[] {
  const q = currentQuarter(today)
  const sev = interviewSeverity(q.daysLeft)
  // 분기 접견은 스테이크/지방부 회장과의 접견/모임으로만 충족.
  // targetKind 없는 레거시(interview/meeting, wardId 없음)는 스테이크장 대상으로 간주(back-compat).
  const isStakeTarget = (s: Schedule) =>
    s.targetKind === 'stake_president' || (s.targetKind === undefined && !s.wardId)
  const hasContact = (unitId: string) => schedules.some(s =>
    (s.type === 'interview' || s.type === 'meeting') &&
    s.unitId === unitId &&
    ACTIVE(s) &&
    isStakeTarget(s) &&
    s.date >= q.start && s.date <= q.end,
  )
  return units
    .filter(u => {
      if (hasContact(u.id)) return false
      const key = interviewReminderKey(u.id, q.start)
      if (dismissedKeys.has(key)) return false
      return true
    })
    .map(u => ({
      key: interviewReminderKey(u.id, q.start),
      unitId: u.id,
      unitName: u.name,
      presidentName: presidentNameByUnit.get(u.id) ?? null,
      severity: sev,
    }))
}

export function computeMeetingReminders(
  wardVisits: Schedule[],
  meetings: Schedule[],
  dismissedKeys: Set<string>,
  today: string,
): MeetingReminder[] {
  const result: MeetingReminder[] = []
  for (const v of wardVisits) {
    if (v.type !== 'ward_visit' || !ACTIVE(v) || v.date <= today) continue
    const key = `meeting:${v.id}`
    if (dismissedKeys.has(key)) continue
    const meetingBy = dayjs(v.date).subtract(MEETING_LEAD_DAYS, 'day')
    const visitWardId = v.wardId ?? (v.wardName ? getWardIdByName(v.wardName) : undefined)
    // 방문 와드의 감독/지부회장과의 접견 또는 모임이 방문일 이전(당일 포함) 있으면 충족.
    const satisfied = !!visitWardId && meetings.some(m =>
      (m.type === 'meeting' || m.type === 'interview') &&
      m.targetKind === 'ward_bishop' &&
      m.wardId === visitWardId &&
      ACTIVE(m) &&
      m.date <= v.date,
    )
    if (satisfied) continue
    const daysUntil = meetingBy.startOf('day').diff(dayjs(today).startOf('day'), 'day')
    result.push({
      key,
      scheduleId: v.id,
      wardName: v.wardName ?? '',
      unitId: v.unitId,
      visitDate: v.date,
      meetingByDate: meetingBy.format('YYYY-MM-DD'),
      severity: meetingSeverity(daysUntil),
    })
  }
  return result
}

export function selectMeetingReminderSchedules(
  schedules: Schedule[],
  scopeUnitIds: Set<string>,
  actingSeventyUid: string | null,
): { wardVisits: Schedule[]; meetings: Schedule[] } {
  const inScope = (schedule: Schedule) =>
    scopeUnitIds.has(schedule.unitId) &&
    (actingSeventyUid ? schedule.seventyUid === actingSeventyUid : true)

  return {
    wardVisits: schedules.filter(s => s.type === 'ward_visit' && inScope(s)),
    // 모임 리마인더 충족 근거: 모임뿐 아니라 접견도 인정 (둘 다 확인)
    meetings: schedules.filter(s => (s.type === 'meeting' || s.type === 'interview') && inScope(s)),
  }
}

export function hasPendingReminders(
  units: { id: string }[],
  schedules: Schedule[],
  scopeUnitIds: Set<string>,
  actingSeventyUid: string | null,
  dismissedKeys: Set<string>,
  today: string,
): boolean {
  const interviews = computeInterviewReminders(
    units.map(u => ({ id: u.id, name: '' })),
    new Map(),
    schedules,
    dismissedKeys,
    today,
  )
  if (interviews.length > 0) return true
  const { wardVisits, meetings } = selectMeetingReminderSchedules(
    schedules,
    scopeUnitIds,
    actingSeventyUid,
  )
  return computeMeetingReminders(wardVisits, meetings, dismissedKeys, today).length > 0
}
