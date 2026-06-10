import { describe, it, expect } from 'vitest'
import { getRegionIdByUnit, ALL_UNITS } from './regions'

describe('getRegionIdByUnit', () => {
  it('returns the regionId for a known unit', () => {
    const unit = ALL_UNITS[0]
    expect(getRegionIdByUnit(unit.id)).toBe(unit.regionId)
  })

  it('returns undefined for an unknown unit', () => {
    expect(getRegionIdByUnit('does-not-exist')).toBeUndefined()
  })
})
