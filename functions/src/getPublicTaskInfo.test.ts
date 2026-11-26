import { describe, expect, it, vi } from 'vitest'

vi.mock('firebase-admin', () => ({ firestore: vi.fn() }))

import { wardNamesOfUnit } from './getPublicTaskInfo'

describe('wardNamesOfUnit', () => {
  it("lists a stake's wards and nothing from another stake", () => {
    const wards = wardNamesOfUnit('seoul-stake')
    expect(wards).toContain('녹번 와드')
    expect(wards).toContain('신촌 와드')
    expect(wards).not.toContain('강북1 와드')
  })

  it('is empty for an unknown or missing stake', () => {
    expect(wardNamesOfUnit('')).toEqual([])
    expect(wardNamesOfUnit('no-such-stake')).toEqual([])
  })
})
