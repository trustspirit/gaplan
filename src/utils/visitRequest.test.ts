import dayjs from 'dayjs'
import { describe, it, expect } from 'vitest'
import {
  upcomingSundays,
  unitsSnapshotForRegions,
  candidatesForSunday,
  rankCandidates,
  requestProgress,
  recommendUrl,
  wardRecency,
} from './visitRequest'
import type { VisitRecommendation } from '@/types'

describe('upcomingSundays', () => {
  it('평일 기준으로 다음 일요일부터 센다', () => {
    // 2026-11-18은 수요일
    expect(upcomingSundays(3, dayjs('2026-11-18'))).toEqual(['2026-11-22', '2026-11-29', '2026-12-06'])
  })

  it('오늘이 일요일이면 오늘은 빼고 다음 주 일요일부터', () => {
    expect(upcomingSundays(1, dayjs('2026-11-15'))).toEqual(['2026-11-22'])
  })
})

describe('unitsSnapshotForRegions', () => {
  it('담당 CC의 스테이크와 와드를 찍는다', () => {
    const units = unitsSnapshotForRegions(['seoul'])
    const seoul = units.find((u) => u.id === 'seoul-stake')!
    expect(seoul.ko).toBe('서울 스테이크')
    expect(seoul.wards.map((w) => w.ko)).toContain('녹번 와드')
    expect(units.every((u) => u.wards.length > 0)).toBe(true)
  })

  it('CC가 여럿이면 모두 합친다', () => {
    const ids = unitsSnapshotForRegions(['seoul', 'busan']).map((u) => u.id)
    expect(ids).toContain('seoul-stake')
    expect(ids).toContain('busan-stake')
  })
})

const recs: VisitRecommendation[] = [
  {
    unitId: 'a', submitterName: 'A 회장', submittedAt: '2026-11-02T00:00:00Z',
    picks: [{ date: '2027-01-10', wardId: 'a1', wardName: 'A1 와드' }],
  },
  {
    unitId: 'b', submitterName: 'B 회장', submittedAt: '2026-11-01T00:00:00Z', note: '감독 새로 부름',
    picks: [
      { date: '2027-01-10', wardId: 'b1', wardName: 'B1 와드' },
      { date: '2027-01-17', wardId: 'b2', wardName: 'B2 와드' },
    ],
  },
]

describe('candidatesForSunday / rankCandidates', () => {
  it('그 일요일에 들어온 추천만 모은다', () => {
    expect(candidatesForSunday(recs, '2027-01-10').map((c) => c.wardId)).toEqual(['a1', 'b1'])
    expect(candidatesForSunday(recs, '2027-01-17').map((c) => c.note)).toEqual(['감독 새로 부름'])
    expect(candidatesForSunday(recs, '2027-01-24')).toEqual([])
  })

  it('확정이 없으면 먼저 낸 추천이 위로', () => {
    const ranked = rankCandidates(candidatesForSunday(recs, '2027-01-10'), {})
    expect(ranked.map((c) => c.unitId)).toEqual(['b', 'a'])
  })

  it('이미 확정된 방문이 많은 스테이크는 아래로', () => {
    const ranked = rankCandidates(candidatesForSunday(recs, '2027-01-10'), {
      '2027-01-17': { unitId: 'b', wardId: 'b2', wardName: 'B2 와드' },
    })
    expect(ranked.map((c) => c.unitId)).toEqual(['a', 'b'])
  })
})

describe('requestProgress', () => {
  it('응답한 스테이크와 확정한 일요일을 센다 — 요청에 없는 스테이크의 추천은 세지 않는다', () => {
    expect(
      requestProgress(
        {
          units: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
          sundays: ['2027-01-10', '2027-01-17'],
          decisions: { '2027-01-10': {} },
        },
        [{ unitId: 'a' }, { unitId: 'zzz' }],
      ),
    ).toEqual({ respondedUnits: 1, totalUnits: 3, decidedSundays: 1, totalSundays: 2 })
  })
})

describe('recommendUrl', () => {
  it('공개 추천 경로를 만든다', () => {
    expect(recommendUrl('r1', 'abcd', 'https://x.app')).toBe('https://x.app/recommend/r1/abcd')
  })
})

describe('wardRecency', () => {
  const today = '2026-11-15'
  it('통계 화면과 같은 구간으로 나눈다', () => {
    expect(wardRecency({ lastVisit: '2026-10-04' }, today).tone).toBe('fresh')
    expect(wardRecency({ lastVisit: '2026-08-02' }, today).tone).toBe('aging')
    expect(wardRecency({ lastVisit: '2026-03-01' }, today)).toMatchObject({ tone: 'stale', monthsSince: 8 })
    expect(wardRecency({ lastVisit: null }, today).tone).toBe('never')
    expect(wardRecency(undefined, today).tone).toBe('never')
  })
})
