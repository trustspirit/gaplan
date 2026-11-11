import { describe, it, expect } from 'vitest'
import { canBeSeventyOnly, dedupeById, isSeventyOnly } from './seventyOnly'

describe('isSeventyOnly', () => {
  it('seventyOnly가 정확히 true일 때만 true', () => {
    expect(isSeventyOnly({ seventyOnly: true })).toBe(true)
    expect(isSeventyOnly({ seventyOnly: false })).toBe(false)
    expect(isSeventyOnly({ seventyOnly: 'true' })).toBe(false)
  })

  it('필드가 없는 옛 문서와 없는 문서는 false', () => {
    expect(isSeventyOnly({})).toBe(false)
    expect(isSeventyOnly(undefined)).toBe(false)
    expect(isSeventyOnly(null)).toBe(false)
  })
})

describe('canBeSeventyOnly', () => {
  it("대상이 '기타'인 접견/모임만 된다", () => {
    expect(canBeSeventyOnly({ type: 'meeting', targetKind: 'other' })).toBe(true)
    expect(canBeSeventyOnly({ type: 'interview', targetKind: 'other' })).toBe(true)
  })

  it('대상이 정해진 접견/모임은 안 된다', () => {
    expect(canBeSeventyOnly({ type: 'meeting', targetKind: 'cc_council' })).toBe(false)
    expect(canBeSeventyOnly({ type: 'interview', targetKind: 'stake_president' })).toBe(false)
    expect(canBeSeventyOnly({ type: 'meeting', targetKind: 'ward_bishop' })).toBe(false)
  })

  it('대상 유형이 비어 있는 옛 접견과 방문은 안 된다', () => {
    expect(canBeSeventyOnly({ type: 'interview', targetKind: null })).toBe(false)
    expect(canBeSeventyOnly({ type: 'interview' })).toBe(false)
    expect(canBeSeventyOnly({ type: 'ward_visit', targetKind: 'other' })).toBe(false)
  })
})

describe('dedupeById', () => {
  it('같은 id는 먼저 나온 것만 남기고 순서를 지킨다', () => {
    expect(dedupeById([{ id: 'a', n: 1 }, { id: 'b', n: 2 }, { id: 'a', n: 3 }])).toEqual([
      { id: 'a', n: 1 },
      { id: 'b', n: 2 },
    ])
  })
})
