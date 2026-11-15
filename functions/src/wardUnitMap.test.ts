import { describe, it, expect } from 'vitest'
import { WARDS } from '../../src/constants/regions'
import { WARD_UNITS, wardIdFor } from './wardUnitMap'

// functions는 src를 import할 수 없어 표를 복제해 둔다. 어긋나면 방문 추천에서 정상 와드가
// 걸러지거나, 반대로 다른 스테이크의 와드가 통과한다.
describe('WARD_UNITS', () => {
  it('src/constants/regions.ts의 WARDS와 같다', () => {
    const expected = Object.fromEntries(WARDS.map((w) => [w.id, { unitId: w.unitId, ko: w.name.ko }]))
    expect(WARD_UNITS).toEqual(expected)
  })
})

describe('wardIdFor', () => {
  it('스테이크와 이름이 함께 맞는 와드의 id를 돌려준다', () => {
    expect(wardIdFor('cheongju-stake', '상당 와드')).toBe('cheongju-sangdang')
    expect(wardIdFor('cheongju-stake', ' 상당 와드 ')).toBe('cheongju-sangdang')
  })

  it('다른 스테이크의 이름이거나 모르는 이름·빈 값이면 null', () => {
    expect(wardIdFor('seoul-stake', '상당 와드')).toBeNull()
    expect(wardIdFor('cheongju-stake', '없는 와드')).toBeNull()
    expect(wardIdFor('', '상당 와드')).toBeNull()
    expect(wardIdFor('cheongju-stake', null)).toBeNull()
  })
})
