import { describe, it, expect } from 'vitest'
import { UNIT_REGION_MAP } from './unitRegionMap'
import { getScopeUnitIds, getScopeRegionId } from './regions'

describe('UNIT_REGION_MAP', () => {
  // 이 맵이 regions.ts의 CC 편성과 어긋나면 같은 일정이 공개 페이지와 구글 캘린더에서
  // 서로 다른 CC로 간다. 실제로 경기 스테이크가 그렇게 갈렸다.
  it('regions.ts의 CC 편성과 모든 유닛에서 일치한다', () => {
    for (const [unitId, regionId] of Object.entries(UNIT_REGION_MAP)) {
      expect(getScopeRegionId(unitId), unitId).toBe(regionId)
    }
  })

  it('regions.ts의 모든 유닛을 담고 있다', () => {
    const allUnits = ['seoul', 'seoul-south', 'busan'].flatMap(getScopeUnitIds)
    expect(Object.keys(UNIT_REGION_MAP).sort()).toEqual([...allUnits].sort())
  })

  it('경기 스테이크는 서울남 CC다', () => {
    expect(UNIT_REGION_MAP['gyeonggi-stake']).toBe('seoul-south')
  })

  it('서울남 스테이크는 서울 CC다', () => {
    expect(UNIT_REGION_MAP['seoul-south-stake']).toBe('seoul')
  })

  it('광주 스테이크는 부산 CC다', () => {
    expect(UNIT_REGION_MAP['gwangju-stake']).toBe('busan')
  })
})
