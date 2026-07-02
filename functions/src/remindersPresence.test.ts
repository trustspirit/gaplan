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

  // --- Real-data-shape regression cases (post-review) ---

  it('a meeting with targetKind:null, wardId:null does NOT satisfy the quarterly stake reminder', () => {
    // Real "no target" schedules are written as targetKind: null (adminCreateSchedule.ts).
    // The client counts only targetKind === undefined (legacy) as stake-target, not null.
    const s: PresenceSchedule[] = [
      { id: 'm1', type: 'meeting', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', targetKind: null, wardId: null },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(), '2026-05-15'),
    ).toBe(true)
  })

  it('a legacy interview with targetKind absent (undefined) and no wardId DOES satisfy (back-compat)', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(), '2026-05-15'),
    ).toBe(false)
  })

  it('future ward_visit with only wardName is satisfied by a ward_bishop contact resolved via getWardIdByName', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', targetKind: 'stake_president' },
      // Real ward_visit docs carry wardName only, no wardId.
      { id: 'v1', type: 'ward_visit', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-06-01', status: 'confirmed', wardName: '녹번 와드' },
      // ward_bishop contact keyed by the ward's actual id.
      { id: 'm1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-20', status: 'confirmed', targetKind: 'ward_bishop', wardId: 'seoul-nokbeon' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(), '2026-05-15'),
    ).toBe(false)
  })

  it('future ward_visit with only wardName is pending when no matching ward_bishop contact exists', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', targetKind: 'stake_president' },
      { id: 'v1', type: 'ward_visit', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-06-01', status: 'confirmed', wardName: '녹번 와드' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(), '2026-05-15'),
    ).toBe(true)
  })

  it('dismissed meeting key (meeting:{visitId}) is skipped for a wardName-only visit', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', targetKind: 'stake_president' },
      { id: 'v1', type: 'ward_visit', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-06-01', status: 'confirmed', wardName: '녹번 와드' },
    ]
    expect(
      hasPendingReminders(['seoul-stake'], s, new Set(['seoul-stake']), null, new Set(['meeting:v1']), '2026-05-15'),
    ).toBe(false)
  })
})
