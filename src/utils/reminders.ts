import dayjs from 'dayjs'
import type { Schedule } from '@/types'

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
export const MEETING_MATCH_WINDOW = 7

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
  const hasInterview = (unitId: string) => schedules.some(s =>
    s.type === 'interview' &&
    s.unitId === unitId &&
    ACTIVE(s) &&
    s.date >= q.start && s.date <= q.end,
  )
  return units
    .filter(u => {
      if (hasInterview(u.id)) return false
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
    const satisfied = meetings.some(m =>
      m.type === 'meeting' &&
      m.unitId === v.unitId &&
      ACTIVE(m) &&
      Math.abs(dayjs(m.date).diff(meetingBy, 'day')) <= MEETING_MATCH_WINDOW,
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
    actingSeventyUid ? schedule.seventyUid === actingSeventyUid : scopeUnitIds.has(schedule.unitId)

  return {
    wardVisits: schedules.filter(s => s.type === 'ward_visit' && inScope(s)),
    meetings: schedules.filter(s => s.type === 'meeting' && inScope(s)),
  }
}
