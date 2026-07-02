import { describe, it, expect } from 'vitest'
import { getRegionIdByUnit, ALL_UNITS, getWardById, getWardIdByName } from './regions'

describe('getRegionIdByUnit', () => {
  it('returns the regionId for a known unit', () => {
    const unit = ALL_UNITS[0]
    expect(getRegionIdByUnit(unit.id)).toBe(unit.regionId)
  })

  it('returns undefined for an unknown unit', () => {
    expect(getRegionIdByUnit('does-not-exist')).toBeUndefined()
  })
})

describe('ward lookup helpers', () => {
  it('getWardById returns the ward for a known id', () => {
    expect(getWardById('seoul-nokbeon')?.name.ko).toBe('녹번 와드')
  })
  it('getWardById returns undefined for unknown id', () => {
    expect(getWardById('nope')).toBeUndefined()
  })
  it('getWardIdByName resolves a ward name to its id', () => {
    expect(getWardIdByName('녹번 와드')).toBe('seoul-nokbeon')
  })
  it('getWardIdByName returns undefined for unknown name', () => {
    expect(getWardIdByName('없는 와드')).toBeUndefined()
  })
})
