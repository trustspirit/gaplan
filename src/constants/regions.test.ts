import { describe, it, expect } from 'vitest'
import { getRegionIdByUnit, ALL_UNITS, getWardById, getWardIdByName, getScheduleRegionId } from './regions'

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

describe('getScheduleRegionId', () => {
  it('일반 일정은 unitId로 CC를 역산한다', () => {
    expect(getScheduleRegionId({ unitId: 'seoul-east-stake' })).toBe('seoul')
    expect(getScheduleRegionId({ unitId: 'daejeon-stake' })).toBe('seoul-south')
    expect(getScheduleRegionId({ unitId: 'ulsan-district' })).toBe('busan')
  })

  // 협의 평의회는 unitId가 비어 있어, 역산만 하면 CC 필터에서 통째로 사라진다
  it('unitId 없이 regionId만 있는 협의 평의회도 CC를 찾는다', () => {
    expect(getScheduleRegionId({ unitId: '', regionId: 'seoul' })).toBe('seoul')
  })

  it('regionId가 unitId 역산보다 우선한다', () => {
    expect(getScheduleRegionId({ unitId: 'busan-stake', regionId: 'seoul' })).toBe('seoul')
  })

  it('둘 다 없으면 undefined', () => {
    expect(getScheduleRegionId({ unitId: 'nope' })).toBeUndefined()
    expect(getScheduleRegionId({})).toBeUndefined()
  })
})
