import { describe, it, expect } from 'vitest'
import type { Schedule } from '@/types'
import { selectGlanceSchedules, splitNextUp } from './glance'

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

// 홈 맨 위의 「다음 일정」 카드 — 목록에서 그 한 건을 빼내 위에 크게 올린다.
// 같은 일정이 두 곳에 보이지 않게 하는 게 이 분리의 요점이다.
describe('splitNextUp', () => {
  const at = (id: string, date: string, startTime: string, endTime: string): Schedule => ({
    id, type: 'meeting', seventyUid: 's', unitId: 'u', presidentUid: null,
    date, startTime, endTime, status: 'confirmed', createdBy: 'a',
  })

  it('빈 목록이면 next는 null이고 rest도 비어 있다', () => {
    expect(splitNextUp([], '2026-07-02T09:00')).toEqual({ next: null, rest: [] })
  })

  it('첫 건을 next로 빼고 나머지를 rest로 남긴다', () => {
    const list = [at('a', '2026-07-03', '10:00', '11:00'), at('b', '2026-07-04', '09:00', '10:00')]
    const { next, rest } = splitNextUp(list, '2026-07-02T09:00')
    expect(next?.id).toBe('a')
    expect(rest.map(x => x.id)).toEqual(['b'])
  })

  // 오후 2시 접견 중에 홈을 열면 그 접견이 떠야 한다 — 이미 시작했다고 다음 것으로
  // 넘어가면 "지금 뭘 하고 있는가"를 화면이 놓친다.
  it('이미 시작했지만 아직 안 끝난 일정이 있으면 그게 next다', () => {
    const list = [at('now', '2026-07-02', '14:00', '15:00'), at('later', '2026-07-02', '16:00', '17:00')]
    const { next, rest } = splitNextUp(list, '2026-07-02T14:30')
    expect(next?.id).toBe('now')
    expect(rest.map(x => x.id)).toEqual(['later'])
  })

  // 오늘 이미 끝난 일정은 카드로는 안 올라가지만 목록에는 남는다 — 오늘 하루를
  // 훑을 때 끝난 일정도 보여야 하고, ScheduleItem이 「완료」 배지로 이미 구분한다.
  it('끝난 일정은 next가 되지 않고 목록에 남는다', () => {
    const list = [at('done', '2026-07-02', '09:00', '10:00'), at('next', '2026-07-02', '16:00', '17:00')]
    const { next, rest } = splitNextUp(list, '2026-07-02T10:30')
    expect(next?.id).toBe('next')
    expect(rest.map(x => x.id)).toEqual(['done'])
  })

  it('호출자가 넘긴 목록의 순서를 신뢰한다 — 정렬은 selectGlanceSchedules의 몫이다', () => {
    const list = [at('first', '2026-07-05', '10:00', '11:00'), at('second', '2026-07-03', '10:00', '11:00')]
    expect(splitNextUp(list, '2026-07-02T09:00').next?.id).toBe('first')
  })
})
