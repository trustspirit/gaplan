import { describe, expect, it } from 'vitest'
import type { RequestUnit, WardVisitStat } from './visitRequestLogic'
import { checkPlanBalance, hasStakePlan, recommendUnitSundays } from './visitPlanBalance'
import type { SundayStatus } from './visitSundayAvailability'

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

  it('still recommends when the stored stakes carry no CC at all', () => {
    const bare = [unit('a', 'r1', 1), unit('b', 'r1', 1)].map((u) => ({ ...u, regionId: undefined }))
    const plan = recommendUnitSundays({ sundays: [D1], request: { units: bare }, wardStats: {}, unitBlocks: {} })
    expect(plan.roles[D1].primary).toBeDefined()
    expect(plan.roles[D1].backup).toBeDefined()
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

describe('checkPlanBalance', () => {
  const D4 = '2027-01-31'
  const sundays = [D1, D2, D3, D4]
  const units = [unit('a', 'r1', 2), unit('b', 'r1', 1), unit('c', 'r1', 1)]
  const today = '2027-01-01'
  const recent: Record<string, WardVisitStat> = Object.fromEntries(
    ['a1', 'a2', 'b1', 'c1'].map((id) => [id, { lastVisit: '2026-10-01', nextVisit: null, count12m: 1 }]),
  )
  const free = (): SundayStatus => ({ busy: [], notes: [], unitBlocks: {}, councilRegionId: null })
  const check = (unitSundays: Record<string, string[]> | undefined, extra: {
    status?: Record<string, SundayStatus>; wardStats?: Record<string, WardVisitStat>
    decisions?: Record<string, { unitId: string; wardName: string }>
  } = {}) =>
    checkPlanBalance({
      request: { sundays, units, unitSundays, decisions: extra.decisions },
      status: extra.status ?? {}, wardStats: extra.wardStats ?? recent, today,
    })
  const kinds = (issues: ReturnType<typeof check>) => issues.map((i) => `${i.kind}:${i.date ?? i.unitId ?? i.regionId}`)

  it('finds nothing to warn about in its own recommendation', () => {
    const plan = recommendUnitSundays({ sundays, request: { units }, wardStats: recent, unitBlocks: {} })
    expect(check(plan.unitSundays).filter((i) => i.level === 'warn')).toEqual([])
  })

  it('returns nothing for an older request without stake Sundays', () => {
    expect(check(undefined)).toEqual([])
  })

  it('warns about a Sunday no stake is asked about', () => {
    const issues = check({ a: [D2, D3, D4], b: [D2, D3], c: [D4] })
    expect(issues).toContainEqual({ level: 'warn', kind: 'sundayEmpty', date: D1 })
  })

  it('warns when three or more stakes are asked the same Sunday', () => {
    const issues = check({ a: [D1, D2], b: [D1, D3], c: [D1, D4] })
    expect(issues).toContainEqual({ level: 'warn', kind: 'sundayCrowded', date: D1, count: 3 })
  })

  it('notes a Sunday with no backup stake', () => {
    const issues = check({ a: [D1, D2], b: [D2, D3, D4], c: [D3, D4] })
    expect(issues).toContainEqual({ level: 'info', kind: 'sundayNoBackup', date: D1, unitId: 'a' })
  })

  it('does not ask for a backup when only one stake can take the Sunday', () => {
    const status = { [D1]: { ...free(), unitBlocks: { b: '대회', c: '대회' } } }
    const issues = check({ a: [D1, D2], b: [D2, D3, D4], c: [D3, D4] }, { status })
    expect(kinds(issues)).not.toContain(`sundayNoBackup:${D1}`)
  })

  it('warns about a stake with no Sunday, and stresses it when a ward is long unvisited', () => {
    const us = { a: [D1, D2, D3, D4], b: [D1, D2, D3, D4], c: [] }
    expect(check(us)).toContainEqual({ level: 'warn', kind: 'unitMissing', unitId: 'c' })
    const stale = { ...recent, c1: { lastVisit: '2025-11-01', nextVisit: null, count12m: 0 } }
    expect(check(us, { wardStats: stale })).toContainEqual({ level: 'warn', kind: 'unitUrgentMissing', unitId: 'c' })
    expect(kinds(check(us, { wardStats: stale }))).not.toContain('unitMissing:c')
  })

  it('notes a stake asked more than its share by ward count', () => {
    // 일요일 4 × 2곳 = 8칸, 와드 a2 b1 c1 → 몫 a4 b2 c2, 적정 상한 a5 b3 c3
    const issues = check({ a: [D1, D2, D3, D4], b: [D1, D2, D3, D4], c: [] })
    expect(issues).toContainEqual({ level: 'info', kind: 'unitOver', unitId: 'b', count: 4, min: 2, max: 3 })
    expect(kinds(issues)).not.toContain('unitOver:a')
  })

  it('leaves decided and busy Sundays out', () => {
    const status = { [D2]: { ...free(), busy: [{ kind: 'schedule' as const, label: '출장' }] } }
    const decisions = { [D1]: { unitId: 'a', wardName: 'A1' } }
    const issues = check({ a: [D1, D3, D4], b: [D3], c: [D4] }, { status, decisions })
    expect(issues.filter((i) => i.date === D1 || i.date === D2)).toEqual([])
  })

  it('notes a CC with fewer Sundays than its ward share', () => {
    const two = [unit('a', 'r1', 2), unit('b', 'r1', 2), unit('c', 'r2', 2), unit('d', 'r2', 2)]
    const six = ['2027-01-03', D1, D2, D3, D4, '2027-02-07']
    const turns = Object.fromEntries(six.map((d, i) => [d, i === 0 ? 'r1' : 'r2']))
    const issues = checkPlanBalance({
      request: { sundays: six, units: two, sundayRegions: turns, unitSundays: { a: [six[0]], b: [six[0]], c: six.slice(1), d: six.slice(1) } },
      status: {}, wardStats: {}, today,
    })
    expect(issues).toContainEqual({ level: 'info', kind: 'regionShare', regionId: 'r1', count: 1, expected: 3 })
  })

  it('lists warnings before notes', () => {
    const issues = check({ a: [D1, D2], b: [D2, D3, D4], c: [] })
    const firstInfo = issues.findIndex((i) => i.level === 'info')
    expect(firstInfo).toBeGreaterThan(0)
    expect(issues.slice(firstInfo).every((i) => i.level === 'info')).toBe(true)
  })
})

describe('recommendation on realistic visit history', () => {
  const sundays = ['2027-01-10', '2027-01-17', '2027-01-24', '2027-01-31']
  const visited = (ids: string[], count12m: number, nextVisit: string | null = null) =>
    Object.fromEntries(ids.map((id) => [id, { lastVisit: '2026-09-01', nextVisit, count12m }]))

  it('still asks a backup stake when the small stakes have shown all their wards', () => {
    const units = [unit('a', 'r1', 8), unit('b', 'r1', 3), unit('c', 'r1', 3)]
    const wardStats = { ...visited(['a1', 'a2', 'a3', 'a4'], 1) }
    const plan = recommendUnitSundays({ sundays, request: { units }, wardStats, unitBlocks: {} })
    for (const d of sundays) expect(plan.roles[d].backup).toBeDefined()
  })

  it('gives every stake with an unscheduled ward at least one Sunday, and warns about nothing', () => {
    const units = [unit('a', 'r1', 8), unit('b', 'r1', 7), unit('c', 'r1', 7)]
    const wardStats = { ...visited(['a1', 'a2', 'a3', 'a4'], 1) }
    const plan = recommendUnitSundays({ sundays, request: { units }, wardStats, unitBlocks: {} })
    expect(plan.unitSundays.a.length).toBeGreaterThan(0)
    const issues = checkPlanBalance({
      request: { sundays, units, unitSundays: plan.unitSundays }, status: {}, wardStats, today: '2027-01-01',
    })
    expect(issues.filter((i) => i.level === 'warn')).toEqual([])
  })

  it('does not count a stake whose wards are all scheduled as one that could be asked', () => {
    const units = [unit('a', 'r1', 2), unit('b', 'r1', 2), unit('c', 'r1', 1)]
    const wardStats = { ...visited(['c1'], 1, '2027-02-07') }
    const plan = recommendUnitSundays({ sundays, request: { units }, wardStats, unitBlocks: {} })
    expect(plan.unitSundays.c).toEqual([])
    const issues = checkPlanBalance({
      request: { sundays, units, unitSundays: plan.unitSundays }, status: {}, wardStats, today: '2027-01-01',
    })
    expect(issues).toEqual([])
  })
})

describe('recommendation over a whole quarter', () => {
  const quarter = [
    '2027-01-03', '2027-01-10', '2027-01-17', '2027-01-24', '2027-01-31', '2027-02-07', '2027-02-14',
    '2027-02-21', '2027-02-28', '2027-03-07', '2027-03-14', '2027-03-21', '2027-03-28',
  ]
  const units = [unit('a', 'r1', 8), unit('b', 'r1', 7), unit('c', 'r1', 6), unit('d', 'r1', 5), unit('e', 'r1', 3)]
  const lastOf: Record<string, string> = { a: '2026-03-01', b: '2026-05-10', c: '2026-08-02', d: '2026-10-04', e: '2026-11-08' }
  const history: Record<string, WardVisitStat> = Object.fromEntries(
    units.flatMap((u) => u.wards.map((w, i) => [w.id, { lastVisit: i === 0 ? lastOf[u.id] : '2025-06-01', nextVisit: null, count12m: 1 }])),
  )
  const plan = (wardStats: Record<string, WardVisitStat>) =>
    recommendUnitSundays({ sundays: quarter, request: { units }, wardStats, unitBlocks: {} })
  const asks = (p: ReturnType<typeof plan>) => units.map((u) => p.unitSundays[u.id].length)
  const consecutive = (dates: string[]) =>
    dates.some((d) => dates.includes(quarter[quarter.indexOf(d) + 1]))

  it('leads with the stake visited longest ago', () => {
    expect(plan(history).roles['2027-01-03']).toEqual({ primary: 'a', backup: 'b' })
  })

  it('does not ask a stake two Sundays in a row', () => {
    const p = plan(history)
    for (const u of units) expect(consecutive(p.unitSundays[u.id])).toBe(false)
  })

  it('asks every stake about as often', () => {
    const n = asks(plan(history))
    expect(Math.max(...n) - Math.min(...n)).toBeLessThanOrEqual(1)
  })

  it('still gives a stake its turns when one of its wards has a visit scheduled later in the quarter', () => {
    const n = asks(plan({ ...history, c2: { ...history.c2, nextVisit: '2027-03-14' } }))
    expect(Math.max(...n) - Math.min(...n)).toBeLessThanOrEqual(1)
  })
})

describe('hasStakePlan', () => {
  const units = [unit('a', 'r1', 1), unit('b', 'r1', 1)]
  it('is false until every stake has its own Sundays', () => {
    expect(hasStakePlan({ units })).toBe(false)
    expect(hasStakePlan({ units, unitSundays: { a: ['2027-01-10'] } })).toBe(false)
    expect(hasStakePlan({ units, unitSundays: { a: ['2027-01-10'], b: [] } })).toBe(true)
  })
  it('keeps the checks quiet on a half-filled older request', () => {
    const issues = checkPlanBalance({
      request: { sundays: ['2027-01-10'], units: [...units, unit('c', 'r1', 1)], unitSundays: { a: [] } },
      status: {}, wardStats: {}, today: '2027-01-01',
    })
    expect(issues).toEqual([])
  })
})

