import { describe, it, expect } from 'vitest'
import {
  addOneDay, allDayExclusiveEndDate, isAllDaySchedule, isMultiDaySchedule,
  scheduleCoversDate, scheduleLastDate, scheduleTimesOnDate,
} from './scheduleDates'

const oneDay = { date: '2026-12-03', startTime: '10:00', endTime: '12:00' }
const threeDays = { date: '2026-12-03', endDate: '2026-12-05', startTime: '18:00', endTime: '12:00' }

describe('isMultiDaySchedule / scheduleLastDate', () => {
  it('endDate가 없거나 null이면 하루짜리다', () => {
    expect(isMultiDaySchedule(oneDay)).toBe(false)
    expect(isMultiDaySchedule({ ...oneDay, endDate: null })).toBe(false)
    expect(scheduleLastDate(oneDay)).toBe('2026-12-03')
  })

  it('endDate가 date와 같거나 이르면(깨진 데이터) 하루짜리로 읽는다', () => {
    expect(isMultiDaySchedule({ ...oneDay, endDate: '2026-12-03' })).toBe(false)
    expect(scheduleLastDate({ ...oneDay, endDate: '2026-12-01' })).toBe('2026-12-03')
  })

  it('endDate가 date보다 뒤면 여러 날이고 마지막 날은 endDate다', () => {
    expect(isMultiDaySchedule(threeDays)).toBe(true)
    expect(scheduleLastDate(threeDays)).toBe('2026-12-05')
  })
})

describe('scheduleCoversDate', () => {
  it('하루짜리는 그날만 걸친다', () => {
    expect(scheduleCoversDate(oneDay, '2026-12-03')).toBe(true)
    expect(scheduleCoversDate(oneDay, '2026-12-04')).toBe(false)
  })

  it('여러 날 일정은 첫날부터 마지막 날까지 걸친다', () => {
    expect(scheduleCoversDate(threeDays, '2026-12-02')).toBe(false)
    expect(scheduleCoversDate(threeDays, '2026-12-03')).toBe(true)
    expect(scheduleCoversDate(threeDays, '2026-12-04')).toBe(true)
    expect(scheduleCoversDate(threeDays, '2026-12-05')).toBe(true)
    expect(scheduleCoversDate(threeDays, '2026-12-06')).toBe(false)
  })
})

describe('scheduleTimesOnDate', () => {
  it('하루짜리는 원래 시간 그대로다', () => {
    expect(scheduleTimesOnDate(oneDay, '2026-12-03')).toEqual({ startTime: '10:00', endTime: '12:00' })
  })

  it('첫날은 시작 시각부터 자정까지', () => {
    expect(scheduleTimesOnDate(threeDays, '2026-12-03')).toEqual({ startTime: '18:00', endTime: '24:00' })
  })

  it('가운데 날은 하루 종일', () => {
    expect(scheduleTimesOnDate(threeDays, '2026-12-04')).toEqual({ startTime: '00:00', endTime: '24:00' })
  })

  it('마지막 날은 자정부터 종료 시각까지', () => {
    expect(scheduleTimesOnDate(threeDays, '2026-12-05')).toEqual({ startTime: '00:00', endTime: '12:00' })
  })
})

// 시간을 정하지 않은 일정은 allDay: true다. startTime/endTime은 00:00/23:59로 채워져 있지만
// 화면과 캘린더는 allDay를 보고 시각 없이 다룬다.
describe('종일 일정', () => {
  it('allDay가 정확히 true일 때만 종일이다', () => {
    expect(isAllDaySchedule({ allDay: true })).toBe(true)
    expect(isAllDaySchedule({ allDay: false })).toBe(false)
    expect(isAllDaySchedule({})).toBe(false)
    expect(isAllDaySchedule(undefined)).toBe(false)
  })

  it('addOneDay는 달과 해를 넘긴다', () => {
    expect(addOneDay('2026-12-03')).toBe('2026-12-04')
    expect(addOneDay('2026-11-30')).toBe('2026-12-01')
    expect(addOneDay('2026-12-31')).toBe('2027-01-01')
    expect(addOneDay('2028-02-28')).toBe('2028-02-29')
  })

  it('캘린더에서 끝나는 날은 마지막 날 다음 날이다 — 하루짜리도, 여러 날도', () => {
    expect(allDayExclusiveEndDate({ date: '2026-12-03' })).toBe('2026-12-04')
    expect(allDayExclusiveEndDate({ date: '2026-12-03', endDate: '2026-12-05' })).toBe('2026-12-06')
  })

  it('종일 일정은 걸쳐 있는 모든 날에 하루 종일을 차지한다', () => {
    const allDay = { date: '2026-12-03', endDate: '2026-12-04', startTime: '00:00', endTime: '23:59', allDay: true }
    expect(scheduleTimesOnDate(allDay, '2026-12-03')).toEqual({ startTime: '00:00', endTime: '24:00' })
    expect(scheduleTimesOnDate(allDay, '2026-12-04')).toEqual({ startTime: '00:00', endTime: '24:00' })
  })
})
