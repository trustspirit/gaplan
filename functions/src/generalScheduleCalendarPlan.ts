/**
 * 행사(generalSchedules) 한 건의 캘린더 이벤트를 어느 지역(키)에서 insert/update/delete해야
 * 하는지 결정하는 순수 함수. 브리프의 상태-전이 표(생성/변경, 내용만 변경, 대상 CC 변경,
 * 비공개 전환, 문서 삭제)를 전부 "원하는 상태(desired) vs 이미 있는 상태(existing)의 집합 차이"
 * 하나로 환원한다 — 다섯 행 각각을 따로 분기할 필요가 없다.
 *
 * - desiredCalendarIds: 지금 이 write 이후 있어야 하는 이벤트들 (`targetCalendarIdsFor`의 결과).
 *   isPublic이 false이거나 문서가 삭제됐으면 호출부가 빈 객체 `{}`를 넘긴다.
 * - existingEventIds: write 이전에 이미 있던 이벤트들 (`before.googleCalendarEventIds`).
 */
export interface GeneralScheduleCalendarSyncPlan {
  toInsert: string[]
  toUpdate: string[]
  toDelete: string[]
}

export function planGeneralScheduleCalendarSync(
  desiredCalendarIds: Record<string, string>,
  existingEventIds: Record<string, string>,
): GeneralScheduleCalendarSyncPlan {
  const toInsert: string[] = []
  const toUpdate: string[] = []
  const toDelete: string[] = []

  for (const key of Object.keys(desiredCalendarIds)) {
    if (existingEventIds[key]) toUpdate.push(key)
    else toInsert.push(key)
  }

  for (const key of Object.keys(existingEventIds)) {
    if (!desiredCalendarIds[key]) toDelete.push(key)
  }

  return { toInsert, toUpdate, toDelete }
}
