import { describe, it, expect } from 'vitest'
import type { Schedule } from '@/types'
import {
  currentQuarter, interviewSeverity, meetingSeverity,
  computeInterviewReminders, computeMeetingReminders, selectMeetingReminderSchedules,
  hasPendingReminders,
} from './reminders'

function sched(p: Partial<Schedule>): Schedule {
  return {
    id: Math.random().toString(36).slice(2),
    type: 'interview',
    seventyUid: 's1',
    unitId: 'seoul-stake',
    presidentUid: 'p1',
    date: '2026-05-01',
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    createdBy: 'admin',
    ...p,
  }
}

describe('currentQuarter', () => {
  it('returns Q2 bounds for a May date', () => {
    const q = currentQuarter('2026-05-15')
    expect(q.start).toBe('2026-04-01')
    expect(q.end).toBe('2026-06-30')
    expect(q.daysLeft).toBe(46)
  })
  it('returns Q1 bounds for a Feb date', () => {
    const q = currentQuarter('2026-02-10')
    expect(q.start).toBe('2026-01-01')
    expect(q.end).toBe('2026-03-31')
  })
})

describe('severity helpers', () => {
  it('interview: >42 green, 15-42 amber, <=14 red', () => {
    expect(interviewSeverity(43)).toBe('green')
    expect(interviewSeverity(30)).toBe('amber')
    expect(interviewSeverity(14)).toBe('red')
  })
  it('meeting: >7 green, 0-7 amber, <0 red', () => {
    expect(meetingSeverity(8)).toBe('green')
    expect(meetingSeverity(3)).toBe('amber')
    expect(meetingSeverity(-1)).toBe('red')
  })
})

describe('computeInterviewReminders', () => {
  const units = [{ id: 'seoul-stake', name: '서울 스테이크' }, { id: 'gyeonggi-stake', name: '경기 스테이크' }]
  const names = new Map([['seoul-stake', '김회장'], ['gyeonggi-stake', '이회장']])
  const today = '2026-05-15'

  it('flags units with no interview this quarter', () => {
    const r = computeInterviewReminders(units, names, [], new Set(), today)
    expect(r).toHaveLength(2)
    expect(r[0].presidentName).toBe('김회장')
  })
  it('omits a unit that has an interview in the quarter', () => {
    const schedules = [sched({ type: 'interview', unitId: 'seoul-stake', date: '2026-05-10' })]
    const r = computeInterviewReminders(units, names, schedules, new Set(), today)
    expect(r.map(x => x.unitId)).toEqual(['gyeonggi-stake'])
  })
  it('ignores interviews outside the quarter', () => {
    const schedules = [sched({ type: 'interview', unitId: 'seoul-stake', date: '2026-01-10' })]
    const r = computeInterviewReminders(units, names, schedules, new Set(), today)
    expect(r).toHaveLength(2)
  })
  it('omits a unit that has a meeting (not just an interview) in the quarter', () => {
    const schedules = [sched({ type: 'meeting', unitId: 'seoul-stake', date: '2026-05-10' })]
    const r = computeInterviewReminders(units, names, schedules, new Set(), today)
    expect(r.map(x => x.unitId)).toEqual(['gyeonggi-stake'])
  })
  it('uses null presidentName when unit has no president', () => {
    const r = computeInterviewReminders([{ id: 'x-stake', name: 'X' }], new Map(), [], new Set(), today)
    expect(r[0].presidentName).toBeNull()
  })
})

describe('computeMeetingReminders', () => {
  const today = '2026-06-01'

  it('flags an upcoming ward visit with no meeting', () => {
    const visits = [sched({ type: 'ward_visit', unitId: 'seoul-stake', date: '2026-06-20', wardName: '녹번 와드' })]
    const r = computeMeetingReminders(visits, [], new Set(), today)
    expect(r).toHaveLength(1)
    expect(r[0].meetingByDate).toBe('2026-06-06')
    expect(r[0].wardName).toBe('녹번 와드')
  })
  it('omits when a meeting for the unit exists on or before the visit', () => {
    const visits = [sched({ id: 'v-omit1', type: 'ward_visit', unitId: 'seoul-stake', wardId: 'seoul-nokbeon', wardName: '녹번 와드', date: '2026-06-20' })]
    const meetings = [sched({ type: 'meeting', unitId: 'seoul-stake', relatedVisitId: 'v-omit1', date: '2026-06-05' })]
    const r = computeMeetingReminders(visits, meetings, new Set(), today)
    expect(r).toHaveLength(0)
  })
  it('omits when an interview (not just a meeting) for the unit exists before the visit', () => {
    const visits = [sched({ id: 'v-omit2', type: 'ward_visit', unitId: 'seoul-stake', wardId: 'seoul-nokbeon', wardName: '녹번 와드', date: '2026-06-20' })]
    const contacts = [sched({ type: 'interview', unitId: 'seoul-stake', relatedVisitId: 'v-omit2', date: '2026-06-05' })]
    const r = computeMeetingReminders(visits, contacts, new Set(), today)
    expect(r).toHaveLength(0)
  })
  it('omits even when the meeting is well before the 14d mark (existence, not timing)', () => {
    // meeting-by는 2026-06-06이지만 준비 모임을 5.20에 일찍 잡아둔 경우에도 일정이 존재하면 충족
    const visits = [sched({ id: 'v-omit3', type: 'ward_visit', unitId: 'seoul-stake', wardId: 'seoul-nokbeon', wardName: '녹번 와드', date: '2026-06-20' })]
    const meetings = [sched({ type: 'meeting', unitId: 'seoul-stake', relatedVisitId: 'v-omit3', date: '2026-05-20' })]
    const r = computeMeetingReminders(visits, meetings, new Set(), today)
    expect(r).toHaveLength(0)
  })
  it('still flags when the only meeting is after the visit (not a prep meeting)', () => {
    const visits = [sched({ type: 'ward_visit', unitId: 'seoul-stake', date: '2026-06-20', wardName: '녹번 와드' })]
    const meetings = [sched({ type: 'meeting', unitId: 'seoul-stake', targetKind: 'ward_bishop', wardId: 'seoul-nokbeon', date: '2026-06-25' })]
    const r = computeMeetingReminders(visits, meetings, new Set(), today)
    expect(r).toHaveLength(1)
  })
  it('does not count a meeting for a different unit', () => {
    const visits = [sched({ type: 'ward_visit', unitId: 'seoul-stake', date: '2026-06-20', wardName: '녹번 와드' })]
    const meetings = [sched({ type: 'meeting', unitId: 'seoul-stake', targetKind: 'ward_bishop', wardId: 'seoul-sindang', date: '2026-06-05' })]
    const r = computeMeetingReminders(visits, meetings, new Set(), today)
    expect(r).toHaveLength(1)
  })
  it('omits a dismissed visit', () => {
    const v = sched({ type: 'ward_visit', unitId: 'seoul-stake', date: '2026-06-20' })
    const r = computeMeetingReminders([v], [], new Set([`meeting:${v.id}`]), today)
    expect(r).toHaveLength(0)
  })
  it('ignores past visits', () => {
    const visits = [sched({ type: 'ward_visit', date: '2026-05-01' })]
    const r = computeMeetingReminders(visits, [], new Set(), today)
    expect(r).toHaveLength(0)
  })
})

describe('selectMeetingReminderSchedules', () => {
  it('actingSeventyUid가 있으면 같은 unit의 다른 칠십인 일정으로 모임 리마인더를 만족 처리하지 않는다', () => {
    const schedules = [
      sched({ id: 'visit-s1', type: 'ward_visit', seventyUid: 's1', unitId: 'seoul-stake', date: '2026-06-20' }),
      sched({ id: 'meeting-s2', type: 'meeting', seventyUid: 's2', unitId: 'seoul-stake', date: '2026-06-06' }),
    ]
    const selected = selectMeetingReminderSchedules(schedules, new Set(['seoul-stake']), 's1')

    expect(selected.wardVisits.map(s => s.id)).toEqual(['visit-s1'])
    expect(selected.meetings).toHaveLength(0)
  })

  it('actingSeventyUid가 없으면 unit scope로 모임 리마인더 일정을 고른다', () => {
    const schedules = [
      sched({ id: 'visit-in-scope', type: 'ward_visit', seventyUid: 's1', unitId: 'seoul-stake' }),
      sched({ id: 'meeting-in-scope', type: 'meeting', seventyUid: 's2', unitId: 'seoul-stake' }),
      sched({ id: 'visit-out-scope', type: 'ward_visit', seventyUid: 's1', unitId: 'busan-stake' }),
    ]
    const selected = selectMeetingReminderSchedules(schedules, new Set(['seoul-stake']), null)

    expect(selected.wardVisits.map(s => s.id)).toEqual(['visit-in-scope'])
    expect(selected.meetings.map(s => s.id)).toEqual(['meeting-in-scope'])
  })

  it('접견도 모임 리마인더 충족 근거(meetings 버킷)에 포함한다', () => {
    const schedules = [
      sched({ id: 'visit', type: 'ward_visit', seventyUid: 's1', unitId: 'seoul-stake' }),
      sched({ id: 'interview', type: 'interview', seventyUid: 's1', unitId: 'seoul-stake' }),
      sched({ id: 'meeting', type: 'meeting', seventyUid: 's1', unitId: 'seoul-stake' }),
    ]
    const selected = selectMeetingReminderSchedules(schedules, new Set(['seoul-stake']), 's1')

    expect(selected.meetings.map(s => s.id).sort()).toEqual(['interview', 'meeting'])
  })

  it('actingSeventyUid가 있어도 허용 unit 밖의 방문은 모임 리마인더에서 제외한다', () => {
    const s = [
      sched({ id: 'v1', type: 'ward_visit', unitId: 'busan-stake', seventyUid: 's1' }),
    ]
    const { wardVisits } = selectMeetingReminderSchedules(s, new Set(['seoul-stake']), 's1')
    expect(wardVisits).toEqual([])
  })

  it('모임은 unit scope와 무관하게 버킷에 담는다 (relatedVisitId가 방문을 특정하므로)', () => {
    const s = [
      sched({ id: 'm1', type: 'meeting', unitId: 'busan-stake', seventyUid: 's1', relatedVisitId: 'v1' }),
    ]
    const { meetings } = selectMeetingReminderSchedules(s, new Set(['seoul-stake']), 's1')
    expect(meetings.map(m => m.id)).toEqual(['m1'])
  })

  it('모임은 여전히 actingSeventyUid로는 걸러진다', () => {
    const s = [
      sched({ id: 'm1', type: 'meeting', unitId: 'seoul-stake', seventyUid: 's2', relatedVisitId: 'v1' }),
    ]
    const { meetings } = selectMeetingReminderSchedules(s, new Set(['seoul-stake']), 's1')
    expect(meetings).toEqual([])
  })
})

describe('interview reminder — stake_president only', () => {
  const units = [{ id: 'seoul-stake', name: '서울 스테이크' }]
  it('ward_bishop interview does NOT satisfy the quarterly stake reminder', () => {
    const s = [sched({ type: 'interview', unitId: 'seoul-stake', targetKind: 'ward_bishop', wardId: 'seoul-nokbeon', date: '2026-05-01' })]
    const r = computeInterviewReminders(units, new Map(), s, new Set(), '2026-05-15')
    expect(r).toHaveLength(1)
  })
  it('stake_president interview satisfies it', () => {
    const s = [sched({ type: 'interview', unitId: 'seoul-stake', targetKind: 'stake_president', date: '2026-05-01' })]
    const r = computeInterviewReminders(units, new Map(), s, new Set(), '2026-05-15')
    expect(r).toHaveLength(0)
  })
  it('legacy interview without targetKind still satisfies (back-compat)', () => {
    const s = [sched({ type: 'interview', unitId: 'seoul-stake', date: '2026-05-01' })]
    const r = computeInterviewReminders(units, new Map(), s, new Set(), '2026-05-15')
    expect(r).toHaveLength(0)
  })
})

describe('meeting reminder — relatedVisitId match', () => {
  const visit = sched({ id: 'v1', type: 'ward_visit', date: '2026-06-01', wardName: '교문 와드', unitId: 'seoul-east-stake' })
  const D = new Set<string>()

  it('is satisfied by a meeting linked to this visit', () => {
    const m = sched({ type: 'meeting', date: '2026-05-10', relatedVisitId: 'v1' })
    expect(computeMeetingReminders([visit], [m], D, '2026-05-01')).toHaveLength(0)
  })

  it('is satisfied by an interview linked to this visit', () => {
    const m = sched({ type: 'interview', date: '2026-05-10', relatedVisitId: 'v1' })
    expect(computeMeetingReminders([visit], [m], D, '2026-05-01')).toHaveLength(0)
  })

  it('is NOT satisfied by a meeting linked to a DIFFERENT visit', () => {
    const m = sched({ type: 'meeting', date: '2026-05-10', relatedVisitId: 'v2' })
    expect(computeMeetingReminders([visit], [m], D, '2026-05-01')).toHaveLength(1)
  })

  it('is NOT satisfied by an unlinked ward_bishop meeting for the same ward', () => {
    const m = sched({ type: 'meeting', date: '2026-05-10', targetKind: 'ward_bishop', wardId: 'seoul-east-gyomun' })
    expect(computeMeetingReminders([visit], [m], D, '2026-05-01')).toHaveLength(1)
  })

  it('is NOT satisfied by a linked meeting scheduled AFTER the visit', () => {
    const m = sched({ type: 'meeting', date: '2026-06-05', relatedVisitId: 'v1' })
    expect(computeMeetingReminders([visit], [m], D, '2026-05-01')).toHaveLength(1)
  })

  it('is NOT satisfied by a cancelled linked meeting', () => {
    const m = sched({ type: 'meeting', date: '2026-05-10', relatedVisitId: 'v1', status: 'cancelled' })
    expect(computeMeetingReminders([visit], [m], D, '2026-05-01')).toHaveLength(1)
  })

  it('is satisfied even when the visit has no resolvable ward name', () => {
    const v = sched({ id: 'v9', type: 'ward_visit', date: '2026-06-01', wardName: '없는 와드' })
    const m = sched({ type: 'meeting', date: '2026-05-10', relatedVisitId: 'v9' })
    expect(computeMeetingReminders([v], [m], D, '2026-05-01')).toHaveLength(0)
  })
})

describe('hasPendingReminders', () => {
  const units = [{ id: 'seoul-stake' }]
  const scope = new Set(['seoul-stake'])
  it('true when the quarterly stake interview is missing', () => {
    expect(hasPendingReminders(units, [], scope, null, new Set(), '2026-05-15')).toBe(true)
  })
  it('false when stake_president interview exists and no future visits', () => {
    const s = [sched({ type: 'interview', unitId: 'seoul-stake', targetKind: 'stake_president', date: '2026-05-01' })]
    expect(hasPendingReminders(units, s, scope, null, new Set(), '2026-05-15')).toBe(false)
  })
})
