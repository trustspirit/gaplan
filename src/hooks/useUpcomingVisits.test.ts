import { describe, it, expect } from 'vitest'
import type { Schedule } from '@/types'
import { selectUpcomingVisits } from './useUpcomingVisits'

function sched(p: Partial<Schedule>): Schedule {
  return {
    id: 'x', type: 'ward_visit', seventyUid: 's1', unitId: 'seoul-stake',
    presidentUid: null, date: '2026-06-01', startTime: '10:00', endTime: '12:00',
    status: 'confirmed', createdBy: 'admin', ...p,
  }
}

describe('selectUpcomingVisits', () => {
  it('keeps confirmed ward visits on or after fromDate, nearest first', () => {
    const list = [
      sched({ id: 'b', date: '2026-06-10', wardName: '신촌 와드' }),
      sched({ id: 'a', date: '2026-06-01', wardName: '교문 와드' }),
    ]
    expect(selectUpcomingVisits(list, 's1', '2026-05-01').map(v => v.id)).toEqual(['a', 'b'])
  })

  it('includes a visit on fromDate itself', () => {
    const list = [sched({ id: 'a', date: '2026-05-01', wardName: '교문 와드' })]
    expect(selectUpcomingVisits(list, 's1', '2026-05-01')).toHaveLength(1)
  })

  it('drops visits before fromDate', () => {
    const list = [sched({ id: 'a', date: '2026-04-30', wardName: '교문 와드' })]
    expect(selectUpcomingVisits(list, 's1', '2026-05-01')).toEqual([])
  })

  it('drops other seventies visits', () => {
    const list = [sched({ id: 'a', seventyUid: 's2', wardName: '교문 와드' })]
    expect(selectUpcomingVisits(list, 's1', '2026-05-01')).toEqual([])
  })

  it('drops cancelled visits and non-visit types', () => {
    const list = [
      sched({ id: 'a', status: 'cancelled', wardName: '교문 와드' }),
      sched({ id: 'b', type: 'meeting' }),
    ]
    expect(selectUpcomingVisits(list, 's1', '2026-05-01')).toEqual([])
  })

  it('falls back to an empty ward name when the visit has none', () => {
    const list = [sched({ id: 'a', wardName: undefined })]
    expect(selectUpcomingVisits(list, 's1', '2026-05-01')[0].wardName).toBe('')
  })
})
