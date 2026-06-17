import { describe, it, expect } from 'vitest'
import type { Schedule } from '@/types'
import {
  currentQuarter, interviewSeverity, meetingSeverity,
  computeInterviewReminders, computeMeetingReminders, selectMeetingReminderSchedules,
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
  it('uses null presidentName when unit has no president', () => {
    const r = computeInterviewReminders([{ id: 'x-stake', name: 'X' }], new Map(), [], new Set(), today)
    expect(r[0].presidentName).toBeNull()
  })
})

describe('computeMeetingReminders', () => {
  const today = '2026-06-01'

  it('flags an upcoming ward visit with no meeting', () => {
    const visits = [sched({ type: 'ward_visit', unitId: 'seoul-stake', date: '2026-06-20', wardName: '광진 와드' })]
    const r = computeMeetingReminders(visits, [], new Set(), today)
    expect(r).toHaveLength(1)
    expect(r[0].meetingByDate).toBe('2026-06-06')
    expect(r[0].wardName).toBe('광진 와드')
  })
  it('omits when a meeting exists within ±7d of the meeting-by date', () => {
    const visits = [sched({ type: 'ward_visit', unitId: 'seoul-stake', date: '2026-06-20', wardName: '광진 와드' })]
    const meetings = [sched({ type: 'meeting', unitId: 'seoul-stake', date: '2026-06-05' })]
    const r = computeMeetingReminders(visits, meetings, new Set(), today)
    expect(r).toHaveLength(0)
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

  it('actingSeventyUid가 있어도 허용 unit 밖의 일정은 모임 리마인더에서 제외한다', () => {
    const schedules = [
      sched({ id: 'visit-in-scope', type: 'ward_visit', seventyUid: 's1', unitId: 'seoul-stake' }),
      sched({ id: 'visit-out-scope', type: 'ward_visit', seventyUid: 's1', unitId: 'busan-stake' }),
      sched({ id: 'meeting-out-scope', type: 'meeting', seventyUid: 's1', unitId: 'busan-stake' }),
    ]
    const selected = selectMeetingReminderSchedules(schedules, new Set(['seoul-stake']), 's1')

    expect(selected.wardVisits.map(s => s.id)).toEqual(['visit-in-scope'])
    expect(selected.meetings).toHaveLength(0)
  })
})
