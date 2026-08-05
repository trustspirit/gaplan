import { describe, it, expect } from 'vitest'
import { matchVisitForMeeting } from './backfillMatch'

const meeting = { id: 'm1', seventyUid: 's1', date: '2026-05-10', wardId: 'seoul-east-gyomun' }

describe('matchVisitForMeeting', () => {
  it('matches a visit whose wardName resolves to the meeting wardId', () => {
    const visits = [{ id: 'v1', seventyUid: 's1', date: '2026-06-01', wardName: '교문 와드' }]
    expect(matchVisitForMeeting(meeting, visits)).toBe('v1')
  })

  it('matches on the visit explicit wardId', () => {
    const visits = [{ id: 'v1', seventyUid: 's1', date: '2026-06-01', wardId: 'seoul-east-gyomun' }]
    expect(matchVisitForMeeting(meeting, visits)).toBe('v1')
  })

  it('picks the nearest visit on or after the meeting date', () => {
    const visits = [
      { id: 'far', seventyUid: 's1', date: '2026-08-01', wardName: '교문 와드' },
      { id: 'near', seventyUid: 's1', date: '2026-06-01', wardName: '교문 와드' },
    ]
    expect(matchVisitForMeeting(meeting, visits)).toBe('near')
  })

  it('ignores visits before the meeting date', () => {
    const visits = [{ id: 'v1', seventyUid: 's1', date: '2026-05-01', wardName: '교문 와드' }]
    expect(matchVisitForMeeting(meeting, visits)).toBeNull()
  })

  it('ignores visits of another seventy', () => {
    const visits = [{ id: 'v1', seventyUid: 's2', date: '2026-06-01', wardName: '교문 와드' }]
    expect(matchVisitForMeeting(meeting, visits)).toBeNull()
  })

  it('ignores visits of a different ward', () => {
    const visits = [{ id: 'v1', seventyUid: 's1', date: '2026-06-01', wardName: '신촌 와드' }]
    expect(matchVisitForMeeting(meeting, visits)).toBeNull()
  })

  it('returns null when the meeting has no wardId', () => {
    const visits = [{ id: 'v1', seventyUid: 's1', date: '2026-06-01', wardName: '교문 와드' }]
    expect(matchVisitForMeeting({ ...meeting, wardId: null }, visits)).toBeNull()
  })
})
