import { describe, it, expect } from 'vitest'
import { getScopeUnitIds, getScopeDisplayName } from './regions'

describe('regions', () => {
  describe('getScopeUnitIds', () => {
    it('returns all 6 Seoul units for seoul region', () => {
      const result = getScopeUnitIds('seoul')
      expect(result).toEqual([
        'seoul-stake',
        'seoul-east-stake',
        'seoul-south-stake',
        'seoul-west-stake',
        'gangneung-district',
        'military-district',
      ])
    })

    it('returns 4 Seoul-South units for seoul-south region', () => {
      const result = getScopeUnitIds('seoul-south')
      expect(result).toEqual([
        'gyeonggi-stake',
        'daejeon-stake',
        'cheongju-stake',
        'jeonju-stake',
      ])
    })

    it('returns 5 Busan units for busan region', () => {
      const result = getScopeUnitIds('busan')
      expect(result).toEqual([
        'gwangju-stake',
        'busan-stake',
        'daegu-stake',
        'changwon-stake',
        'ulsan-district',
      ])
    })

    it('returns the unit itself when given a unit scopeId', () => {
      const result = getScopeUnitIds('seoul-stake')
      expect(result).toEqual(['seoul-stake'])
    })

    it('returns empty array for unknown scopeId', () => {
      const result = getScopeUnitIds('unknown-id')
      expect(result).toEqual([])
    })
  })

  describe('getScopeDisplayName', () => {
    it('returns Korean display name for seoul region', () => {
      const result = getScopeDisplayName('seoul')
      expect(result).toBe('서울 CCM')
    })

    it('returns Korean display name for busan-stake unit', () => {
      const result = getScopeDisplayName('busan-stake')
      expect(result).toBe('부산 스테이크')
    })

    it('returns empty string for unknown scopeId', () => {
      const result = getScopeDisplayName('unknown')
      expect(result).toBe('')
    })
  })
})
