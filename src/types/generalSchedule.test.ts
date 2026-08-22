import { describe, it, expect } from 'vitest'
import type { GeneralSchedule } from './generalSchedule'
import { eventCoversDate } from './generalSchedule'

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
