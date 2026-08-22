/**
 * 행사(generalSchedules) 한 건이 어느 구글 캘린더(들)에 들어가야 하는지 고르는 순수 규칙.
 *
 * `generalScheduleScope.ts`의 `generalScheduleInScope`와 헷갈리기 쉽지만 다른 질문에 답한다.
 * 그쪽은 "한 CC의 공개 페이지에 이 행사가 실려야 하는가"(regionId + 그 CC의 unit 목록 기준)이고,
 * 이쪽은 "전체 설정 중 어느 캘린더들에 이벤트를 만들어야 하는가"다. 캘린더는 지역(region) 단위로만
 * 설정돼 있어(`settings/calendar`의 `calendars: Record<regionId, calendarId>`) targetUnitIds는
 * 애초에 캘린더 선택에 관여하지 않는다 — 참고할 "유닛 캘린더"라는 것 자체가 없다. 그래서 이 함수는
 * `generalScheduleInScope`를 재사용하지 않고 별도로 둔다.
 */

// 조직 전체 행사인데 지역별 캘린더가 하나도 설정돼 있지 않을 때, 공유 캘린더 하나로 폴백한 이벤트를
// `googleCalendarEventIds` 맵에 어떤 키로 저장할지 — 실제 regionId가 아니므로 충돌하지 않는 고정 키.
export const GENERAL_SCHEDULE_SHARED_CALENDAR_KEY = 'shared'

export function targetCalendarIdsFor(
  targetRegionIds: string[] | undefined,
  calendars: Record<string, string>,
  sharedCalendarId: string | undefined,
): Record<string, string> {
  if (targetRegionIds?.length) {
    // 특정 CC들을 지정한 행사: 그 지역들 중 캘린더가 설정된 것만 넣는다. 설정 안 된 지역은
    // 조용히 건너뛴다 — 폴백하지 않는다(폴백은 "조직 전체 행사" 전용 규칙이다).
    const result: Record<string, string> = {}
    for (const regionId of targetRegionIds) {
      const calendarId = calendars[regionId]
      if (calendarId) result[regionId] = calendarId
    }
    return result
  }

  // 대상이 없으면(빈 배열 또는 undefined) 조직 전체 행사 — 모두가 봐야 하므로 설정된 모든 지역
  // 캘린더에 넣는다. 지역 캘린더가 하나도 없으면 공유 캘린더 하나에라도 넣는다.
  if (Object.keys(calendars).length) return { ...calendars }
  if (sharedCalendarId) return { [GENERAL_SCHEDULE_SHARED_CALENDAR_KEY]: sharedCalendarId }
  return {}
}
