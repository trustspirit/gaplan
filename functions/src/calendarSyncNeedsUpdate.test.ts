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

import { calendarSyncNeedsUpdate as needsUpdateForAllDay } from './calendarSyncNeedsUpdate'

describe('calendarSyncNeedsUpdate — 종일·여러 날', () => {
  const base = { date: '2026-12-03', startTime: '00:00', endTime: '23:59' }

  it('종일로 바꾸거나 풀면 다시 보낸다', () => {
    expect(needsUpdateForAllDay(base, { ...base, allDay: true })).toBe(true)
    expect(needsUpdateForAllDay({ ...base, allDay: true }, base)).toBe(true)
  })

  it('allDay가 없는 것과 false는 같은 것으로 본다', () => {
    expect(needsUpdateForAllDay(base, { ...base, allDay: false })).toBe(false)
  })

  it('종료일이 바뀌면 다시 보낸다', () => {
    expect(needsUpdateForAllDay(base, { ...base, endDate: '2026-12-05' })).toBe(true)
  })
})
