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

  it('false when the future ward_visit has a satisfying linked meeting', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', targetKind: 'stake_president' },
      { id: 'v1', type: 'ward_visit', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-06-01', status: 'confirmed', wardId: 'gangnam-ward', wardName: '강남와드' },
      { id: 'm1', type: 'meeting', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-20', status: 'confirmed', targetKind: 'ward_bishop', wardId: 'gangnam-ward', relatedVisitId: 'v1' },
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

  it('future ward_visit with only wardName is satisfied by a contact linked via relatedVisitId', () => {
    const s: PresenceSchedule[] = [
      { id: 'i1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-01', status: 'confirmed', targetKind: 'stake_president' },
      // Real ward_visit docs carry wardName only, no wardId.
      { id: 'v1', type: 'ward_visit', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-06-01', status: 'confirmed', wardName: '녹번 와드' },
      // ward_bishop contact linked to the visit by id, not resolved by ward name.
      { id: 'm1', type: 'interview', unitId: 'seoul-stake', seventyUid: 's1', date: '2026-05-20', status: 'confirmed', targetKind: 'ward_bishop', wardId: 'seoul-nokbeon', relatedVisitId: 'v1' },
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

describe('pre-visit meeting — relatedVisitId match', () => {
  const visit: PresenceSchedule = {
    id: 'v1', type: 'ward_visit', unitId: 'seoul-east-stake', seventyUid: 's1',
    date: '2026-06-01', status: 'confirmed', wardName: '교문 와드',
  }
  const stakeOk: PresenceSchedule = {
    id: 'i1', type: 'interview', unitId: 'seoul-east-stake', seventyUid: 's1',
    date: '2026-05-02', status: 'confirmed', targetKind: 'stake_president',
  }
  const scope = new Set(['seoul-east-stake'])

  it('false when a linked meeting exists before the visit', () => {
    const m: PresenceSchedule = {
      id: 'm1', type: 'meeting', unitId: 'seoul-east-stake', seventyUid: 's1',
      date: '2026-05-10', status: 'confirmed', relatedVisitId: 'v1',
    }
    expect(
      hasPendingReminders(['seoul-east-stake'], [visit, stakeOk, m], scope, 's1', new Set(), '2026-05-01'),
    ).toBe(false)
  })

  it('true when the meeting is linked to a different visit', () => {
    const m: PresenceSchedule = {
      id: 'm1', type: 'meeting', unitId: 'seoul-east-stake', seventyUid: 's1',
      date: '2026-05-10', status: 'confirmed', relatedVisitId: 'v2',
    }
    expect(
      hasPendingReminders(['seoul-east-stake'], [visit, stakeOk, m], scope, 's1', new Set(), '2026-05-01'),
    ).toBe(true)
  })

  it('true when an unlinked ward_bishop meeting for the same ward exists', () => {
    const m: PresenceSchedule = {
      id: 'm1', type: 'meeting', unitId: 'seoul-east-stake', seventyUid: 's1',
      date: '2026-05-10', status: 'confirmed', targetKind: 'ward_bishop', wardId: 'seoul-east-gyomun',
    }
    expect(
      hasPendingReminders(['seoul-east-stake'], [visit, stakeOk, m], scope, 's1', new Set(), '2026-05-01'),
    ).toBe(true)
  })

  it('true when the linked meeting is cancelled', () => {
    const m: PresenceSchedule = {
      id: 'm1', type: 'meeting', unitId: 'seoul-east-stake', seventyUid: 's1',
      date: '2026-05-10', status: 'cancelled', relatedVisitId: 'v1',
    }
    expect(
      hasPendingReminders(['seoul-east-stake'], [visit, stakeOk, m], scope, 's1', new Set(), '2026-05-01'),
    ).toBe(true)
  })

  it('false when the linked meeting sits outside the visit unit scope', () => {
    const m: PresenceSchedule = {
      id: 'm1', type: 'meeting', unitId: 'busan-stake', seventyUid: 's1',
      date: '2026-05-10', status: 'confirmed', relatedVisitId: 'v1',
    }
    expect(
      hasPendingReminders(['seoul-east-stake'], [visit, stakeOk, m], scope, 's1', new Set(), '2026-05-01'),
    ).toBe(false)
  })
})
