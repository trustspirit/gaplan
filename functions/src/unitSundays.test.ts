import { describe, expect, it } from 'vitest'
import { regionOfSunday, unitSundayOptions, type UnitSundayRequest } from './unitSundays'

const free = { busy: [], notes: [], unitBlocks: {}, councilRegionId: null }

const request: UnitSundayRequest = {
  sundays: ['2027-01-10', '2027-01-17', '2027-01-24', '2027-01-31'],
  units: [
    { id: 'a', ko: 'A', en: 'A', regionId: 'r1', wards: [] },
    { id: 'b', ko: 'B', en: 'B', regionId: 'r2', wards: [] },
  ],
  sundayRegions: { '2027-01-10': 'r1', '2027-01-17': 'r2', '2027-01-24': 'r1', '2027-01-31': 'r1' },
  decisions: {},
}

describe('unitSundayOptions', () => {
  it('lets only the stake’s CC-turn Sundays be picked, all selected by default', () => {
    const opts = unitSundayOptions(request, 'a', {})
    expect(opts.map((o) => [o.date, o.block, o.selected])).toEqual([
      ['2027-01-10', null, true],
      ['2027-01-17', 'otherRegion', false],
      ['2027-01-24', null, true],
      ['2027-01-31', null, true],
    ])
  })

  it('blocks days the seventy is busy, the stake has a conference, or another stake was decided', () => {
    const opts = unitSundayOptions(
      { ...request, decisions: { '2027-01-31': { unitId: 'x', wardId: 'w', wardName: 'W' } } },
      'a',
      {
        '2027-01-10': { ...free, busy: [{ kind: 'blocked', label: '', publicLabel: true }] },
        '2027-01-24': { ...free, unitBlocks: { a: '스테이크 대회' } },
      },
    )
    expect(opts.filter((o) => o.block !== 'otherRegion').map((o) => [o.block, o.selected])).toEqual([
      ['busy', false],
      ['unitBlocked', false],
      ['decidedOther', false],
    ])
  })

  it('keeps the seventy’s choice', () => {
    const opts = unitSundayOptions({ ...request, unitSundays: { a: ['2027-01-24'] } }, 'a', {})
    expect(opts.filter((o) => o.selected).map((o) => o.date)).toEqual(['2027-01-24'])
  })
})

describe('regionOfSunday', () => {
  const d = '2027-01-03'
  it('uses the only CC when the request has one CC and no turns', () => {
    expect(regionOfSunday({ units: [{ regionId: 'r1' }, { regionId: 'r1' }] }, d)).toBe('r1')
  })
  it('is undefined with several CCs and no turn for that day', () => {
    expect(regionOfSunday({ units: [{ regionId: 'r1' }, { regionId: 'r2' }] }, d)).toBeUndefined()
  })
  it('follows the stored turn', () => {
    expect(regionOfSunday({ units: [{ regionId: 'r1' }, { regionId: 'r2' }], sundayRegions: { [d]: 'r2' } }, d)).toBe('r2')
  })
})
