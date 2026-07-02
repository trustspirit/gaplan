import { describe, it, expect } from 'vitest'
import { hasPendingReminders, type PresenceSchedule } from './remindersPresence'

describe('hasPendingReminders', () => {
  it('true when quarterly stake interview missing', () => {
    expect(
      hasPendingReminders(['seoul-stake'], [], new Set(['seoul-stake']), null, new Set(), '2026-05-15'),
    ).toBe(true)
  })

  it('false when stake_president interview exists and no future visits', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', targetKind: 'stake_president' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(), '2026-05-15'),
    ).toBe(false)
  })

  it('treats legacy schedules (no targetKind, no wardId) as stake-target for back-compat', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(), '2026-05-15'),
    ).toBe(false)
  })

  it('does not count a schedule with wardId set as a stake-target (legacy exception)', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', wardId: 'gangnam-ward' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(), '2026-05-15'),
    ).toBe(true)
  })

  it('ignores non-active (cancelled) interviews for the quarterly check', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'cancelled', targetKind: 'stake_president' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(), '2026-05-15'),
    ).toBe(true)
  })

  it('respects dismissed interview reminder key', () => {
    expect(
      hasPendingReminders(
        ['seoul-stake'], [], new Set(['seoul-stake']), null,
        new Set(['interview:seoul-stake:2026-04-01']), '2026-05-15',
      ),
    ).toBe(false)
  })

  it('true when a future ward_visit has no matching ward_bishop contact', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', targetKind: 'stake_president' },
      { id: 'v1', type: 'ward_visit', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-06-01', status: 'confirmed', wardId: 'gangnam-ward', wardName: '강남와드' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(), '2026-05-15'),
    ).toBe(true)
  })

  it('false when the future ward_visit has a satisfying ward_bishop meeting', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', targetKind: 'stake_president' },
      { id: 'v1', type: 'ward_visit', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-06-01', status: 'confirmed', wardId: 'gangnam-ward', wardName: '강남와드' },
      { id: 'm1', type: 'meeting', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-20', status: 'confirmed', targetKind: 'ward_bishop', wardId: 'gangnam-ward' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(), '2026-05-15'),
    ).toBe(false)
  })

  it('ignores past ward_visits (date <= today)', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', targetKind: 'stake_president' },
      { id: 'v1', type: 'ward_visit', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-15', status: 'confirmed', wardId: 'gangnam-ward' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(), '2026-05-15'),
    ).toBe(false)
  })

  it('respects dismissed meeting reminder key', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', targetKind: 'stake_president' },
      { id: 'v1', type: 'ward_visit', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-06-01', status: 'confirmed', wardId: 'gangnam-ward' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(['meeting:v1']), '2026-05-15'),
    ).toBe(false)
  })

  it('filters ward_visits/meetings by actingSeventyUid scope', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', targetKind: 'stake_president' },
      { id: 'v1', type: 'ward_visit', unitId: 'seoul-stake', seventyUid: 's2', date: '2026-06-01', status: 'confirmed', wardId: 'gangnam-ward' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), 's1', new Set(), '2026-05-15'),
    ).toBe(false)
  })
})
