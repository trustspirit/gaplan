import { describe, it, expect } from 'vitest'
import { rotateRegions, consecutiveSameRegion, regionForNewSunday, lastVisitRegion } from './visitRegionRotation'

describe('rotateRegions', () => {
  it('번갈아 붙이고, 바로 앞 방문의 CC로는 시작하지 않는다', () => {
    const sundays = ['2027-01-17', '2027-01-10', '2027-01-24']
    expect(rotateRegions(sundays, ['seoul', 'seoul-south'])).toEqual({
      '2027-01-10': 'seoul', '2027-01-17': 'seoul-south', '2027-01-24': 'seoul',
    })
    expect(rotateRegions(sundays, ['seoul', 'seoul-south'], 'seoul')['2027-01-10']).toBe('seoul-south')
  })

  it('협의 평의회 날은 그 CC로 고정하고, 그 앞뒤는 다른 CC로 맞춘다', () => {
    const sundays = ['2027-01-10', '2027-01-17', '2027-01-24', '2027-01-31']
    const r = rotateRegions(sundays, ['seoul', 'seoul-south'], null, { '2027-01-24': 'seoul' })
    expect(r).toEqual({
      '2027-01-10': 'seoul', '2027-01-17': 'seoul-south', '2027-01-24': 'seoul', '2027-01-31': 'seoul-south',
    })
    // 고정된 날이 둘째 자리여도 바로 앞에서 피해 간다
    const r2 = rotateRegions(sundays, ['seoul', 'seoul-south'], null, { '2027-01-17': 'seoul' })
    expect(r2['2027-01-10']).toBe('seoul-south')
    expect(r2['2027-01-24']).toBe('seoul-south')
  })

  it('CC가 셋이면 셋을 돈다', () => {
    const r = rotateRegions(['2027-01-10', '2027-01-17', '2027-01-24', '2027-01-31'], ['a', 'b', 'c'])
    expect(Object.values(r)).toEqual(['a', 'b', 'c', 'a'])
  })
})

describe('consecutiveSameRegion', () => {
  it('바로 앞 일요일과 같은 CC인 날을 찾는다', () => {
    expect(consecutiveSameRegion({ '2027-01-10': 'a', '2027-01-24': 'a', '2027-01-31': 'b' })).toEqual(['2027-01-24'])
    expect(consecutiveSameRegion({ '2027-01-10': 'a', '2027-01-17': 'b' })).toEqual([])
  })
})

describe('regionForNewSunday', () => {
  it('앞뒤와 다른 CC를 고른다', () => {
    expect(regionForNewSunday('2027-01-17', { '2027-01-10': 'a', '2027-01-24': 'a' }, ['a', 'b'])).toBe('b')
    expect(regionForNewSunday('2027-01-17', { '2027-01-10': 'a', '2027-01-24': 'b' }, ['a', 'b', 'c'])).toBe('c')
    // 둘뿐이고 앞뒤가 다르면 앞과만 다르게
    expect(regionForNewSunday('2027-01-17', { '2027-01-10': 'a', '2027-01-24': 'b' }, ['a', 'b'])).toBe('b')
  })
})

describe('lastVisitRegion', () => {
  it('그 전 마지막 와드 방문의 CC — 취소·다른 종류·이후 일정은 뺀다', () => {
    const map = { 'seoul-stake': 'seoul', 'seoul-south-stake': 'seoul-south' }
    expect(lastVisitRegion([
      { type: 'ward_visit', status: 'confirmed', date: '2026-12-13', unitId: 'seoul-stake' },
      { type: 'ward_visit', status: 'cancelled', date: '2026-12-27', unitId: 'seoul-south-stake' },
      { type: 'meeting', status: 'confirmed', date: '2026-12-26', unitId: 'seoul-south-stake' },
      { type: 'ward_visit', status: 'pending', date: '2027-01-10', unitId: 'seoul-south-stake' },
    ], '2027-01-03', map)).toBe('seoul')
    expect(lastVisitRegion([], '2027-01-03', map)).toBeNull()
  })
})
