import { describe, it, expect } from 'vitest'
import { resolveScheduleLocation } from './adminScheduleFields'

describe('resolveScheduleLocation', () => {
  it('사용자 입력이 있으면 그대로 저장한다', () => {
    expect(
      resolveScheduleLocation({ type: 'ward_visit', unitId: 'seoul-east-stake', wardName: '교문 와드', location: '  스테이크 센터  ' }),
    ).toBe('스테이크 센터')
  })

  it('비어 있으면 규칙으로 유도해 저장한다', () => {
    expect(
      resolveScheduleLocation({ type: 'ward_visit', unitId: 'seoul-east-stake', wardName: '교문 와드' }),
    ).toBe('교문 와드')
  })

  it('유도할 것이 없으면 null을 저장한다', () => {
    expect(resolveScheduleLocation({ type: 'meeting' })).toBeNull()
  })
})
