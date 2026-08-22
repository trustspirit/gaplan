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

  // Title now comes from the shared buildScheduleTitle rule (Task 7): a ward
  // visit takes the ward as its subject when a ward is known, not the unit.
  it('titles a ward visit with the ward name, when there is one', () => {
    const row = toScheduleRow({
      schedule: schedule({ wardName: '녹번 와드' }),
      unitName: '서울 스테이크',
      wardLabel: '녹번 와드',
      today: TODAY,
      t,
    })
    expect(row.title).toBe('녹번 와드 방문')
  })

  it('falls back to the unit name when there is no ward', () => {
    const row = toScheduleRow({ schedule: schedule(), unitName: '서울 스테이크', today: TODAY, t })
    expect(row.title).toBe('서울 스테이크 방문')
  })

  // wardLabel is the caller-resolved (locale-aware) display name — e.g. what
  // useUnits().getWardName(schedule.wardName) returns — not the raw
  // schedule.wardName. The function must be pure, so it never resolves this
  // itself; it just places whatever resolved label the caller hands it.
  it('puts the resolved ward label in the subtitle when there is no custom title', () => {
    const row = toScheduleRow({
      schedule: schedule({ wardName: '녹번 와드' }),
      unitName: '서울 스테이크',
      wardLabel: 'Nokbeon Ward',
      today: TODAY,
      t,
    })
    expect(row.subtitle).toBe('Nokbeon Ward')
  })

  it('has no subtitle when the schedule has no ward', () => {
    const row = toScheduleRow({ schedule: schedule(), unitName: '서울 스테이크', today: TODAY, t })
    expect(row.subtitle).toBeUndefined()
  })

  // buildScheduleTitle checks customTitle first, so it still wins over the
  // ward-visit rule. But the subtitle rule (Task 7) no longer special-cases
  // customTitle — it only asks whether the title already said the place. A
  // custom title doesn't say the ward, so the ward still surfaces below it.
  it('prefers the custom title over the unit name, but still surfaces the ward as subtitle', () => {
    const row = toScheduleRow({
      schedule: schedule({ customTitle: '특별 모임', wardName: '녹번 와드' }),
      unitName: '서울 스테이크',
      wardLabel: '녹번 와드',
      today: TODAY,
      t,
    })
    expect(row.title).toBe('특별 모임')
    expect(row.subtitle).toBe('녹번 와드')
  })

  // Exact match, not toContain — this task's guarantee is that the format
  // (the en dash separator) stays exactly as ScheduleItem.tsx renders it.
  it('carries the time range as meta, formatted exactly as the component does', () => {
    const row = toScheduleRow({ schedule: schedule(), unitName: 'u', today: TODAY, t })
    expect(row.meta).toBe('10:00 – 11:00')
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

  // 네 경로(앱·구글·카카오·ICS)의 제목이 한 규칙에서 나와야 한다.
  it('와드 방문 제목은 와드를 주어로 쓴다', () => {
    const row = toScheduleRow({
      schedule: schedule({ type: 'ward_visit', wardName: '교문 와드' }),
      unitName: '서울동 스테이크',
      wardLabel: '교문 와드',
      today: TODAY,
      t,
    })
    expect(row.title).toBe('교문 와드 방문')
  })

  // 제목이 이미 장소를 말했으면 부제가 같은 말을 반복하지 않는다.
  it('제목이 말한 장소는 부제에서 뺀다', () => {
    const row = toScheduleRow({
      schedule: schedule({ type: 'ward_visit', wardName: '교문 와드', location: '교문 와드' }),
      unitName: '서울동 스테이크',
      wardLabel: '교문 와드',
      today: TODAY,
      t,
    })
    expect(row.subtitle).toBe('서울동 스테이크')
  })

  it('접견은 장소를 부제로 보여준다', () => {
    const row = toScheduleRow({
      schedule: schedule({ type: 'interview', location: '온라인 (Zoom)' }),
      unitName: '서울동 스테이크',
      today: TODAY,
      t,
    })
    expect(row.subtitle).toBe('온라인 (Zoom)')
  })

  // 지난 일정은 흐리게 — 지금 .past 클래스가 하는 일을 행 데이터로 옮긴다.
  // dimmed, not highlighted: .highlighted fills a background (adds emphasis)
  // while .past mutes text (removes emphasis) — opposite mechanisms, so a
  // past schedule must not borrow the "highlighted" field.
  it('marks a past schedule as dimmed, and a future one as not dimmed', () => {
    const past = toScheduleRow({
      schedule: schedule({ date: '2026-03-01' }),
      unitName: 'u',
      today: TODAY,
      t,
    })
    const future = toScheduleRow({ schedule: schedule(), unitName: 'u', today: TODAY, t })
    expect(past.dimmed).toBe(true)
    expect(future.dimmed).toBe(false)
    expect(past.highlighted).toBeUndefined()
    expect(future.highlighted).toBeUndefined()
  })
})
