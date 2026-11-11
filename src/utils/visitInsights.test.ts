import { describe, it, expect } from 'vitest'
import type { Schedule } from '@/types'
import { ALL_UNITS, WARDS, getRegionIdByUnit } from '@/constants/regions'
import { computeVisitInsights as compute, coveragePercent, recentQuarters } from './visitInsights'

const TODAY = '2026-06-10'
const FILTERS = { regionId: 'all', period: '6m' } as const

// 같은 스테이크의 와드 둘, 그리고 다른 CC의 와드 하나.
const wardA = WARDS[0]
const wardB = WARDS.find((w) => w.unitId === wardA.unitId && w.id !== wardA.id)!
const regionA = getRegionIdByUnit(wardA.unitId)!
const wardOther = WARDS.find((w) => getRegionIdByUnit(w.unitId) !== regionA)!

function visit(ward: typeof wardA, date: string, over: Partial<Schedule> = {}): Schedule {
  return {
    id: Math.random().toString(36).slice(2),
    type: 'ward_visit',
    seventyUid: 's1',
    unitId: ward.unitId,
    presidentUid: null,
    wardId: ward.id,
    wardName: ward.name.ko,
    date,
    startTime: '10:00',
    endTime: '12:00',
    status: 'confirmed',
    createdBy: 'admin',
    ...over,
  }
}

function contact(unitId: string, date: string, over: Partial<Schedule> = {}): Schedule {
  return {
    id: Math.random().toString(36).slice(2),
    type: 'interview',
    seventyUid: 's1',
    unitId,
    presidentUid: 'p1',
    targetKind: 'stake_president',
    date,
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    createdBy: 'admin',
    ...over,
  }
}

const unitOf = (r: ReturnType<typeof compute>, unitId: string) => r.units.find((u) => u.id === unitId)!
const wardOf = (r: ReturnType<typeof compute>, ward: typeof wardA) =>
  unitOf(r, ward.unitId).wards.find((w) => w.id === ward.id)!

describe('computeVisitInsights — 방문은 지난 것만 센다', () => {
  it('오늘까지 지난 방문만 횟수에 넣고, 앞으로 잡힌 방문은 예정으로 따로 둔다', () => {
    const r = compute([visit(wardA, '2026-05-01'), visit(wardA, '2026-07-05')], FILTERS, null, TODAY)
    const w = wardOf(r, wardA)
    expect(w.visits).toBe(1)
    expect(w.lastVisitDate).toBe('2026-05-01')
    expect(w.nextVisitDate).toBe('2026-07-05')
    expect(r.summary.visits).toBe(1)
  })

  it('예정만 있는 와드는 방문한 와드로 치지 않는다', () => {
    const r = compute([visit(wardA, '2026-07-05')], FILTERS, null, TODAY)
    expect(wardOf(r, wardA).visits).toBe(0)
    expect(r.summary.wardsVisited).toBe(0)
  })

  it('취소된 방문은 세지 않는다', () => {
    const r = compute([visit(wardA, '2026-05-01', { status: 'cancelled' })], FILTERS, null, TODAY)
    expect(wardOf(r, wardA).visits).toBe(0)
    expect(wardOf(r, wardA).lastVisitDate).toBeNull()
  })

  it('기간 밖의 지난 방문은 횟수에는 빠지지만 마지막 방문일로는 남는다', () => {
    const r = compute([visit(wardA, '2025-09-01')], FILTERS, null, TODAY)
    const w = wardOf(r, wardA)
    expect(w.visits).toBe(0)
    expect(w.lastVisitDate).toBe('2025-09-01')
    expect(r.summary.wardsNeverVisited).toBe(WARDS.length - 1)
  })

  it('다음 예정은 여러 개 중 가장 가까운 것이다', () => {
    const r = compute([visit(wardA, '2026-09-01'), visit(wardA, '2026-07-05')], FILTERS, null, TODAY)
    expect(wardOf(r, wardA).nextVisitDate).toBe('2026-07-05')
  })
})

describe('computeVisitInsights — 와드 찾기', () => {
  it('wardId가 없는 옛 방문은 같은 스테이크 안에서 이름으로 찾는다', () => {
    const r = compute([visit(wardA, '2026-05-01', { wardId: undefined })], FILTERS, null, TODAY)
    expect(wardOf(r, wardA).visits).toBe(1)
  })

  it('다른 스테이크의 같은 이름 와드로는 세지 않는다', () => {
    const r = compute(
      [visit(wardA, '2026-05-01', { wardId: undefined, unitId: wardOther.unitId })],
      FILTERS,
      null,
      TODAY,
    )
    expect(wardOf(r, wardA).visits).toBe(0)
  })
})

describe('computeVisitInsights — 범위', () => {
  it('스테이크와 CC의 범위는 방문 횟수가 아니라 방문한 와드 수로 센다', () => {
    // 한 와드를 세 번 가도 방문한 와드는 하나다.
    const r = compute(
      [visit(wardA, '2026-03-01'), visit(wardA, '2026-04-01'), visit(wardA, '2026-05-01'), visit(wardB, '2026-05-08')],
      FILTERS,
      null,
      TODAY,
    )
    const unit = unitOf(r, wardA.unitId)
    expect(unit.visits).toBe(4)
    expect(unit.wardsVisited).toBe(2)
    expect(unit.wardsTotal).toBe(WARDS.filter((w) => w.unitId === wardA.unitId).length)

    const region = r.regions.find((x) => x.id === regionA)!
    expect(region.visits).toBe(4)
    expect(region.wardsVisited).toBe(2)
    expect(region.wardsTotal).toBe(WARDS.filter((w) => getRegionIdByUnit(w.unitId) === regionA).length)
  })

  it('요약의 와드 수는 범위 안의 모든 와드다', () => {
    const r = compute([], FILTERS, null, TODAY)
    expect(r.summary.wardsTotal).toBe(WARDS.length)
    expect(r.summary.wardsNeverVisited).toBe(WARDS.length)
  })

  it('지역을 고르면 그 CC의 스테이크와 와드만 남는다', () => {
    const r = compute([visit(wardOther, '2026-05-01')], { regionId: regionA, period: '6m' }, null, TODAY)
    expect(r.regions.map((x) => x.id)).toEqual([regionA])
    expect(r.units.every((u) => u.regionId === regionA)).toBe(true)
    expect(r.summary.visits).toBe(0)
  })

  it('coveragePercent는 와드가 없으면 0이다', () => {
    expect(coveragePercent(2, 8)).toBe(25)
    expect(coveragePercent(0, 0)).toBe(0)
  })
})

describe('computeVisitInsights — 방문 우선순위', () => {
  it('한 번도 안 간 와드가 먼저, 그다음은 가장 오래된 곳부터다', () => {
    const r = compute([visit(wardA, '2026-05-20'), visit(wardB, '2025-12-01')], FILTERS, null, TODAY)
    const names = r.priority.map((w) => w.id)
    // 안 간 와드들이 앞, 그 뒤로 wardB(더 오래됨), 마지막이 wardA.
    expect(names.indexOf(wardB.id)).toBeLessThan(names.indexOf(wardA.id))
    expect(names.slice(-2)).toEqual([wardB.id, wardA.id])
    expect(r.priority[0].daysSince).toBeNull()
  })

  it('경과 일수와 다음 예정을 함께 싣는다', () => {
    const r = compute([visit(wardA, '2026-05-31'), visit(wardA, '2026-08-02')], FILTERS, null, TODAY)
    const row = r.priority.find((w) => w.id === wardA.id)!
    expect(row.daysSince).toBe(10)
    expect(row.nextVisitDate).toBe('2026-08-02')
    expect(row.unitName).toBe(ALL_UNITS.find((u) => u.id === wardA.unitId)!.name.ko)
  })
})

describe('recentQuarters', () => {
  it('오늘이 속한 분기를 끝으로 최근 n개 분기를 오래된 것부터 돌려준다', () => {
    expect(recentQuarters('2026-06-10', 4)).toEqual([
      { key: '2025-Q3', start: '2025-07-01', end: '2025-09-30' },
      { key: '2025-Q4', start: '2025-10-01', end: '2025-12-31' },
      { key: '2026-Q1', start: '2026-01-01', end: '2026-03-31' },
      { key: '2026-Q2', start: '2026-04-01', end: '2026-06-30' },
    ])
  })

  it('해가 바뀌는 분기도 맞게 센다', () => {
    expect(recentQuarters('2026-02-01', 2).map((q) => q.key)).toEqual(['2025-Q4', '2026-Q1'])
  })
})

describe('computeVisitInsights — 접견 현황', () => {
  const unitId = wardA.unitId
  const rowOf = (r: ReturnType<typeof compute>) => r.interviews.find((x) => x.unitId === unitId)!

  it('분기마다 했음 / 예정 / 없음을 구분한다', () => {
    const r = compute(
      [contact(unitId, '2026-02-10'), contact(unitId, '2026-06-25')],
      FILTERS,
      null,
      TODAY,
    )
    expect(rowOf(r).quarters.map((q) => q.contact)).toEqual(['none', 'none', 'done', 'scheduled'])
    expect(rowOf(r).quarters.at(-1)!.isCurrent).toBe(true)
    expect(rowOf(r).lastContactDate).toBe('2026-02-10')
  })

  it('같은 분기에 지난 접견과 예정이 함께 있으면 했음이다', () => {
    const r = compute([contact(unitId, '2026-04-10'), contact(unitId, '2026-06-25')], FILTERS, null, TODAY)
    expect(rowOf(r).quarters.at(-1)!.contact).toBe('done')
  })

  it('와드 감독 접견이나 기타 대상 모임은 스테이크 회장 접견으로 치지 않는다', () => {
    const r = compute(
      [
        contact(unitId, '2026-05-01', { targetKind: 'ward_bishop', wardId: wardA.id }),
        contact(unitId, '2026-05-02', { type: 'meeting', targetKind: 'other' }),
      ],
      FILTERS,
      null,
      TODAY,
    )
    expect(rowOf(r).quarters.at(-1)!.contact).toBe('none')
  })

  it('이번 분기에 아직 안 한 스테이크가 위로 온다', () => {
    const r = compute([contact(unitId, '2026-05-01')], FILTERS, null, TODAY)
    expect(r.interviews.at(-1)!.unitId).toBe(unitId)
    expect(r.interviews[0].quarters.at(-1)!.contact).toBe('none')
    expect(r.summary.interviewUnitsDone).toBe(1)
    expect(r.summary.interviewUnitsTotal).toBe(r.interviews.length)
  })
})
