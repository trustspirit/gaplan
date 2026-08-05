import { describe, it, expect } from 'vitest'
import { validateRelatedVisit } from './relatedVisit'

const base = {
  scheduleType: 'meeting',
  scheduleSeventyUid: 's1',
  scheduleDate: '2026-05-10',
}
const visit = { type: 'ward_visit', seventyUid: 's1', date: '2026-06-01' }

describe('validateRelatedVisit', () => {
  it('accepts a meeting linked to the seventy\'s own future visit', () => {
    expect(validateRelatedVisit({ ...base, visit })).toBeNull()
  })

  it('accepts an interview as a pre-visit meeting', () => {
    expect(validateRelatedVisit({ ...base, scheduleType: 'interview', visit })).toBeNull()
  })

  it('accepts a meeting on the same day as the visit', () => {
    expect(validateRelatedVisit({ ...base, scheduleDate: '2026-06-01', visit })).toBeNull()
  })

  it('rejects relatedVisitId on a ward_visit', () => {
    expect(validateRelatedVisit({ ...base, scheduleType: 'ward_visit', visit }))
      .toBe('relatedVisitId is only for interview/meeting')
  })

  it('rejects a missing visit document', () => {
    expect(validateRelatedVisit({ ...base, visit: null }))
      .toBe('relatedVisitId does not point to an existing schedule')
  })

  it('rejects a target that is not a ward_visit', () => {
    expect(validateRelatedVisit({ ...base, visit: { ...visit, type: 'meeting' } }))
      .toBe('relatedVisitId must point to a ward_visit')
  })

  it('rejects a visit belonging to another seventy', () => {
    expect(validateRelatedVisit({ ...base, visit: { ...visit, seventyUid: 's2' } }))
      .toBe('relatedVisitId must point to a visit of the same seventy')
  })

  it('rejects a meeting scheduled after the visit', () => {
    expect(validateRelatedVisit({ ...base, scheduleDate: '2026-06-02', visit }))
      .toBe('A pre-visit meeting must not be later than the visit date')
  })
})
