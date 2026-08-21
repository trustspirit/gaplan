import dayjs from 'dayjs'
import type { Schedule } from '@/types'
import { DOW_LABELS } from '@/utils/date'
import { toScheduleRow } from './scheduleRow'

const t = (k: string) => k
const TODAY = '2026-03-10'

function schedule(over: Partial<Schedule> = {}): Schedule {
  return {
    id: 's1',
    type: 'ward_visit',
    seventyUid: 'sv1',
    unitId: 'u1',
    presidentUid: null,
    date: '2026-03-12',
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    createdBy: 'a1',
    ...over,
  } as Schedule
}

describe('toScheduleRow', () => {
  // Component wins over brief: dateCol renders date.format('M.D') (e.g. "3.12"),
  // not the bare day-of-month, and dow comes from the fixed-Korean DOW_LABELS
  // array (not dayjs(...).format('dd'), which is locale-dependent).
  it('puts the month.day and Korean weekday label in the lead block', () => {
    const row = toScheduleRow({ schedule: schedule(), unitName: '서울 스테이크', today: TODAY, t })
    const date = dayjs('2026-03-12')
    expect(row.lead?.primary).toBe(date.format('M.D'))
    expect(row.lead?.secondary).toBe(DOW_LABELS[date.day()])
  })

  // Component wins over brief: the main text (styles.unit) is always
  // customTitle ?? unitName. The ward name is never the title itself — it is
  // appended as a suffix only when there is no customTitle, which maps to
  // DataListRow.subtitle, not .title.
  it('titles the row with the unit name (or custom title), never the ward name', () => {
    const row = toScheduleRow({
      schedule: schedule({ wardName: '녹번 와드' }),
      unitName: '서울 스테이크',
      today: TODAY,
      t,
    })
    expect(row.title).toBe('서울 스테이크')
  })

  it('falls back to the unit name when there is no ward', () => {
    const row = toScheduleRow({ schedule: schedule(), unitName: '서울 스테이크', today: TODAY, t })
    expect(row.title).toBe('서울 스테이크')
  })

  it('puts the ward name in the subtitle when there is no custom title', () => {
    const row = toScheduleRow({
      schedule: schedule({ wardName: '녹번 와드' }),
      unitName: '서울 스테이크',
      today: TODAY,
      t,
    })
    expect(row.subtitle).toBe('녹번 와드')
  })

  it('prefers the custom title over the unit name, and drops the ward subtitle', () => {
    const row = toScheduleRow({
      schedule: schedule({ customTitle: '특별 모임', wardName: '녹번 와드' }),
      unitName: '서울 스테이크',
      today: TODAY,
      t,
    })
    expect(row.title).toBe('특별 모임')
    expect(row.subtitle).toBeUndefined()
  })

  it('carries the time range as meta', () => {
    const row = toScheduleRow({ schedule: schedule(), unitName: 'u', today: TODAY, t })
    expect(row.meta).toContain('10:00')
    expect(row.meta).toContain('11:00')
  })

  // 판정 R57 — 종류는 우측 배지 하나로만 말한다. 색 막대는 없앴다.
  it('says the schedule type once, as a tag', () => {
    const row = toScheduleRow({ schedule: schedule(), unitName: 'u', today: TODAY, t })
    expect(row.tag).toBe('schedule.type.ward_visit')
  })

  it('keeps the row id equal to the schedule id so React can key it', () => {
    expect(
      toScheduleRow({ schedule: schedule({ id: 'abc' }), unitName: 'u', today: TODAY, t }).id,
    ).toBe('abc')
  })

  // 지난 일정은 흐리게 — 지금 .past 클래스가 하는 일을 행 데이터로 옮긴다.
  it('marks a past schedule as not highlighted', () => {
    const past = toScheduleRow({
      schedule: schedule({ date: '2026-03-01' }),
      unitName: 'u',
      today: TODAY,
      t,
    })
    const future = toScheduleRow({ schedule: schedule(), unitName: 'u', today: TODAY, t })
    expect(past.highlighted).toBe(false)
    expect(future.highlighted).toBe(true)
  })
})
