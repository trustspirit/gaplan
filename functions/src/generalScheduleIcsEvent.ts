/**
 * generalSchedules(행사) 한 건을 ICS VEVENT 텍스트로 만드는 순수 함수.
 *
 * `publicScheduleIcs.ts`의 기존 VEVENT 생성(schedules용)과 나란히 쓰인다. schedules와 달리
 * 행사는 startTime/endTime이 없을 수 있어(스테이크 대회처럼 하루 종일인 경우) 종일(all-day)
 * 표현이 필요하다 — 기존 `toIcsDateTime`은 시간이 있다고 가정해서 재사용할 수 없다.
 *
 * 같은 폴더의 무의존 모듈 하나만 import한다 — `scheduleRules.ts`와 같은 방식으로 CF와
 * 브라우저 양쪽에서 쓸 수 있는 성질은 그대로다.
 */
import { resolveGeneralScheduleEndTime } from './generalScheduleDefaults'

export interface GeneralScheduleForIcs {
  id: string
  title: string
  date: string       // YYYY-MM-DD
  startTime?: string // HH:mm
  endTime?: string   // HH:mm
}

function escapeIcs(str: string): string {
  return str.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
}

function toIcsDateTime(date: string, time: string): string {
  const [y, mo, d] = date.split('-')
  const [h, mi] = time.split(':')
  return `${y}${mo}${d}T${h}${mi}00`
}

function toIcsDate(date: string): string {
  return date.replace(/-/g, '')
}

/**
 * @param gs 행사 정보. `id`에는 `general-` 접두사를 붙이지 않는다 — schedules의
 *   VEVENT(`${id}@gaplan`)와 UID가 충돌하지 않도록 이 함수가 붙인다.
 * @param dtstamp 캘린더가 이 VEVENT를 만든 시각(`nowDtStamp()` 결과를 그대로 넘긴다).
 */
export function buildGeneralScheduleVEvent(gs: GeneralScheduleForIcs, dtstamp: string): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:general-${gs.id}@gaplan`,
    `DTSTAMP:${dtstamp}`,
  ]

  if (gs.startTime) {
    lines.push(`DTSTART;TZID=Asia/Seoul:${toIcsDateTime(gs.date, gs.startTime)}`)
    // DTEND를 빼면 RFC 5545상 길이 0인 이벤트가 되고, 클라이언트마다 다르게 그려진다.
    // 종료 시각이 없으면 폼이 자동으로 채우는 것과 같은 기본 길이를 쓴다.
    lines.push(
      `DTEND;TZID=Asia/Seoul:${toIcsDateTime(gs.date, resolveGeneralScheduleEndTime(gs.startTime, gs.endTime))}`,
    )
  } else {
    // 종일 이벤트: DTEND를 생략하면 RFC5545 기본 규칙에 따라 하루짜리로 해석된다.
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(gs.date)}`)
  }

  lines.push(`SUMMARY:${escapeIcs(gs.title)}`)
  lines.push('END:VEVENT')

  return lines.join('\r\n')
}
