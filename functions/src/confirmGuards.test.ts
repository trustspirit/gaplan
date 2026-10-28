import { describe, it, expect } from 'vitest'
import { confirmDeniedReason, isSlotTaken, wardVisitConfirmError } from './confirmGuards'

describe('confirmDeniedReason', () => {
  it('lets an admin confirm any task', () => {
    expect(confirmDeniedReason({ role: 'admin', uid: 'a1' }, 's1')).toBeNull()
  })

  it('lets a seventy confirm their own task', () => {
    expect(confirmDeniedReason({ role: 'seventy', uid: 's1' }, 's1')).toBeNull()
  })

  // 확정은 기존 일정을 지우고 다시 만든다 — 다른 seventy의 일정을 지울 수 있으면 안 된다.
  it("refuses a seventy who confirms another seventy's task", () => {
    expect(confirmDeniedReason({ role: 'seventy', uid: 's1' }, 's2')).not.toBeNull()
  })

  it('lets an exec_secretary confirm only for their assigned seventy', () => {
    expect(
      confirmDeniedReason({ role: 'exec_secretary', uid: 'x1', assignedSeventyUid: 's1' }, 's1'),
    ).toBeNull()
    expect(
      confirmDeniedReason({ role: 'exec_secretary', uid: 'x1', assignedSeventyUid: 's1' }, 's2'),
    ).not.toBeNull()
    expect(confirmDeniedReason({ role: 'exec_secretary', uid: 'x1' }, 's1')).not.toBeNull()
  })

  it('refuses everyone else', () => {
    expect(confirmDeniedReason({ role: 'president', uid: 'p1' }, 's1')).not.toBeNull()
    expect(confirmDeniedReason({ role: undefined, uid: 'p1' }, 's1')).not.toBeNull()
  })
})

describe('isSlotTaken', () => {
  it('is free when nothing is there', () => {
    expect(isSlotTaken(undefined)).toBe(false)
  })

  it('is taken by a confirmed schedule', () => {
    expect(isSlotTaken({ status: 'confirmed' })).toBe(true)
  })

  // 취소는 문서를 지우지 않고 status만 바꾼다. 그 문서를 "이미 확정됨"으로 읽으면
  // 같은 슬롯을 다시는 확정할 수 없다.
  it('is free again once the schedule there was cancelled', () => {
    expect(isSlotTaken({ status: 'cancelled' })).toBe(false)
  })
})

describe('wardVisitConfirmError', () => {
  const task = { type: 'select_visit', availableDates: ['2026-11-01', '2026-11-08'] }

  it('accepts the president confirming one of the offered dates for their own unit', () => {
    expect(wardVisitConfirmError(task, { unitId: 'u1', date: '2026-11-08' }, 'u1')).toBeNull()
  })

  it('refuses a unit other than the president’s own', () => {
    expect(wardVisitConfirmError(task, { unitId: 'u2', date: '2026-11-08' }, 'u1')).not.toBeNull()
  })

  it('refuses a date the task did not offer', () => {
    expect(wardVisitConfirmError(task, { unitId: 'u1', date: '2026-12-25' }, 'u1')).not.toBeNull()
  })

  it('refuses a task that is not a ward-visit selection', () => {
    expect(
      wardVisitConfirmError(
        { type: 'select_interview', availableDates: ['2026-11-01'] },
        { unitId: 'u1', date: '2026-11-01' },
        'u1',
      ),
    ).not.toBeNull()
  })

  it('prefers the unit written on the task over the user doc', () => {
    expect(
      wardVisitConfirmError({ ...task, unitId: 'u9' }, { unitId: 'u9', date: '2026-11-01' }, 'u1'),
    ).toBeNull()
  })
})
