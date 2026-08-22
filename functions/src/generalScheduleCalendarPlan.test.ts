import { describe, it, expect } from 'vitest'
import { planGeneralScheduleCalendarSync } from './generalScheduleCalendarPlan'

describe('planGeneralScheduleCalendarSync', () => {
  it('공개로 생성됨: 기존 이벤트가 없으면 대상 전부를 insert한다', () => {
    const plan = planGeneralScheduleCalendarSync({ seoul: 'cal-seoul', busan: 'cal-busan' }, {})
    expect(plan.toInsert.sort()).toEqual(['busan', 'seoul'])
    expect(plan.toUpdate).toEqual([])
    expect(plan.toDelete).toEqual([])
  })

  it('내용만 변경(대상 동일): 이미 있는 이벤트는 전부 update한다', () => {
    const plan = planGeneralScheduleCalendarSync(
      { seoul: 'cal-seoul' },
      { seoul: 'event-1' },
    )
    expect(plan.toInsert).toEqual([])
    expect(plan.toUpdate).toEqual(['seoul'])
    expect(plan.toDelete).toEqual([])
  })

  it('대상 CC가 바뀜: 빠진 지역은 delete, 새로 들어온 지역은 insert, 유지된 지역은 update', () => {
    const plan = planGeneralScheduleCalendarSync(
      { seoul: 'cal-seoul', daegu: 'cal-daegu' },
      { seoul: 'event-seoul', busan: 'event-busan' },
    )
    expect(plan.toInsert).toEqual(['daegu'])
    expect(plan.toUpdate).toEqual(['seoul'])
    expect(plan.toDelete).toEqual(['busan'])
  })

  it('isPublic이 false로 바뀜: desired가 비어 있으면 기존 이벤트 전부 delete', () => {
    const plan = planGeneralScheduleCalendarSync({}, { seoul: 'event-1', busan: 'event-2' })
    expect(plan.toInsert).toEqual([])
    expect(plan.toUpdate).toEqual([])
    expect(plan.toDelete.sort()).toEqual(['busan', 'seoul'])
  })

  it('문서 삭제: desired와 existing 둘 다 비어 있으면 아무 것도 하지 않는다', () => {
    const plan = planGeneralScheduleCalendarSync({}, {})
    expect(plan).toEqual({ toInsert: [], toUpdate: [], toDelete: [] })
  })
})
