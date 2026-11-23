import { describe, expect, it } from 'vitest'
import type { VisitRequestUnit, WardVisitStat } from '@/types'
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
  it('ranks never-visited first, then oldest visit, within the Sunday CC only', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10'], regionOf: () => 'r1', units, wardStats: stats, unitBlocks: {}, perSunday: 1,
    })
    expect(picks['2027-01-10'].map((p) => p.wardId)).toEqual(['a2'])
  })

  it('spreads the picks of one Sunday across stakes', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10'], regionOf: () => 'r1', units, wardStats: stats, unitBlocks: {}, perSunday: 3,
    })
    // A의 1순위 → B의 1순위 → 다시 A
    expect(picks['2027-01-10'].map((p) => p.wardId)).toEqual(['a2', 'b1', 'a3'])
  })

  it('prefers the stake with fewer visits even over an older ward elsewhere', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10'],
      regionOf: () => 'r1',
      units,
      wardStats: { ...stats, a1: stat('2026-10-01', null, 3), b1: stat('2026-10-15') },
      unitBlocks: {},
      perSunday: 1,
    })
    // A 스테이크는 12개월에 3번, B는 0번 — 기록 없는 a2보다 B가 먼저
    expect(picks['2027-01-10'][0].wardId).toBe('b1')
  })

  it('counts already scheduled visits toward the stake', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10'],
      regionOf: () => 'r1',
      units,
      wardStats: { ...stats, a1: stat('2026-10-01', '2027-02-07') },
      unitBlocks: {},
      perSunday: 1,
    })
    expect(picks['2027-01-10'][0].wardId).toBe('b1')
  })

  it('alternates stakes across Sundays and does not repeat a ward', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10', '2027-01-17', '2027-01-24'],
      regionOf: () => 'r1', units, wardStats: stats, unitBlocks: {}, perSunday: 1,
    })
    expect(['2027-01-10', '2027-01-17', '2027-01-24'].map((d) => picks[d][0].wardId)).toEqual(['a2', 'b1', 'a3'])
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

  it('uses each Sunday’s own CC', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10', '2027-01-17'],
      regionOf: (d) => (d === '2027-01-10' ? 'r2' : 'r1'),
      units, wardStats: stats, unitBlocks: {}, perSunday: 1,
    })
    expect(picks['2027-01-10'][0]).toMatchObject({ wardId: 'c1', unitName: 'C 스테이크', lastVisit: null })
    expect(picks['2027-01-17'][0].wardId).toBe('a2')
  })

  it('starts over once every ward in the CC has been suggested', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10', '2027-01-17'], regionOf: () => 'r2', units, wardStats: stats, unitBlocks: {}, perSunday: 1,
    })
    expect(picks['2027-01-17'][0].wardId).toBe('c1')
  })
})
