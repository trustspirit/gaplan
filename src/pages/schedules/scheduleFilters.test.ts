import type { GeneralSchedule, Schedule } from '@/types'
import {
  buildBoardItems,
  countBoardItems,
  filterByRegion,
  filterByStatus,
  groupBoardItemsByMonth,
  kindOfScheduleType,
  scheduleQueryFor,
  SCHEDULE_KINDS,
} from './scheduleFilters'

const RANGE = { start: '2026-01-01', end: '2026-12-31' }

function schedule(over: Partial<Schedule> = {}): Schedule {
  return {
    id: 's1',
    type: 'ward_visit',
    seventyUid: 'sv1',
    unitId: 'u1',
    presidentUid: null,
    date: '2026-03-10',
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    createdBy: 'admin',
    ...over,
  }
}

function event(over: Partial<GeneralSchedule> = {}): GeneralSchedule {
  return {
    id: 'g1',
    title: '지역 대회',
    date: '2026-03-11',
    category: 'conference',
    createdBy: 'admin',
    createdAt: '2026-01-01',
    isPublic: true,
    ...over,
  }
}

function build(over: Partial<Parameters<typeof buildBoardItems>[0]> = {}) {
  return buildBoardItems({
    schedules: [],
    generalSchedules: [],
    kinds: [...SCHEDULE_KINDS],
    range: RANGE,
    ...over,
  })
}

describe('kindOfScheduleType', () => {
  it('maps visits, interviews and meetings onto a filter kind', () => {
    expect(kindOfScheduleType('ward_visit')).toBe('visit')
    expect(kindOfScheduleType('interview')).toBe('interview')
    expect(kindOfScheduleType('meeting')).toBe('interview')
  })

  // 참석 기록은 일정이 아니다 — 행사 자체가 GeneralSchedule로 따로 실려 온다.
  it('gives attendance rows no kind at all', () => {
    expect(kindOfScheduleType('general_attendance')).toBeNull()
  })
})

describe('buildBoardItems', () => {
  it('keeps only confirmed schedules', () => {
    const items = build({
      schedules: [
        schedule({ id: 'ok' }),
        schedule({ id: 'pending', status: 'pending' }),
        schedule({ id: 'cancelled', status: 'cancelled' }),
      ],
    })
    expect(items.map((i) => i.key)).toEqual(['s-ok'])
  })

  // 참석 등록한 행사가 목록에 두 줄로 나오던 옛 CalendarPage의 버그를 고정한다.
  it('never lists an event twice by way of its attendance row', () => {
    const items = build({
      schedules: [schedule({ id: 'att', type: 'general_attendance', generalScheduleId: 'g1' })],
      generalSchedules: [event({ id: 'g1' })],
    })
    expect(items.map((i) => i.key)).toEqual(['e-g1'])
  })

  it('drops kinds that are not selected', () => {
    const items = build({
      schedules: [schedule({ id: 'v' }), schedule({ id: 'i', type: 'interview' })],
      generalSchedules: [event()],
      kinds: ['interview'],
    })
    expect(items.map((i) => i.key)).toEqual(['s-i'])
  })

  it('drops events entirely when the event kind is unselected', () => {
    const items = build({ generalSchedules: [event()], kinds: ['visit', 'interview'] })
    expect(items).toEqual([])
  })

  it('applies the date range to both schedules and events', () => {
    const items = build({
      schedules: [
        schedule({ id: 'in', date: '2026-03-10' }),
        schedule({ id: 'out', date: '2025-03-10' }),
      ],
      generalSchedules: [
        event({ id: 'gin', date: '2026-03-11' }),
        event({ id: 'gout', date: '2027-01-01' }),
      ],
    })
    expect(items.map((i) => i.key).sort()).toEqual(['e-gin', 's-in'])
  })

  it('hides rows that are waiting out an undoable delete', () => {
    const items = build({
      schedules: [schedule({ id: 'gone' })],
      hiddenIds: new Set(['gone']),
    })
    expect(items).toEqual([])
  })

  it('sorts by date and then by start time', () => {
    const items = build({
      schedules: [
        schedule({ id: 'late', date: '2026-03-10', startTime: '15:00' }),
        schedule({ id: 'early', date: '2026-03-10', startTime: '09:00' }),
        schedule({ id: 'yesterday', date: '2026-03-09', startTime: '23:00' }),
      ],
    })
    expect(items.map((i) => i.key)).toEqual(['s-yesterday', 's-early', 's-late'])
  })

  // 시각이 없는 행사는 그 날의 맨 앞에 온다 — 하루 종일 있는 일로 읽힌다.
  it('puts an untimed event ahead of that day’s timed rows', () => {
    const items = build({
      schedules: [schedule({ id: 'morning', date: '2026-03-10', startTime: '09:00' })],
      generalSchedules: [event({ id: 'allday', date: '2026-03-10', startTime: undefined })],
    })
    expect(items.map((i) => i.key)).toEqual(['e-allday', 's-morning'])
  })
})

describe('filterByStatus', () => {
  const items = build({
    schedules: [
      schedule({ id: 'past', date: '2026-03-01' }),
      schedule({ id: 'today', date: '2026-03-10' }),
      schedule({ id: 'future', date: '2026-03-20' }),
    ],
  })

  it('keeps everything under all', () => {
    expect(filterByStatus(items, 'all', '2026-03-10')).toHaveLength(3)
  })

  // 오늘 일정은 아직 안 지났다 — 예정에 들어간다.
  it('counts today as upcoming, not completed', () => {
    expect(filterByStatus(items, 'upcoming', '2026-03-10').map((i) => i.key)).toEqual([
      's-today',
      's-future',
    ])
    expect(filterByStatus(items, 'completed', '2026-03-10').map((i) => i.key)).toEqual(['s-past'])
  })
})

describe('filterByRegion', () => {
  it('keeps every row when no region is chosen', () => {
    const items = build({ schedules: [schedule({ regionId: 'r1' })] })
    expect(filterByRegion(items, null)).toHaveLength(1)
  })

  it('keeps only schedules of the chosen region', () => {
    const items = build({
      schedules: [
        schedule({ id: 'mine', type: 'meeting', unitId: '', regionId: 'r1' }),
        schedule({ id: 'theirs', type: 'meeting', unitId: '', regionId: 'r2' }),
      ],
    })
    expect(filterByRegion(items, 'r1').map((i) => i.key)).toEqual(['s-mine'])
  })

  // 대상 지역이 비어 있는 행사는 전사 공지다 — 어느 지역을 골라도 보여야 한다.
  it('always keeps an org-wide event but scopes a targeted one', () => {
    const items = build({
      generalSchedules: [
        event({ id: 'orgwide', targetRegionIds: [] }),
        event({ id: 'r1only', targetRegionIds: ['r1'] }),
        event({ id: 'r2only', targetRegionIds: ['r2'] }),
      ],
    })
    expect(
      filterByRegion(items, 'r1')
        .map((i) => i.key)
        .sort(),
    ).toEqual(['e-orgwide', 'e-r1only'])
  })
})

describe('countBoardItems', () => {
  it('counts this month, upcoming and completed off the same list', () => {
    const items = build({
      schedules: [
        schedule({ id: 'lastmonth', date: '2026-02-20' }),
        schedule({ id: 'earlier', date: '2026-03-01' }),
        schedule({ id: 'later', date: '2026-03-20' }),
        schedule({ id: 'nextmonth', date: '2026-04-05' }),
      ],
    })
    expect(countBoardItems(items, '2026-03-10')).toEqual({
      thisMonth: 2,
      upcoming: 2,
      completed: 2,
    })
  })
})

describe('groupBoardItemsByMonth', () => {
  it('groups by calendar month and keeps the order it was given', () => {
    const items = build({
      schedules: [
        schedule({ id: 'a', date: '2026-03-01' }),
        schedule({ id: 'b', date: '2026-03-20' }),
        schedule({ id: 'c', date: '2026-04-05' }),
      ],
    })
    const grouped = groupBoardItemsByMonth(items)
    expect([...grouped.keys()]).toEqual(['2026-03', '2026-04'])
    expect(grouped.get('2026-03')!.map((i) => i.key)).toEqual(['s-a', 's-b'])
  })
})

describe('scheduleQueryFor', () => {
  const base = { uid: 'u1', email: 'a@b.com', name: 'n', createdAt: '2026-01-01' } as const

  it('scopes a president to their own schedules', () => {
    expect(scheduleQueryFor({ ...base, role: 'president' })).toEqual({ presidentUid: 'u1' })
  })

  it('scopes a seventy to the schedules they own', () => {
    expect(scheduleQueryFor({ ...base, role: 'seventy' })).toEqual({ seventyUid: 'u1' })
  })

  it('scopes an exec secretary to the seventy they serve', () => {
    expect(
      scheduleQueryFor({ ...base, role: 'exec_secretary', assignedSeventyUid: 'sv9' }),
    ).toEqual({
      seventyUid: 'sv9',
    })
  })

  // 배정된 칠십인이 없으면 빈 문자열을 넘긴다 — 조건 없는 전체 조회로 새지 않게.
  it('asks for nothing when an exec secretary has no seventy yet', () => {
    expect(scheduleQueryFor({ ...base, role: 'exec_secretary' })).toEqual({ seventyUid: '' })
  })

  it('lets an admin see everything', () => {
    expect(scheduleQueryFor({ ...base, role: 'admin' })).toEqual({})
  })
})
