import { describe, it, expect } from 'vitest'
import { EMPTY_DATE_RANGE, isInDateRange, nextDateRange } from './dateRange'

describe('nextDateRange', () => {
  it('아무것도 고르지 않은 상태에서 누르면 그날 하루짜리가 된다', () => {
    expect(nextDateRange(EMPTY_DATE_RANGE, '2026-12-03')).toEqual({ start: '2026-12-03', end: '' })
  })

  it('시작일만 있는 상태에서 그보다 뒤 날짜를 누르면 그날이 종료일이 된다', () => {
    expect(nextDateRange({ start: '2026-12-03', end: '' }, '2026-12-05')).toEqual({
      start: '2026-12-03',
      end: '2026-12-05',
    })
  })
})

describe('nextDateRange — 다시 누르기', () => {
  it('시작일만 있는데 그보다 앞 날짜를 누르면 그날부터 새로 시작한다', () => {
    expect(nextDateRange({ start: '2026-12-03', end: '' }, '2026-12-01')).toEqual({ start: '2026-12-01', end: '' })
  })

  it('시작일만 있는데 같은 날을 다시 누르면 그대로 하루짜리다', () => {
    expect(nextDateRange({ start: '2026-12-03', end: '' }, '2026-12-03')).toEqual({ start: '2026-12-03', end: '' })
  })

  it('범위가 이미 있으면 어디를 눌러도 그날부터 새로 시작한다', () => {
    const range = { start: '2026-12-03', end: '2026-12-05' }
    expect(nextDateRange(range, '2026-12-04')).toEqual({ start: '2026-12-04', end: '' })
    expect(nextDateRange(range, '2026-12-10')).toEqual({ start: '2026-12-10', end: '' })
  })
})

describe('isInDateRange', () => {
  it('선택이 없으면 어느 날도 범위 안이 아니다', () => {
    expect(isInDateRange(EMPTY_DATE_RANGE, '2026-12-03')).toBe(false)
  })

  it('하루짜리는 시작일 하루만 범위 안이다', () => {
    const range = { start: '2026-12-03', end: '' }
    expect(isInDateRange(range, '2026-12-03')).toBe(true)
    expect(isInDateRange(range, '2026-12-04')).toBe(false)
  })

  it('범위는 양 끝을 포함하고 달을 넘어가도 된다', () => {
    const range = { start: '2026-11-29', end: '2026-12-02' }
    expect(isInDateRange(range, '2026-11-29')).toBe(true)
    expect(isInDateRange(range, '2026-12-01')).toBe(true)
    expect(isInDateRange(range, '2026-12-02')).toBe(true)
    expect(isInDateRange(range, '2026-11-28')).toBe(false)
    expect(isInDateRange(range, '2026-12-03')).toBe(false)
  })
})
