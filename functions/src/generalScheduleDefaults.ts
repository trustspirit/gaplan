/**
 * 행사(generalSchedules)의 시간 기본값. import가 하나도 없다 — `scheduleRules.ts`와 같은 방식으로
 * CF와 브라우저 양쪽에서 쓸 수 있게.
 *
 * 행사는 schedules와 달리 startTime/endTime이 **선택**이다. 시작만 있고 종료가 없는 문서가
 * 실제로 존재하는데, 그대로 내보내면 구글 캘린더에는 길이 0짜리 이벤트가, ICS에는 DTEND가 없는
 * VEVENT가 나간다. 둘 다 클라이언트마다 다르게 그려져 깨져 보인다.
 *
 * 기본 길이 120분은 폼이 행사에 자동으로 채우는 값과 같다
 * (`src/components/domain/scheduleForm/scheduleTimeRules.ts`의 `general_schedule`).
 * 캘린더가 앱과 다른 길이를 보이면 안 되므로 두 값은 함께 움직여야 한다. CF는 `src/`를
 * import할 수 없어(의존 방향이 반대다) 여기 한 번 더 적는다.
 */
export const GENERAL_SCHEDULE_DEFAULT_DURATION_MINUTES = 120

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

function toMinutes(value: string): number | null {
  const m = HHMM.exec(value)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

function toHHMM(totalMinutes: number): string {
  const clamped = Math.min(totalMinutes, 23 * 60 + 59)
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

/**
 * 시작 시각에 대한 종료 시각을 정한다.
 * 이미 시작보다 뒤인 종료가 있으면 그대로 쓰고, 없거나 시작보다 이르면(깨진 데이터)
 * 기본 길이를 더한다. 자정을 넘기면 23:59로 자른다 — 행사는 종료 **날짜**를 따로 갖는다.
 */
export function resolveGeneralScheduleEndTime(startTime: string, endTime?: string): string {
  const start = toMinutes(startTime)
  if (start === null) return endTime ?? startTime

  const end = endTime ? toMinutes(endTime) : null
  if (end !== null && end > start) return endTime as string

  return toHHMM(start + GENERAL_SCHEDULE_DEFAULT_DURATION_MINUTES)
}

/**
 * 시간이 지정된 행사의 종료 지점(날짜 + 시각)을 정한다.
 *
 * 하루짜리에서는 `resolveGeneralScheduleEndTime`의 규칙이 그대로 적용되지만, 여러 날에
 * 걸친 행사는 **시각만 비교하면 안 된다** — 9/3 19:00 시작해서 9/4 09:00에 끝나는 수련회는
 * 09:00 < 19:00이어도 깨진 데이터가 아니다.
 */
export function resolveGeneralScheduleEnd(
  date: string,
  startTime: string,
  endDate?: string,
  endTime?: string,
): { date: string; time: string } {
  const lastDay = endDate && endDate > date ? endDate : date
  if (lastDay !== date) {
    // 날짜가 이미 뒤이므로 시각은 있는 그대로 쓴다. 없으면 기본 길이를 적용한다.
    return { date: lastDay, time: endTime ?? resolveGeneralScheduleEndTime(startTime) }
  }
  return { date, time: resolveGeneralScheduleEndTime(startTime, endTime) }
}
