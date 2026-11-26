import { daysUntil } from './date'

describe('daysUntil', () => {
  it('counts calendar days, whatever the time of day', () => {
    expect(daysUntil('2026-11-27', '2026-11-26T10:00:00')).toBe(1)
    expect(daysUntil('2026-11-27', '2026-11-26T23:59:00')).toBe(1)
    expect(daysUntil('2026-11-28', '2026-11-26T00:01:00')).toBe(2)
  })

  it('is zero on the day itself and negative once past', () => {
    expect(daysUntil('2026-11-26', '2026-11-26T18:00:00')).toBe(0)
    expect(daysUntil('2026-11-25', '2026-11-26T00:30:00')).toBe(-1)
  })
})
