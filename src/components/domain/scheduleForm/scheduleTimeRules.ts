import type { ScheduleType } from '@/types'

/** 일정 3종 + 행사(generalSchedules). 행사는 ScheduleType이 아니라 별도 키다. */
export type SchedulableKind = ScheduleType | 'general_schedule'

/**
 * 시작 시간을 고르면 종료 시간을 자동으로 채울 때 쓰는 종류별 기본 텀(분).
 * 접견(interview)은 사용자 요청에 없었다 — 개인 면담이므로 60분으로 정했다(사용자 승인됨).
 */
export const DEFAULT_DURATION_MINUTES: Record<SchedulableKind, number> = {
  ward_visit: 120,
  interview: 60,
  meeting: 60,
  general_attendance: 120,
  general_schedule: 120,
}

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function parseHHMM(value: string): number | null {
  const match = HHMM_PATTERN.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function formatMinutes(totalMinutes: number): string {
  const clamped = Math.min(totalMinutes, 23 * 60 + 59)
  const hours = Math.floor(clamped / 60)
  const minutes = clamped % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * 시작 시간이 바뀔 때 다음 종료 시간을 계산한다.
 *
 * 규칙(이 순서대로 판정):
 * 1. nextStart가 비었거나 HH:MM 형식이 아니면 → previousEnd를 그대로 돌려준다.
 * 2. previousStart와 previousEnd가 둘 다 유효한 HH:MM이고 previousEnd > previousStart이면
 *    → 그 간격을 보존한다: nextEnd = nextStart + (previousEnd - previousStart).
 * 3. 그렇지 않으면 → nextEnd = nextStart + defaultMinutes.
 * 4. 위에서 구한 값이 자정을 넘으면(24:00 이상) → '23:59'로 자른다.
 *
 * 간격 보존이 핵심이다. 사용자가 종료를 직접 고쳐놓고 나중에 시작을 옮기면 그 간격이
 * 살아남아야 한다 — userTouchedEnd 같은 상태 플래그 없이 이전 시작·종료 값만으로 판정한다.
 */
export function nextEndTime(params: {
  nextStart: string
  previousStart: string
  previousEnd: string
  defaultMinutes: number
}): string {
  const { nextStart, previousStart, previousEnd, defaultMinutes } = params

  const nextStartMinutes = parseHHMM(nextStart)
  if (nextStartMinutes === null) return previousEnd

  const previousStartMinutes = parseHHMM(previousStart)
  const previousEndMinutes = parseHHMM(previousEnd)

  const durationMinutes =
    previousStartMinutes !== null &&
    previousEndMinutes !== null &&
    previousEndMinutes > previousStartMinutes
      ? previousEndMinutes - previousStartMinutes
      : defaultMinutes

  return formatMinutes(nextStartMinutes + durationMinutes)
}
