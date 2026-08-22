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
