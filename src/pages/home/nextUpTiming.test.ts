import { describe, it, expect } from 'vitest'
import { relativeWhen } from './nextUpTiming'

/** 2026-07-02는 목요일. */
const NOW = '2026-07-02T09:00'

describe('relativeWhen', () => {
  it('오늘이면 today, 남은 분까지 알려준다', () => {
    expect(relativeWhen('2026-07-02', '11:30', NOW)).toEqual({
      day: 'today',
      minutesUntil: 150,
      daysUntil: 0,
    })
  })

  it('내일이면 tomorrow', () => {
    expect(relativeWhen('2026-07-03', '09:00', NOW)).toMatchObject({ day: 'tomorrow', daysUntil: 1 })
  })

  it('모레 이후면 dday와 남은 일수', () => {
    expect(relativeWhen('2026-07-05', '09:00', NOW)).toMatchObject({ day: 'dday', daysUntil: 3 })
  })

  // 오후 2시 접견 도중에 홈을 열면 카드가 "1시간 뒤"가 아니라 "진행 중"이어야 한다.
  it('이미 시작한 시각이면 minutesUntil이 0 이하다', () => {
    const out = relativeWhen('2026-07-02', '08:30', NOW)
    expect(out.day).toBe('today')
    expect(out.minutesUntil).toBeLessThanOrEqual(0)
  })

  // 자정 직전에 열면 "23시간 뒤"가 아니라 "내일"이 맞다 — 사람은 시간이 아니라
  // 날짜 경계로 하루를 센다.
  it('남은 시간이 아니라 날짜 경계로 오늘/내일을 가른다', () => {
    expect(relativeWhen('2026-07-03', '00:30', '2026-07-02T23:50')).toMatchObject({
      day: 'tomorrow',
      daysUntil: 1,
    })
  })

  it('daysUntil은 시각이 아니라 날짜 차이다', () => {
    expect(relativeWhen('2026-07-03', '23:00', '2026-07-02T00:10').daysUntil).toBe(1)
  })
})
