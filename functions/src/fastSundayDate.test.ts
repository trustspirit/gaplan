import { describe, it, expect } from 'vitest'
import { firstSundayOfNextMonthKst } from './fastSundayDate'

describe('firstSundayOfNextMonthKst', () => {
  // 스케줄은 매달 1일 01:00 KST에 돈다 — UTC로는 아직 전날(전달 말일) 16:00다.
  // 서버 시계(UTC)로 "다음 달"을 세면 막 시작한 이번 달이 나온다.
  it('counts "next month" from the KST date, not the UTC one', () => {
    const feb1At0100Kst = Date.parse('2026-01-31T16:00:00Z')
    expect(firstSundayOfNextMonthKst(feb1At0100Kst)).toBe('2026-03-01')
  })

  it('returns the 1st itself when next month starts on a Sunday', () => {
    const jan1At0100Kst = Date.parse('2025-12-31T16:00:00Z')
    expect(firstSundayOfNextMonthKst(jan1At0100Kst)).toBe('2026-02-01')
  })

  it('rolls over the year in December', () => {
    const dec1At0100Kst = Date.parse('2026-11-30T16:00:00Z')
    expect(firstSundayOfNextMonthKst(dec1At0100Kst)).toBe('2027-01-03')
  })
})
