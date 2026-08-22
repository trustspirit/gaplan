import { describe, it, expect } from 'vitest'
import { calendarSyncNeedsUpdate } from './calendarSyncNeedsUpdate'

const base = {
  date: '2026-08-23',
  startTime: '10:00',
  endTime: '11:00',
  zoomLink: null,
  customTitle: null,
  unitId: 'u1',
  wardName: null,
  notes: null,
  location: '교문 와드',
  targetKind: 'bishop',
}

describe('calendarSyncNeedsUpdate', () => {
  it('변경이 없으면 false', () => {
    expect(calendarSyncNeedsUpdate(base, { ...base })).toBe(false)
  })

  it('location만 바뀌어도 true — 사용자가 입력한 장소를 놓치면 안 된다', () => {
    expect(calendarSyncNeedsUpdate(base, { ...base, location: '다른 곳' })).toBe(true)
  })

  it('targetKind만 바뀌어도 true — 제목이 targetKind에 의존한다', () => {
    expect(calendarSyncNeedsUpdate(base, { ...base, targetKind: 'stakePresident' })).toBe(true)
  })

  it('before가 없으면(신규 문서) true', () => {
    expect(calendarSyncNeedsUpdate(undefined, base)).toBe(true)
  })
})
