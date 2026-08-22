import { describe, it, expect } from 'vitest'
import {
  GENERAL_SCHEDULE_DEFAULT_DURATION_MINUTES,
  resolveGeneralScheduleEndTime,
} from './generalScheduleDefaults'

describe('resolveGeneralScheduleEndTime', () => {
  it('keeps an end time that is already set', () => {
    expect(resolveGeneralScheduleEndTime('09:00', '10:30')).toBe('10:30')
  })

  // 폼이 행사에 자동으로 채우는 길이와 같아야 한다 — 캘린더가 앱과 다른 길이를 보이면 안 된다.
  it('defaults to two hours when the end time is missing', () => {
    expect(GENERAL_SCHEDULE_DEFAULT_DURATION_MINUTES).toBe(120)
    expect(resolveGeneralScheduleEndTime('09:00')).toBe('11:00')
  })

  it('clamps to 23:59 rather than spilling past midnight', () => {
    expect(resolveGeneralScheduleEndTime('23:00')).toBe('23:59')
  })

  // 저장된 데이터가 깨져 있어도 시작보다 이른 종료를 그대로 내보내지 않는다.
  it('replaces an end time that is not after the start', () => {
    expect(resolveGeneralScheduleEndTime('14:00', '13:00')).toBe('16:00')
    expect(resolveGeneralScheduleEndTime('14:00', '14:00')).toBe('16:00')
  })
})
