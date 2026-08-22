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

  // M4 (2026-08-22): getWardIdByName은 이름만으로 전역 검색해 서로 다른 스테이크에
  // 동명 와드가 있으면 엉뚱한 와드 id를 돌려줄 수 있다. 실제 데이터에는 동명 와드가
  // 없어(레포에는 픽스처를 추가하지 않는다) 그 시나리오를 그대로 재현할 수는 없지만,
  // unitId를 주면 그 단위 밖의 와드를 절대 반환하지 않는다는 것으로 스코프를 검증한다.
  it('unitId를 주면 그 단위 안에서만 찾는다 — 다른 단위의 동명 와드를 반환하지 않는다', () => {
    // 녹번 와드는 seoul-stake 소속이다. seoul-east-stake로 좁혀 찾으면 그 안에는
    // 없으므로 undefined가 나와야 한다 — 전역 검색이면 seoul-nokbeon이 새어 나온다.
    expect(getWardIdByName('녹번 와드', 'seoul-east-stake')).toBeUndefined()
    // 올바른 단위로 좁히면 그대로 찾는다.
    expect(getWardIdByName('녹번 와드', 'seoul-stake')).toBe('seoul-nokbeon')
  })

  it('unitId를 주지 않으면 예전처럼 전역에서 찾는다(하위 호환)', () => {
    expect(getWardIdByName('녹번 와드')).toBe('seoul-nokbeon')
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
