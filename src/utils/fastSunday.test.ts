import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import { isFastSunday, getFirstSundayOfMonth } from './fastSunday'

describe('getFirstSundayOfMonth', () => {
  it('returns first Sunday when month starts on Monday', () => {
    // 2024-01 starts on Monday → first Sunday is Jan 7
    expect(getFirstSundayOfMonth(2024, 0).format('YYYY-MM-DD')).toBe('2024-01-07')
  })

  it('returns first day when month starts on Sunday', () => {
    // 2024-09 starts on Sunday → first Sunday is Sep 1
    expect(getFirstSundayOfMonth(2024, 8).format('YYYY-MM-DD')).toBe('2024-09-01')
  })

  it('returns correct first Sunday when month starts on Saturday', () => {
    // 2024-06 starts on Saturday → first Sunday is Jun 2
    expect(getFirstSundayOfMonth(2024, 5).format('YYYY-MM-DD')).toBe('2024-06-02')
  })
})

describe('isFastSunday', () => {
  it('identifies first Sunday of month as fast Sunday', () => {
    expect(isFastSunday(dayjs('2024-06-02'))).toBe(true)
    expect(isFastSunday(dayjs('2024-01-07'))).toBe(true)
    expect(isFastSunday(dayjs('2024-09-01'))).toBe(true)
  })

  it('rejects second Sunday of month', () => {
    expect(isFastSunday(dayjs('2024-06-09'))).toBe(false)
    expect(isFastSunday(dayjs('2024-01-14'))).toBe(false)
  })

  it('rejects non-Sunday days', () => {
    expect(isFastSunday(dayjs('2024-06-03'))).toBe(false) // Monday
    expect(isFastSunday(dayjs('2024-06-01'))).toBe(false) // Saturday
  })
})
