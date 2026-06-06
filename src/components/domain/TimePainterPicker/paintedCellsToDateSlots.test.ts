import { describe, it, expect } from 'vitest'
import { paintedCellsToDateSlots } from './paintedCellsToDateSlots'

describe('paintedCellsToDateSlots', () => {
  it('빈 Set → 빈 배열', () => {
    expect(paintedCellsToDateSlots(new Set(), 30)).toEqual([])
  })

  it('단일 셀 → 슬롯 하나', () => {
    const result = paintedCellsToDateSlots(new Set(['2026-06-10_09:00']), 30)
    expect(result).toEqual([{
      date: '2026-06-10',
      timeRanges: [{ startTime: '09:00', endTime: '09:30' }],
    }])
  })

  it('연속 셀 두 개 → 하나의 range로 병합', () => {
    const cells = new Set(['2026-06-10_09:00', '2026-06-10_09:30'])
    const result = paintedCellsToDateSlots(cells, 30)
    expect(result).toEqual([{
      date: '2026-06-10',
      timeRanges: [{ startTime: '09:00', endTime: '10:00' }],
    }])
  })

  it('비연속 셀 → 분리된 range 두 개', () => {
    const cells = new Set(['2026-06-10_09:00', '2026-06-10_11:00'])
    const result = paintedCellsToDateSlots(cells, 30)
    expect(result[0].timeRanges).toHaveLength(2)
    expect(result[0].timeRanges[0]).toEqual({ startTime: '09:00', endTime: '09:30' })
    expect(result[0].timeRanges[1]).toEqual({ startTime: '11:00', endTime: '11:30' })
  })

  it('여러 날짜 → 날짜별로 그룹화', () => {
    const cells = new Set([
      '2026-06-10_09:00',
      '2026-06-11_14:00',
    ])
    const result = paintedCellsToDateSlots(cells, 30)
    expect(result).toHaveLength(2)
    const dates = result.map(r => r.date).sort()
    expect(dates).toEqual(['2026-06-10', '2026-06-11'])
  })

  it('00:00 셀 → 자정 00:30 endTime', () => {
    const result = paintedCellsToDateSlots(new Set(['2026-06-10_00:00']), 30)
    expect(result[0].timeRanges[0]).toEqual({ startTime: '00:00', endTime: '00:30' })
  })
})
