import { describe, expect, it } from 'vitest'
import type { RequestUnit as VisitRequestUnit, WardVisitStat } from './visitRequestLogic'
import { sundayWardPicks } from './sundayWardPicks'

const units: VisitRequestUnit[] = [
  {
    id: 'a-stake', ko: 'A 스테이크', en: 'A', regionId: 'r1',
    wards: [
      { id: 'a1', ko: 'A1 와드', en: '' },
      { id: 'a2', ko: 'A2 와드', en: '' },
      { id: 'a3', ko: 'A3 와드', en: '' },
    ],
  },
  {
    id: 'b-stake', ko: 'B 스테이크', en: 'B', regionId: 'r1',
    wards: [{ id: 'b1', ko: 'B1 와드', en: '' }],
  },
  {
    id: 'c-stake', ko: 'C 스테이크', en: 'C', regionId: 'r2',
    wards: [{ id: 'c1', ko: 'C1 와드', en: '' }],
  },
]

const stat = (lastVisit: string | null, nextVisit: string | null = null, count12m = 0): WardVisitStat => ({
  lastVisit, nextVisit, count12m,
})

const stats: Record<string, WardVisitStat> = {
  a1: stat('2026-10-01'),
  a2: stat(null),
  a3: stat('2026-03-01'),
  b1: stat('2026-06-01'),
  c1: stat(null),
}

describe('sundayWardPicks', () => {
  it('leads with the stake visited longest ago, then its never-visited ward first', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10'], regionOf: () => 'r1', units, wardStats: stats, unitBlocks: {}, perSunday: 1,
    })
    // A의 마지막 방문은 10월, B는 6월 — B가 먼저
    expect(picks['2027-01-10'].map((p) => p.wardId)).toEqual(['b1'])
  })

  it('spreads the picks of one Sunday across stakes, in stake order', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10'], regionOf: () => 'r1', units, wardStats: stats, unitBlocks: {}, perSunday: 3,
    })
    // B의 1순위 → A의 기록 없는 와드 → A의 가장 오래된 와드
    expect(picks['2027-01-10'].map((p) => p.wardId)).toEqual(['b1', 'a2', 'a3'])
  })

  it('puts a never-visited stake ahead of any visited one', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10'],
      regionOf: () => 'r1',
      units: [...units, { id: 'd-stake', ko: 'D 스테이크', en: 'D', regionId: 'r1', wards: [{ id: 'd1', ko: 'D1 와드', en: '' }] }],
      wardStats: stats,
      unitBlocks: {},
      perSunday: 1,
    })
    expect(picks['2027-01-10'][0].wardId).toBe('d1')
  })

  it('ranks by the last visit, not by how many visits a stake had', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10'],
      regionOf: () => 'r1',
      units,
      // A는 12개월에 방문이 많아도 마지막 방문이 B보다 오래됐다
      wardStats: { ...stats, a1: stat('2026-05-01', null, 6), a3: stat('2026-04-01', null, 4), b1: stat('2026-10-15', null, 1) },
      unitBlocks: {},
      perSunday: 1,
    })
    expect(picks['2027-01-10'][0].wardId).toBe('a2')
  })

  it('treats an already scheduled visit as the stake’s latest visit', () => {
    const recentB = { ...stats, b1: stat('2026-11-01') }
    const run = (wardStats: Record<string, WardVisitStat>) =>
      sundayWardPicks({ sundays: ['2027-01-10'], regionOf: () => 'r1', units, wardStats, unitBlocks: {}, perSunday: 1 })
    expect(run(recentB)['2027-01-10'][0].wardId).toBe('a2')
    expect(run({ ...recentB, a3: stat('2026-03-01', '2027-02-07') })['2027-01-10'][0].wardId).toBe('b1')
  })

  it('moves a stake to the back once it leads a Sunday of the plan', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10', '2027-01-17', '2027-01-24'],
      regionOf: () => 'r1', units, wardStats: stats, unitBlocks: {}, perSunday: 1,
    })
    // B → A → 다시 B(B는 와드가 하나라 같은 와드)
    expect(['2027-01-10', '2027-01-17', '2027-01-24'].map((d) => picks[d][0].wardId)).toEqual(['b1', 'a2', 'b1'])
  })

  it('does not repeat a ward of the stake until its other wards were shown', () => {
    const onlyA = sundayWardPicks({
      sundays: ['2027-01-10', '2027-01-17', '2027-01-24'],
      regionOf: () => 'r1', units: [units[0]], wardStats: stats, unitBlocks: {}, perSunday: 1,
    })
    expect(['2027-01-10', '2027-01-17', '2027-01-24'].map((d) => onlyA[d][0].wardId)).toEqual(['a2', 'a3', 'a1'])
  })

  it('skips stakes blocked that Sunday and wards already scheduled', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10'],
      regionOf: () => 'r1',
      units,
      wardStats: { ...stats, b1: stat('2026-06-01', '2027-02-07') },
      unitBlocks: { '2027-01-10': { 'a-stake': '스테이크 대회' } },
      perSunday: 3,
    })
    expect(picks['2027-01-10']).toEqual([])
  })

  it('pushes back a stake with a stake conference on another Sunday of that month', () => {
    // 평소에는 A(마지막 방문 2026-10)가 B(2026-11)보다 먼저
    const recentB = { ...stats, b1: stat('2026-11-01') }
    const picks = sundayWardPicks({
      sundays: ['2027-01-10', '2027-02-14'],
      regionOf: () => 'r1',
      units,
      wardStats: recentB,
      // 고르지 않은 1월 24일에 A 스테이크 대회
      unitBlocks: { '2027-01-24': { 'a-stake': '스테이크 대회' } },
      perSunday: 2,
    })
    // 1월: A는 B 뒤로 — 예비로만
    expect(picks['2027-01-10'].map((p) => p.unitId)).toEqual(['b-stake', 'a-stake'])
    // 2월: 대회가 없는 달이라 다시 마지막 방문 순서
    const feb = sundayWardPicks({
      sundays: ['2027-02-14'], regionOf: () => 'r1', units, wardStats: recentB,
      unitBlocks: { '2027-01-24': { 'a-stake': '스테이크 대회' } }, perSunday: 1,
    })
    expect(feb['2027-02-14'][0].unitId).toBe('a-stake')
  })

  it('still suggests a stake with a conference that month when no other stake is open', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10'],
      regionOf: () => 'r2',
      units,
      wardStats: stats,
      unitBlocks: { '2027-01-31': { 'c-stake': '스테이크 대회' } },
      perSunday: 1,
    })
    expect(picks['2027-01-10'][0].wardId).toBe('c1')
  })

  it('uses each Sunday’s own CC', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10', '2027-01-17'],
      regionOf: (d) => (d === '2027-01-10' ? 'r2' : 'r1'),
      units, wardStats: stats, unitBlocks: {}, perSunday: 1,
    })
    expect(picks['2027-01-10'][0]).toMatchObject({ wardId: 'c1', unitName: 'C 스테이크', lastVisit: null })
    expect(picks['2027-01-17'][0].wardId).toBe('b1')
  })

  it('starts over once every ward in the CC has been suggested', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10', '2027-01-17'], regionOf: () => 'r2', units, wardStats: stats, unitBlocks: {}, perSunday: 1,
    })
    expect(picks['2027-01-17'][0].wardId).toBe('c1')
  })
})

describe('sundayWardPicks rotation', () => {
  const three: VisitRequestUnit[] = ['a', 'b', 'c'].map((s) => ({
    id: s, ko: s.toUpperCase(), en: '', regionId: 'r1',
    wards: [1, 2].map((n) => ({ id: `${s}${n}`, ko: `${s.toUpperCase()}${n}`, en: '' })),
  }))
  const picks = sundayWardPicks({
    sundays: ['2027-01-10', '2027-01-17', '2027-01-24'], regionOf: () => 'r1', units: three,
    wardStats: {}, unitBlocks: {}, perSunday: 3,
  })
  const order = (d: string) => picks[d].map((p) => p.unitId)

  it('moves the backup stake back too, so the next Sunday leads with someone else', () => {
    expect(order('2027-01-10')).toEqual(['a', 'b', 'c'])
    expect(order('2027-01-17')[0]).toBe('c')
  })
  it('keeps the order of stakes asked the same Sunday, so primary and backup take turns', () => {
    // 1주 (a, b) → 2주 (c, a) → 3주 (b, c)
    expect(order('2027-01-17').slice(0, 2)).toEqual(['c', 'a'])
    expect(order('2027-01-24').slice(0, 2)).toEqual(['b', 'c'])
  })
})
