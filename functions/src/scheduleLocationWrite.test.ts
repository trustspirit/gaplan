import { describe, it, expect } from 'vitest'
import { resolveScheduleLocation, resolveScheduleLocationForEdit } from './adminScheduleFields'

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

describe('resolveScheduleLocationForEdit', () => {
  it('와드 방문에 zoomLink를 추가하면 온라인으로 다시 유도한다', () => {
    const current = {
      type: 'ward_visit',
      unitId: 'seoul-east-stake',
      wardName: '교문 와드',
      location: '교문 와드',
    }
    expect(
      resolveScheduleLocationForEdit(current, { zoomLink: 'https://zoom.us/j/123' }),
    ).toBe('온라인 (Zoom)')
  })
})
