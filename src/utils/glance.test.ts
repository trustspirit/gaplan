import { describe, it, expect } from 'vitest'
import type { Schedule } from '@/types'
import { selectGlanceSchedules } from './glance'

const s = (id: string, date: string, status: Schedule['status'] = 'confirmed'): Schedule => ({
  id, type: 'ward_visit', seventyUid: 's', unitId: 'u', presidentUid: null,
  date, startTime: '10:00', endTime: '11:00', status, createdBy: 'a',
})
const today = '2026-07-02'

describe('selectGlanceSchedules', () => {
  it('과거/취소 일정을 제외하고 날짜순 정렬', () => {
    const out = selectGlanceSchedules(
      [s('past', '2026-07-01'), s('cancel', '2026-07-05', 'cancelled'), s('a', '2026-07-04'), s('b', '2026-07-03')],
      today,
    )
    expect(out.map(x => x.id)).toEqual(['b', 'a'])
  })
  it('14일 내 3건 이상이면 그 범위 전부', () => {
    const out = selectGlanceSchedules(
      [s('a', '2026-07-03'), s('b', '2026-07-05'), s('c', '2026-07-10'), s('far', '2026-08-30')],
      today,
    )
    expect(out.map(x => x.id)).toEqual(['a', 'b', 'c'])
  })
  it('14일 내 3건 미만이면 이후 일정으로 최대 5건까지 채움', () => {
    const out = selectGlanceSchedules(
      [s('a', '2026-07-03'), s('b', '2026-08-01'), s('c', '2026-08-05'), s('d', '2026-08-10'), s('e', '2026-09-01'), s('f', '2026-10-01')],
      today,
    )
    expect(out.map(x => x.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})
