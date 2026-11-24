import { describe, expect, it } from 'vitest'
import type { RequestUnit, WardVisitStat } from './visitRequestLogic'
import { recommendUnitSundays } from './visitPlanBalance'

const unit = (id: string, regionId: string, wards: number): RequestUnit => ({
  id, ko: id.toUpperCase(), en: '', regionId,
  wards: Array.from({ length: wards }, (_, i) => ({ id: `${id}${i + 1}`, ko: `${id.toUpperCase()}${i + 1}`, en: '' })),
})

const D1 = '2027-01-10'
const D2 = '2027-01-17'
const D3 = '2027-01-24'

describe('recommendUnitSundays', () => {
  const units = [unit('a', 'r1', 2), unit('b', 'r1', 1)]

  it('asks a primary and a different backup stake each Sunday', () => {
    const plan = recommendUnitSundays({
      sundays: [D1, D2], request: { units }, wardStats: {}, unitBlocks: {},
    })
    for (const d of [D1, D2]) {
      const r = plan.roles[d]
      expect(r.primary).toBeDefined()
      expect(r.backup).toBeDefined()
      expect(r.primary).not.toBe(r.backup)
      expect(plan.unitSundays[r.primary!]).toContain(d)
      expect(plan.unitSundays[r.backup!]).toContain(d)
    }
  })

  it('has no backup when only one stake of the CC is open that Sunday', () => {
    const plan = recommendUnitSundays({
      sundays: [D1], request: { units }, wardStats: {}, unitBlocks: { [D1]: { b: '스테이크 대회' } },
    })
    expect(plan.roles[D1]).toEqual({ primary: 'a' })
    expect(plan.unitSundays).toEqual({ a: [D1], b: [] })
  })

  it('keeps a decided Sunday on the decided stake only and leaves it out of the picks', () => {
    const plan = recommendUnitSundays({
      sundays: [D1, D2],
      request: { units, decisions: { [D1]: { unitId: 'b' } } },
      wardStats: {}, unitBlocks: {},
    })
    expect(plan.roles[D1]).toBeUndefined()
    expect(plan.picks[D1]).toBeUndefined()
    expect(plan.unitSundays.b).toContain(D1)
    expect(plan.unitSundays.a).not.toContain(D1)
  })

  it('treats a single-CC request without stored turns as that CC', () => {
    const plan = recommendUnitSundays({ sundays: [D1], request: { units }, wardStats: {}, unitBlocks: {} })
    expect(plan.picks[D1].length).toBeGreaterThan(0)
  })

  it('lists every stake, with an empty list when it is not asked', () => {
    const plan = recommendUnitSundays({
      sundays: [D1],
      request: { units: [unit('a', 'r1', 1), unit('b', 'r1', 1), unit('c', 'r1', 1)] },
      wardStats: {}, unitBlocks: {},
    })
    expect(Object.keys(plan.unitSundays).sort()).toEqual(['a', 'b', 'c'])
    expect(plan.unitSundays.c).toEqual([])
  })

  it('follows each Sunday’s CC turn', () => {
    const plan = recommendUnitSundays({
      sundays: [D1, D2, D3],
      request: {
        units: [unit('a', 'r1', 1), unit('b', 'r1', 1), unit('c', 'r2', 1), unit('d', 'r2', 1)],
        sundayRegions: { [D1]: 'r1', [D2]: 'r2', [D3]: 'r1' },
      },
      wardStats: {} as Record<string, WardVisitStat>, unitBlocks: {},
    })
    expect(plan.unitSundays.c).toEqual([D2])
    expect(plan.unitSundays.d).toEqual([D2])
    expect([...plan.unitSundays.a, ...plan.unitSundays.b].sort()).toEqual([D1, D1, D3, D3])
  })
})
