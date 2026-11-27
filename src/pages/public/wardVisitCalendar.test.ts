import { describe, it, expect } from 'vitest'
import { buildWardVisitYear, stakeShortName } from './wardVisitCalendar'
import type { PublicWardVisitItem } from '@/types/publicSchedule'

const v = (id: string, date: string): PublicWardVisitItem => ({
  id,
  date,
  wardName: `${id} 와드`,
  unitId: 'seoul-east-stake',
})

describe('buildWardVisitYear', () => {
  it('언제나 12달, 달마다 5칸을 만든다', () => {
    const year = buildWardVisitYear([], 2026, '2026-11-27')
    expect(year).toHaveLength(12)
    expect(year.every((m) => m.slots.length === 5)).toBe(true)
    expect(year[0].key).toBe('2026-01')
  })

  it('칸마다 그 달의 몇째 일요일인지 날짜를 담고, 없으면 null이다', () => {
    const year = buildWardVisitYear([], 2026, '2026-11-27')
    const nov = year[10]
    expect(nov.sundayCount).toBe(5)
    expect(nov.slots.map((s) => s.sundayDate)).toEqual([
      '2026-11-01',
      '2026-11-08',
      '2026-11-15',
      '2026-11-22',
      '2026-11-29',
    ])
    const feb = year[1]
    expect(feb.sundayCount).toBe(4)
    expect(feb.slots[4].sundayDate).toBeNull()
  })

  it('일요일 방문은 그 일요일 칸에, 평일 방문은 ceil(일/7)번째 칸에 요일과 함께 쌓인다', () => {
    const year = buildWardVisitYear([v('수요일', '2026-11-11'), v('일요일', '2026-11-08')], 2026, '2026-11-27')
    const slot2 = year[10].slots[1]
    expect(slot2.index).toBe(2)
    expect(slot2.visits.map((x) => x.id)).toEqual(['일요일', '수요일'])
    expect(slot2.visits.map((x) => x.weekday)).toEqual([0, 3])
    expect(year[10].visitCount).toBe(2)
  })

  it('다섯째 일요일 뒤의 평일 방문도 다섯째 칸에 남는다', () => {
    const year = buildWardVisitYear([v('월요일', '2026-11-30')], 2026, '2026-11-27')
    expect(year[10].slots[4].visits.map((x) => x.id)).toEqual(['월요일'])
  })

  it('오늘 이후만 예정이고, 이번 달만 isCurrent이며, 다른 해 방문은 버린다', () => {
    const year = buildWardVisitYear(
      [v('오늘', '2026-11-27'), v('내일', '2026-11-28'), v('작년', '2025-11-27')],
      2026,
      '2026-11-27',
    )
    const visits = year[10].slots.flatMap((s) => s.visits)
    expect(visits.map((x) => [x.id, x.planned])).toEqual([
      ['오늘', false],
      ['내일', true],
    ])
    expect(year.filter((m) => m.isCurrent).map((m) => m.month)).toEqual([11])
    expect(year.reduce((n, m) => n + m.visitCount, 0)).toBe(2)
  })

  it('다른 해를 보면 이번 달 표시가 없다', () => {
    expect(buildWardVisitYear([], 2025, '2026-11-27').some((m) => m.isCurrent)).toBe(false)
  })
})

describe('stakeShortName', () => {
  it('스테이크·지방부 꼬리를 뗀 짧은 이름을 돌려준다', () => {
    expect(stakeShortName('seoul-east-stake', 'ko')).toBe('서울동')
    expect(stakeShortName('gangneung-district', 'ko')).toBe('강릉')
    expect(stakeShortName('seoul-east-stake', 'en')).toBe('Seoul East')
    expect(stakeShortName('unknown-unit', 'ko')).toBe('unknown-unit')
  })
})
