import { describe, expect, it } from 'vitest'
import type { RequestUnit, WardVisitStat } from '../../../../functions/src/visitRequestLogic'
import { planMatrix } from './stakeSundayMatrix'

const unit = (id: string, regionId: string, wards: number): RequestUnit => ({
  id, ko: id.toUpperCase(), en: '', regionId,
  wards: Array.from({ length: wards }, (_, i) => ({ id: `${id}${i + 1}`, ko: `${id}${i + 1}`, en: '' })),
})

const sundays = ['2027-01-10', '2027-01-17', '2027-01-24']
const units = [unit('a', 'r1', 2), unit('b', 'r1', 1), unit('c', 'r1', 1)]

describe('planMatrix', () => {
  it('marks each Sunday a stake is asked by its role, and counts them', () => {
    const m = planMatrix({
      request: { sundays, units, unitSundays: { a: ['2027-01-10', '2027-01-24'], b: ['2027-01-10'], c: ['2027-01-17'] } },
      roles: { '2027-01-10': { primary: 'a', backup: 'b' } },
      status: {},
      wardStats: {},
    })
    const a = m.rows.find((r) => r.unit.id === 'a')!
    expect(sundays.map((d) => a.cells[d].kind)).toEqual(['primary', 'none', 'asked'])
    expect(a).toMatchObject({ primary: 1, backup: 0, total: 2 })
    expect(m.rows.find((r) => r.unit.id === 'b')!.cells['2027-01-10'].kind).toBe('backup')
  })

  it('shows a Sunday decided for the stake as decided, and one decided elsewhere as blocked', () => {
    const m = planMatrix({
      request: {
        sundays, units,
        unitSundays: { a: ['2027-01-10'], b: ['2027-01-10'], c: [] },
        decisions: { '2027-01-10': { unitId: 'a', wardName: 'a1' } },
      },
      roles: {},
      status: {},
      wardStats: {},
    })
    expect(m.rows[0].cells['2027-01-10']).toEqual({ kind: 'decided' })
    expect(m.rows[1].cells['2027-01-10']).toEqual({ kind: 'blocked', block: 'decidedOther' })
  })

  it('shows Sundays the stake cannot take as blocked', () => {
    const m = planMatrix({
      request: {
        sundays,
        units: [unit('a', 'r1', 1), unit('b', 'r2', 1)],
        sundayRegions: { '2027-01-10': 'r1', '2027-01-17': 'r2', '2027-01-24': 'r1' },
        unitSundays: { a: ['2027-01-10', '2027-01-24'], b: ['2027-01-17'] },
      },
      roles: {},
      status: { '2027-01-24': { busy: [], unitBlocks: { a: '스테이크 대회' } } as never },
      wardStats: {},
    })
    expect(m.rows[0].cells['2027-01-17']).toEqual({ kind: 'blocked', block: 'otherRegion' })
    expect(m.rows[0].cells['2027-01-24']).toEqual({ kind: 'blocked', block: 'unitBlocked' })
    expect(m.regionOf['2027-01-17']).toBe('r2')
  })

  it("gives each stake's latest visit and its nearest scheduled one", () => {
    const stat = (lastVisit: string | null, nextVisit: string | null = null): WardVisitStat => ({ lastVisit, nextVisit, count12m: 0 })
    const m = planMatrix({
      request: { sundays, units, unitSundays: { a: [], b: [], c: [] } },
      roles: {},
      status: {},
      wardStats: { a1: stat('2026-03-01', '2027-03-07'), a2: stat('2026-09-01', '2027-02-07'), b1: stat(null) },
    })
    expect(m.rows[0]).toMatchObject({ lastVisit: '2026-09-01', nextVisit: '2027-02-07' })
    expect(m.rows[1]).toMatchObject({ lastVisit: null, nextVisit: null })
  })

  it('lists Sundays in date order and keeps the stakes of one CC together', () => {
    const m = planMatrix({
      request: {
        sundays: ['2027-01-24', '2027-01-10'],
        units: [unit('a', 'r1', 1), unit('b', 'r2', 1), unit('c', 'r1', 1)],
        unitSundays: { a: [], b: [], c: [] },
      },
      roles: {},
      status: {},
      wardStats: {},
    })
    expect(m.sundays).toEqual(['2027-01-10', '2027-01-24'])
    expect(m.rows.map((r) => r.unit.id)).toEqual(['a', 'c', 'b'])
  })
})
