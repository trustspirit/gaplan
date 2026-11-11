import { describe, it, expect } from 'vitest'
import { scheduleTimeLabel } from './scheduleDates'

// 목록·달력·홈·공개 페이지가 같은 모양으로 시간을 적는다.
describe('scheduleTimeLabel', () => {
  const base = { date: '2026-12-03', startTime: '10:00', endTime: '11:00' }

  it('하루짜리는 시작 – 종료', () => {
    expect(scheduleTimeLabel(base, '종일')).toBe('10:00 – 11:00')
  })

  it('여러 날은 종료 시각 앞에 마지막 날을 붙인다', () => {
    expect(
      scheduleTimeLabel({ ...base, endDate: '2026-12-05', startTime: '18:00', endTime: '12:00' }, '종일'),
    ).toBe('18:00 – 12.5 12:00')
  })

  it('종일 일정은 00:00/23:59 대신 "종일"이다', () => {
    expect(scheduleTimeLabel({ ...base, startTime: '00:00', endTime: '23:59', allDay: true }, '종일')).toBe('종일')
  })

  it('여러 날 종일 일정은 마지막 날을 붙인다', () => {
    expect(
      scheduleTimeLabel(
        { ...base, endDate: '2026-12-05', startTime: '00:00', endTime: '23:59', allDay: true },
        '종일',
      ),
    ).toBe('종일 – 12.5')
  })
})
