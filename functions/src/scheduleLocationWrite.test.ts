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

  it('명시적으로 쓴 location이 있으면 유도 가능한 값이 있어도 그대로(trim) 이긴다', () => {
    const current = {
      type: 'meeting',
      unitId: 'seoul-east-stake',
      zoomLink: 'https://zoom.us/j/123', // 유도하면 '온라인 (Zoom)'이 나올 상황
    }
    expect(
      resolveScheduleLocationForEdit(current, { location: '  회의실 A  ' }),
    ).toBe('회의실 A')
  })

  it('location을 빈 문자열로 보내면 저장하지 않고 다시 유도한다', () => {
    const current = {
      type: 'ward_visit',
      unitId: 'seoul-east-stake',
      wardName: '교문 와드',
      location: '스테이크 센터', // 이전에 사용자가 직접 써 둔 값
    }
    expect(
      resolveScheduleLocationForEdit(current, { location: '' }),
    ).toBe('교문 와드')
  })

  it('wardName이 바뀌면 저장된 location도 새 와드를 따라간다', () => {
    const current = {
      type: 'ward_visit',
      unitId: 'seoul-east-stake',
      wardName: '교문 와드',
      location: '교문 와드',
    }
    expect(
      resolveScheduleLocationForEdit(current, { wardName: '신촌 와드' }),
    ).toBe('신촌 와드')
  })

  it('이번 요청이 건드리지 않은 필드는 기존 문서 값을 그대로 쓴다 (시간만 바꾼 수정)', () => {
    const current = {
      type: 'ward_visit',
      unitId: 'seoul-east-stake',
      wardName: '교문 와드',
      location: '교문 와드',
    }
    expect(resolveScheduleLocationForEdit(current, {})).toBe('교문 와드')
  })
})

// 스테이크/지방부를 비운 수정(단체 모임 등)은 unitId를 빈 문자열로 보낸다 — 키가 빠진
// "안 건드림"과 구분돼야 하고, 스테이크에서 유도됐던 장소도 함께 사라져야 한다.
describe('resolveScheduleLocationForEdit — 스테이크를 비운 수정', () => {
  const meeting = {
    type: 'meeting',
    unitId: 'seoul-east-stake',
    targetKind: 'other',
    location: '서울동 스테이크',
  }

  it('unitId를 빈 문자열로 비우면 유도된 장소도 null이 된다', () => {
    expect(resolveScheduleLocationForEdit(meeting, { unitId: '' })).toBeNull()
  })

  it('unitId를 아예 안 보내면 기존 스테이크에서 유도한 장소가 그대로 남는다', () => {
    expect(resolveScheduleLocationForEdit(meeting, {})).toBe('서울동 스테이크')
  })
})
