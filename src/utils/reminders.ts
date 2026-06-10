import dayjs from 'dayjs'
import type { Schedule } from '@/types'

export type ReminderSeverity = 'green' | 'amber' | 'red'

export interface QuarterInfo { start: string; end: string; daysLeft: number }

export interface InterviewReminder {
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

export function computeInterviewReminders(
  units: { id: string; name: string }[],
  presidentNameByUnit: Map<string, string>,
  schedules: Schedule[],
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
    .filter(u => !hasInterview(u.id))
    .map(u => ({
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
    if (v.type !== 'ward_visit' || !ACTIVE(v) || v.date < today) continue
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
