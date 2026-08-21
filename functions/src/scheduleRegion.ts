import { UNIT_REGION_MAP } from './unitRegionMap'

export interface ScheduleRegionInput {
  /**
   * CC 협의 평의회(targetKind: 'cc_council')만 채운다. 그 모임은 특정 스테이크가
   * 아니라 CC 전체가 대상이라 adminCreateSchedule이 unitId를 비우고 CC를 여기 담는다.
   * 나머지 종류에서는 null이다.
   */
  regionId?: string | null
  unitId?: string | null
}

/**
 * 일정이 어느 지역 캘린더로 가야 하는가.
 *
 * 일정이 스스로 밝힌 지역이 가장 강하다. CCM은 unitId가 비어 있어 유닛 매핑으로는
 * 답이 나오지 않고, 담당 칠십인으로 떨어지면 그 칠십인의 **주** 지역으로 간다 —
 * 두 지역을 함께 담당하는 칠십인의 부산 CC 모임이 서울 캘린더로 가던 버그가 그것이다.
 *
 * calendarSync와 manualCalendarSync가 이 함수를 함께 쓴다. 두 경로가 같은 일정을
 * 서로 다른 캘린더로 보내면 어느 쪽이 맞는지 알 수 없게 된다.
 */
export function resolveScheduleRegionId(
  schedule: ScheduleRegionInput,
  seventyRegionId?: string | null,
): string {
  return (
    schedule.regionId ||
    UNIT_REGION_MAP[schedule.unitId ?? ''] ||
    seventyRegionId ||
    ''
  )
}
