import { describe, it, expect } from 'vitest'
import type { Schedule } from '@/types'
import { useSchedulePageData } from './useSchedulePageData'

const s = (id: string, type: Schedule['type'], date: string): Schedule => ({
  id, type, seventyUid: 's', unitId: 'u', presidentUid: null,
  date, startTime: '10:00', endTime: '11:00', status: 'confirmed', createdBy: 'a',
})

describe('useSchedulePageData (multi-type)', () => {
  it('배열의 모든 타입을 집계한다', () => {
    const data = useSchedulePageData(
      [s('i', 'interview', '2999-01-01'), s('m', 'meeting', '2999-01-02'), s('v', 'ward_visit', '2999-01-03')],
      ['interview', 'meeting'],
      'all',
    )
    expect(data.upcomingCount).toBe(2)
    const ids = data.orderedKeys.flatMap(k => data.grouped.get(k)!.map(x => x.id))
    expect(ids.sort()).toEqual(['i', 'm'])
  })
})
