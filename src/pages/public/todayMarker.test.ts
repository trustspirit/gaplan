import { describe, expect, it } from 'vitest'
import { getTodayMarkerPlacement } from './todayMarker'

describe('getTodayMarkerPlacement', () => {
  it('places marker before the first schedule on or after today', () => {
    expect(getTodayMarkerPlacement([
      { groupKey: '2026-06', dates: ['2026-06-01', '2026-06-20'] },
    ], '2026-06-15')).toEqual({ groupKey: '2026-06', itemIndex: 1 })
  })

  it('places marker before the first future month when today is between months', () => {
    expect(getTodayMarkerPlacement([
      { groupKey: '2026-05', dates: ['2026-05-10'] },
      { groupKey: '2026-07', dates: ['2026-07-01'] },
    ], '2026-06-15')).toEqual({ groupKey: '2026-07', itemIndex: 0 })
  })

  it('places marker after the final schedule when every schedule is past', () => {
    expect(getTodayMarkerPlacement([
      { groupKey: '2026-05', dates: ['2026-05-10'] },
      { groupKey: '2026-06', dates: ['2026-06-01', '2026-06-10'] },
    ], '2026-06-15')).toEqual({ groupKey: '2026-06', itemIndex: 2 })
  })
})
