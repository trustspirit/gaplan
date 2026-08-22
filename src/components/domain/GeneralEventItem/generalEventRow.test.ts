import dayjs from 'dayjs'
import type { GeneralSchedule } from '@/types'
import { DOW_LABELS } from '@/utils/date'
import { toGeneralEventRow } from './generalEventRow'

const TODAY = '2026-03-10'

function event(over: Partial<GeneralSchedule> = {}): GeneralSchedule {
  return {
    id: 'e1',
    title: '지역대회',
    date: '2026-03-12',
    category: 'conference',
    createdBy: 'a1',
    createdAt: TODAY,
    isPublic: true,
    ...over,
  } as GeneralSchedule
}

describe('toGeneralEventRow', () => {
  // Component wins over a bare day-of-month: GeneralEventItem.tsx renders
  // date.format('M.D') (e.g. "3.12"), and dow comes from the fixed-Korean
  // DOW_LABELS array, not a locale-dependent dayjs format.
  it('puts the month.day and Korean weekday label in the lead block', () => {
    const row = toGeneralEventRow({ event: event(), today: TODAY })
    const date = dayjs('2026-03-12')
    expect(row.lead?.primary).toBe(date.format('M.D'))
    expect(row.lead?.secondary).toBe(DOW_LABELS[date.day()])
  })

  it('titles the row with the event title', () => {
    const row = toGeneralEventRow({ event: event({ title: '금식 기도회' }), today: TODAY })
    expect(row.title).toBe('금식 기도회')
  })

  // Exact match, not toContain — the en dash separator must stay exactly as
  // GeneralEventItem.tsx renders it.
  it('carries the time range as meta, formatted exactly as the component does', () => {
    const row = toGeneralEventRow({
      event: event({ startTime: '10:00', endTime: '12:00' }),
      today: TODAY,
    })
    expect(row.meta).toBe('10:00 – 12:00')
  })

  it('has no meta when the event has no start or end time', () => {
    const row = toGeneralEventRow({ event: event(), today: TODAY })
    expect(row.meta).toBeUndefined()
  })

  it('has no meta when only one of start/end time is set', () => {
    const row = toGeneralEventRow({ event: event({ startTime: '10:00' }), today: TODAY })
    expect(row.meta).toBeUndefined()
  })

  it('keeps the row id equal to the event id so React can key it', () => {
    expect(toGeneralEventRow({ event: event({ id: 'xyz' }), today: TODAY }).id).toBe('xyz')
  })

  // 지난 행사는 흐리게 — 지금 .past 클래스가 하는 일을 행 데이터로 옮긴다.
  it('marks a past event as dimmed, and a future one as not dimmed', () => {
    const past = toGeneralEventRow({ event: event({ date: '2026-03-01' }), today: TODAY })
    const future = toGeneralEventRow({ event: event(), today: TODAY })
    expect(past.dimmed).toBe(true)
    expect(future.dimmed).toBe(false)
    expect(past.highlighted).toBeUndefined()
    expect(future.highlighted).toBeUndefined()
  })

  it('does not mark an event happening today as dimmed', () => {
    const row = toGeneralEventRow({ event: event({ date: TODAY }), today: TODAY })
    expect(row.dimmed).toBe(false)
  })
})

// event-toast-and-multiday brief §2-5: 여러 날 행사는 날짜를 범위로 보여준다
// (예: "9.3(수) – 9.4(목)"). 하루짜리는 지금 그대로(primary=M.D, secondary=dow 분리).
describe('toGeneralEventRow 여러 날 행사', () => {
  it('종료일이 있으면 lead.primary에 시작일–종료일 범위를 넣고 secondary는 비운다', () => {
    const row = toGeneralEventRow({
      event: event({ date: '2026-09-03', endDate: '2026-09-04' }),
      today: TODAY,
    })
    const start = dayjs('2026-09-03')
    const end = dayjs('2026-09-04')
    expect(row.lead?.primary).toBe(
      `${start.format('M.D')}(${DOW_LABELS[start.day()]}) – ${end.format('M.D')}(${DOW_LABELS[end.day()]})`,
    )
    expect(row.lead?.secondary).toBeUndefined()
  })

  it('종료일이 시작일과 같으면 하루짜리와 같은 모양을 유지한다', () => {
    const row = toGeneralEventRow({
      event: event({ date: '2026-03-12', endDate: '2026-03-12' }),
      today: TODAY,
    })
    const date = dayjs('2026-03-12')
    expect(row.lead?.primary).toBe(date.format('M.D'))
    expect(row.lead?.secondary).toBe(DOW_LABELS[date.day()])
  })
})
