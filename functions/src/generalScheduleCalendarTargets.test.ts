import { describe, it, expect } from 'vitest'
import { targetCalendarIdsFor, GENERAL_SCHEDULE_SHARED_CALENDAR_KEY } from './generalScheduleCalendarTargets'

const CALENDARS = { seoul: 'cal-seoul', busan: 'cal-busan' }

describe('targetCalendarIdsFor', () => {
  it('대상 지역이 지정되면 그 지역들의 캘린더만 돌려준다', () => {
    expect(targetCalendarIdsFor(['seoul'], CALENDARS, 'cal-shared')).toEqual({ seoul: 'cal-seoul' })
  })

  it('대상 지역이 여러 개면 각각의 캘린더를 모두 돌려준다', () => {
    expect(targetCalendarIdsFor(['seoul', 'busan'], CALENDARS, 'cal-shared')).toEqual(CALENDARS)
  })

  it('대상이 비어 있으면(조직 전체 행사) 설정된 모든 지역 캘린더를 돌려준다', () => {
    expect(targetCalendarIdsFor([], CALENDARS, 'cal-shared')).toEqual(CALENDARS)
  })

  it('대상이 undefined면 조직 전체 행사로 취급한다', () => {
    expect(targetCalendarIdsFor(undefined, CALENDARS, 'cal-shared')).toEqual(CALENDARS)
  })

  it('대상 지역에 캘린더 id가 설정돼 있지 않으면 그 지역은 조용히 건너뛴다', () => {
    expect(targetCalendarIdsFor(['seoul', 'daegu'], CALENDARS, 'cal-shared')).toEqual({ seoul: 'cal-seoul' })
  })

  it('지정한 대상 지역 전부에 캘린더가 없으면 빈 맵을 돌려준다(공유 캘린더로 폴백하지 않는다)', () => {
    expect(targetCalendarIdsFor(['daegu'], CALENDARS, 'cal-shared')).toEqual({})
  })

  it('조직 전체 행사인데 calendars가 비어 있으면 공유 캘린더 하나로 폴백한다', () => {
    expect(targetCalendarIdsFor([], {}, 'cal-shared')).toEqual({
      [GENERAL_SCHEDULE_SHARED_CALENDAR_KEY]: 'cal-shared',
    })
  })

  it('calendars도 비어 있고 공유 캘린더도 없으면 빈 맵을 돌려준다', () => {
    expect(targetCalendarIdsFor([], {}, undefined)).toEqual({})
  })
})
