import { describe, it, expect } from 'vitest'
import { layoutDayBlocks } from './CalendarView'
import type { Schedule } from '@/types'

const s = (id: string, startTime: string, endTime: string): Schedule =>
  ({ id, startTime, endTime } as Schedule)

const byId = (placed: ReturnType<typeof layoutDayBlocks>) =>
  Object.fromEntries(placed.map(p => [p.s.id, { col: p.col, cols: p.cols }]))

describe('layoutDayBlocks', () => {
  it('겹치지 않는 일정은 각각 전체 폭(1열)을 쓴다', () => {
    const placed = byId(layoutDayBlocks([s('a', '09:00', '10:00'), s('b', '10:00', '11:00')]))
    expect(placed.a).toEqual({ col: 0, cols: 1 })
    expect(placed.b).toEqual({ col: 0, cols: 1 })
  })

  it('동시간대 일정 2개는 2열로 분할된다', () => {
    const placed = byId(layoutDayBlocks([s('a', '09:00', '10:00'), s('b', '09:00', '10:00')]))
    expect(placed.a.cols).toBe(2)
    expect(placed.b.cols).toBe(2)
    expect(new Set([placed.a.col, placed.b.col])).toEqual(new Set([0, 1]))
  })

  it('부분 겹침도 같은 클러스터로 묶여 열이 나뉜다', () => {
    const placed = byId(
      layoutDayBlocks([s('a', '09:00', '10:30'), s('b', '10:00', '11:00'), s('c', '12:00', '13:00')])
    )
    expect(placed.a.cols).toBe(2)
    expect(placed.b.cols).toBe(2)
    expect(placed.a.col).not.toBe(placed.b.col)
    // c는 겹침이 없으므로 독립 클러스터
    expect(placed.c).toEqual({ col: 0, cols: 1 })
  })

  it('끝난 열은 재사용된다 (3개가 2열에 배치)', () => {
    const placed = byId(
      layoutDayBlocks([s('a', '09:00', '11:00'), s('b', '09:00', '10:00'), s('c', '10:00', '11:00')])
    )
    expect(placed.a.cols).toBe(2)
    expect(placed.c.col).toBe(placed.b.col)
  })
})
