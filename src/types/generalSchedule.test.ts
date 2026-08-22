import { describe, it, expect } from 'vitest'
import type { GeneralSchedule } from './generalSchedule'
import { eventCoversDate, formatEventDateRange } from './generalSchedule'

function gs(partial: Partial<GeneralSchedule> = {}): GeneralSchedule {
  return {
    id: 'g1',
    title: '지역대회',
    date: '2026-09-03',
    category: 'conference',
    createdBy: 'admin',
    createdAt: '2026-08-01',
    isPublic: true,
    ...partial,
  }
}

// event-toast-and-multiday brief §2-2: 1박 2일 등 여러 날에 걸친 행사가 그 범위의
// 어느 날에도 "이 날에 걸쳐 있다"고 판정되어야 한다 — 달력·근접 판정이 이 함수를 쓴다.
describe('eventCoversDate', () => {
  it('하루짜리 행사는 그 날짜에만 걸쳐 있다', () => {
    const event = gs({ date: '2026-09-03' })
    expect(eventCoversDate(event, '2026-09-03')).toBe(true)
  })

  it('이틀짜리 행사는 첫날에 걸쳐 있다', () => {
    const event = gs({ date: '2026-09-03', endDate: '2026-09-04' })
    expect(eventCoversDate(event, '2026-09-03')).toBe(true)
  })

  it('이틀짜리 행사는 마지막날에 걸쳐 있다', () => {
    const event = gs({ date: '2026-09-03', endDate: '2026-09-04' })
    expect(eventCoversDate(event, '2026-09-04')).toBe(true)
  })

  it('여러 날짜에 걸친 행사는 중간 날짜에도 걸쳐 있다', () => {
    const event = gs({ date: '2026-09-03', endDate: '2026-09-05' })
    expect(eventCoversDate(event, '2026-09-04')).toBe(true)
  })

  it('범위 밖의 날짜에는 걸쳐 있지 않다', () => {
    const event = gs({ date: '2026-09-03', endDate: '2026-09-04' })
    expect(eventCoversDate(event, '2026-09-05')).toBe(false)
    expect(eventCoversDate(event, '2026-09-02')).toBe(false)
  })

  it('endDate가 date보다 이른 깨진 데이터는 date 하루짜리로 취급한다', () => {
    const event = gs({ date: '2026-09-03', endDate: '2026-09-01' })
    expect(eventCoversDate(event, '2026-09-03')).toBe(true)
    expect(eventCoversDate(event, '2026-09-01')).toBe(false)
  })
})

// event-toast-and-multiday brief §2-5: GeneralEventItem과 GeneralScheduleDetailSheet가
// 각자 범위 문자열을 만들지 않도록, 그 조립 규칙을 한 곳에 둔다. 실제 날짜 포맷은
// 소비처가 넘기는 formatDay 콜백이 정한다(리스트는 "M.D(dow)", 상세 시트는 i18n
// dateFormat을 쓰는 등 서로 다르므로).
describe('formatEventDateRange', () => {
  it('하루짜리 행사는 시작일 하나만 포맷한다', () => {
    const event = gs({ date: '2026-09-03' })
    expect(formatEventDateRange(event, (d) => d)).toBe('2026-09-03')
  })

  it('여러 날 행사는 시작일과 종료일을 en dash로 잇는다', () => {
    const event = gs({ date: '2026-09-03', endDate: '2026-09-04' })
    expect(formatEventDateRange(event, (d) => d)).toBe('2026-09-03 – 2026-09-04')
  })

  it('endDate가 date보다 이르거나 같으면(깨진 데이터·동일값) 시작일 하나만 포맷한다', () => {
    const broken = gs({ date: '2026-09-03', endDate: '2026-09-01' })
    expect(formatEventDateRange(broken, (d) => d)).toBe('2026-09-03')
    const same = gs({ date: '2026-09-03', endDate: '2026-09-03' })
    expect(formatEventDateRange(same, (d) => d)).toBe('2026-09-03')
  })
})
