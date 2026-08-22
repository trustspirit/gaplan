import { describe, it, expect } from 'vitest'
import { nextEndTime } from './scheduleTimeRules'

// 표는 brief(end-time-autofill-brief.md §1)의 10개 케이스를 그대로 옮긴 것이다.
const CASES = [
  { nextStart: '19:00', previousStart: '', previousEnd: '', defaultMinutes: 60, expected: '20:00', reason: '모임 기본 1시간' },
  { nextStart: '09:00', previousStart: '', previousEnd: '', defaultMinutes: 120, expected: '11:00', reason: '방문·행사 기본 2시간' },
  { nextStart: '18:00', previousStart: '19:00', previousEnd: '21:00', defaultMinutes: 60, expected: '20:00', reason: '간격 보존 (2시간이 살아남음)' },
  { nextStart: '', previousStart: '19:00', previousEnd: '20:00', defaultMinutes: 60, expected: '20:00', reason: '시작을 비워도 종료는 그대로' },
  { nextStart: '14:00', previousStart: '19:00', previousEnd: '18:00', defaultMinutes: 60, expected: '15:00', reason: '깨진 간격(종료<시작)이면 기본값' },
  { nextStart: '14:00', previousStart: '19:00', previousEnd: '19:00', defaultMinutes: 60, expected: '15:00', reason: '종료==시작도 깨진 것으로 본다' },
  { nextStart: '23:30', previousStart: '', previousEnd: '', defaultMinutes: 120, expected: '23:59', reason: '자정 넘김 clamp' },
  { nextStart: '23:00', previousStart: '09:00', previousEnd: '12:00', defaultMinutes: 60, expected: '23:59', reason: '보존된 간격도 clamp 대상' },
  { nextStart: '22:59', previousStart: '', previousEnd: '', defaultMinutes: 60, expected: '23:59', reason: '경계값' },
  { nextStart: 'abc', previousStart: '19:00', previousEnd: '20:00', defaultMinutes: 60, expected: '20:00', reason: '형식이 깨지면 건드리지 않는다' },
] as const

describe('nextEndTime', () => {
  it.each(CASES)('$reason ($nextStart, $previousStart, $previousEnd, $defaultMinutes) -> $expected', (testCase) => {
    const { nextStart, previousStart, previousEnd, defaultMinutes, expected } = testCase
    expect(nextEndTime({ nextStart, previousStart, previousEnd, defaultMinutes })).toBe(expected)
  })
})
