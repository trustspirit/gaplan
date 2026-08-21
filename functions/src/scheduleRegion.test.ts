import { describe, it, expect } from 'vitest'
import { resolveScheduleRegionId } from './scheduleRegion'

describe('resolveScheduleRegionId', () => {
  it('maps a schedule with a unit to that unit’s region', () => {
    expect(resolveScheduleRegionId({ unitId: 'busan-stake' })).toBe('busan')
  })

  // CC 협의 평의회는 특정 스테이크가 아니라 CC 전체가 대상이라, adminCreateSchedule이
  // unitId를 비우고 CC를 regionId에 담는다. 그 regionId가 곧 캘린더의 지역이다.
  it('sends a cc council meeting to the region it names', () => {
    expect(resolveScheduleRegionId({ unitId: '', regionId: 'busan' })).toBe('busan')
  })

  // 이 버그의 핵심. 담당 칠십인의 주 지역이 CC와 다르면 모임이 엉뚱한 캘린더로 갔다.
  it('prefers the cc council’s region over the seventy’s own region', () => {
    expect(resolveScheduleRegionId({ unitId: '', regionId: 'busan' }, 'seoul')).toBe('busan')
  })

  it('falls back to the seventy’s region when the schedule names neither', () => {
    expect(resolveScheduleRegionId({ unitId: '' }, 'seoul')).toBe('seoul')
  })

  it('gives an empty region when there is nothing to go on', () => {
    expect(resolveScheduleRegionId({})).toBe('')
  })

  // 일정 문서의 regionId는 cc_council이 아니면 null이다(adminCreateSchedule).
  // null·undefined가 유닛 매핑을 가로채면 안 된다.
  it('ignores a null region on an ordinary schedule', () => {
    expect(resolveScheduleRegionId({ unitId: 'busan-stake', regionId: null }, 'seoul')).toBe('busan')
  })

  it('ignores a null seventy region', () => {
    expect(resolveScheduleRegionId({ unitId: '' }, null)).toBe('')
  })

  // 옛 문서나 손으로 고친 문서가 알 수 없는 유닛을 들고 있을 수 있다. 그때는
  // 유닛이 없는 것과 같이 다뤄 칠십인으로 떨어진다.
  it('treats an unknown unit as no unit at all', () => {
    expect(resolveScheduleRegionId({ unitId: 'no-such-stake' }, 'seoul')).toBe('seoul')
  })
})
