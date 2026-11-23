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

const stat = (lastVisit: string | null, nextVisit: string | null = null): WardVisitStat => ({
  lastVisit, nextVisit, count12m: 0,
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
      sundays: ['2027-01-10'], regionOf: () => 'r1', units, wardStats: stats, unitBlocks: {}, perSunday: 3,
    })
    expect(picks['2027-01-10'].map((p) => p.wardId)).toEqual(['a2', 'a3', 'b1'])
  })

  it('does not repeat a ward across Sundays of the same CC', () => {
    const picks = sundayWardPicks({
      sundays: ['2027-01-10', '2027-01-17'], regionOf: () => 'r1', units, wardStats: stats, unitBlocks: {}, perSunday: 2,
    })
    expect(picks['2027-01-10'].map((p) => p.wardId)).toEqual(['a2', 'a3'])
    expect(picks['2027-01-17'].map((p) => p.wardId)).toEqual(['b1', 'a1'])
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
