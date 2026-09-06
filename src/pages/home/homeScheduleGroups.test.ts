import { describe, it, expect } from 'vitest'
import type { Schedule } from '@/types'
import { groupByWhen, type WhenGroupKey } from './homeScheduleGroups'

const s = (id: string, date: string): Schedule => ({
  id, type: 'ward_visit', seventyUid: 's', unitId: 'u', presidentUid: null,
  date, startTime: '10:00', endTime: '11:00', status: 'confirmed', createdBy: 'a',
})

/** 2026-07-02는 목요일. 그 주 토요일은 07-04다. */
const THU = '2026-07-02'

function keys(groups: Map<WhenGroupKey, Schedule[]>) {
  return [...groups.keys()]
}

describe('groupByWhen', () => {
  it('오늘 / 내일 / 이번 주 / 이후 순서로 묶는다', () => {
    const out = groupByWhen(
      [s('today', THU), s('tomorrow', '2026-07-03'), s('sat', '2026-07-04'), s('later', '2026-07-20')],
      THU,
    )
    expect(keys(out)).toEqual(['today', 'tomorrow', 'thisWeek', 'later'])
    expect(out.get('today')!.map(x => x.id)).toEqual(['today'])
    expect(out.get('tomorrow')!.map(x => x.id)).toEqual(['tomorrow'])
    expect(out.get('thisWeek')!.map(x => x.id)).toEqual(['sat'])
    expect(out.get('later')!.map(x => x.id)).toEqual(['later'])
  })

  it('빈 그룹은 아예 만들지 않는다 — 제목만 있고 내용 없는 칸이 생기면 안 된다', () => {
    const out = groupByWhen([s('today', THU), s('later', '2026-08-01')], THU)
    expect(keys(out)).toEqual(['today', 'later'])
  })

  // 교회 주간은 일요일에 시작한다. 「이번 주」는 모레부터 그 주 토요일까지고,
  // 다음 일요일부터는 「이후」다 — 안 그러면 주가 바뀌는 걸 화면이 못 보여준다.
  it('이번 주는 토요일에서 끝나고 다음 일요일은 이후로 간다', () => {
    const out = groupByWhen([s('sat', '2026-07-04'), s('sun', '2026-07-05')], THU)
    expect(out.get('thisWeek')!.map(x => x.id)).toEqual(['sat'])
    expect(out.get('later')!.map(x => x.id)).toEqual(['sun'])
  })

  // 토요일에 홈을 열면 모레는 이미 다음 주다 — 이번 주 그룹은 비고, 생략된다.
  it('오늘이 토요일이면 이번 주 그룹이 생기지 않는다', () => {
    const out = groupByWhen([s('sat', '2026-07-04'), s('mon', '2026-07-06')], '2026-07-04')
    expect(keys(out)).toEqual(['today', 'later'])
  })

  it('일요일에 열면 그 주 토요일까지가 이번 주다', () => {
    const out = groupByWhen(
      [s('sun', '2026-07-05'), s('mon', '2026-07-06'), s('tue', '2026-07-07'), s('nextSun', '2026-07-12')],
      '2026-07-05',
    )
    expect(out.get('today')!.map(x => x.id)).toEqual(['sun'])
    expect(out.get('tomorrow')!.map(x => x.id)).toEqual(['mon'])
    expect(out.get('thisWeek')!.map(x => x.id)).toEqual(['tue'])
    expect(out.get('later')!.map(x => x.id)).toEqual(['nextSun'])
  })

  it('그룹 안에서는 넘겨받은 순서를 그대로 지킨다', () => {
    const out = groupByWhen([s('b', THU), s('a', THU)], THU)
    expect(out.get('today')!.map(x => x.id)).toEqual(['b', 'a'])
  })

  it('빈 목록이면 빈 Map', () => {
    expect(groupByWhen([], THU).size).toBe(0)
  })
})
