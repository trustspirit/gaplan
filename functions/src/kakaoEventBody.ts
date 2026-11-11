import { buildScheduleTitle, type ScheduleTitleInput } from './scheduleTitle'
import { allDayExclusiveEndDate, isAllDaySchedule, scheduleLastDate } from './scheduleDates'

const KAKAO_TITLE_MAX = 50

export interface KakaoTime {
  start_at: string
  end_at: string
  time_zone: string
  all_day?: boolean
}

export interface KakaoEventBody {
  title: string
  time: KakaoTime
  description?: string
}

export interface KakaoScheduleInput extends ScheduleTitleInput {
  date: string
  endDate?: string | null   // 여러 날 모임의 마지막 날
  allDay?: boolean | null   // 종일 일정 — 시각 없이 날짜로 보낸다
  startTime: string
  endTime: string
  location?: string | null
  zoomLink?: string | null
  notes?: string | null
}

// schedule.date + startTime은 KST 벽시계 값이다. 카카오는 UTC ISO8601을 요구한다.
// '2026-08-09' + '10:00' → '2026-08-09T01:00:00Z'
export function toKakaoTime(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00+09:00`)
  // toISOString()은 잘못된 날짜에서 맨몸 RangeError("Invalid time value")를 던진다.
  // 그 로그만으로는 어느 값이 문제였는지 알 수 없으므로 입력을 이름과 함께 남긴다.
  if (Number.isNaN(d.getTime())) {
    throw new Error(`[kakao] invalid schedule time: date="${date}" time="${time}"`)
  }
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

// title.slice()는 UTF-16 코드 유닛 기준이라 서로게이트 쌍(이모지 등)을 반으로
// 쪼갤 수 있다. Array.from()은 코드 포인트 단위로 순회하므로 안전하다.
export function truncateTitle(title: string): string {
  const codePoints = Array.from(title)
  return codePoints.length <= KAKAO_TITLE_MAX ? title : codePoints.slice(0, KAKAO_TITLE_MAX).join('')
}

export function buildKakaoDescription(p: {
  location?: string | null
  seventyName?: string
  zoomLink?: string | null
  notes?: string | null
}): string | undefined {
  const lines: string[] = []
  const place = p.location?.trim()
  if (place) lines.push(`장소: ${place}`)
  if (p.seventyName?.trim()) lines.push(`담당 칠십인: ${p.seventyName.trim()}`)
  const zoom = p.zoomLink?.trim()
  if (zoom) lines.push(`줌: ${zoom}`)
  const notes = p.notes?.trim()
  if (notes) lines.push(notes)
  return lines.length ? lines.join('\n') : undefined
}

/**
 * 카카오 이벤트의 time.
 *
 * 종일 일정은 all_day: true와 함께 날짜의 자정(00:00:00Z)으로 보내고, 끝은 마지막 날 다음 날이다.
 * 카카오 문서의 종일 이벤트 응답 예시가 이 모양이다
 * (start_at "2022-10-27T00:00:00Z", end_at "2022-10-28T00:00:00Z", all_day true).
 * 요청 쪽 규칙은 문서에서 확인하지 못했다 — 카카오가 이 모양을 거부하면 여기를 고친다.
 */
export function kakaoEventTime(schedule: KakaoScheduleInput): KakaoTime {
  if (isAllDaySchedule(schedule)) {
    return {
      start_at: `${schedule.date}T00:00:00Z`,
      end_at: `${allDayExclusiveEndDate(schedule)}T00:00:00Z`,
      time_zone: 'Asia/Seoul',
      all_day: true,
    }
  }
  return {
    start_at: toKakaoTime(schedule.date, schedule.startTime),
    end_at: toKakaoTime(scheduleLastDate(schedule), schedule.endTime),
    time_zone: 'Asia/Seoul',
  }
}

export function buildKakaoEventBody(p: {
  schedule: KakaoScheduleInput
  seventyName?: string
}): KakaoEventBody {
  const { schedule, seventyName } = p
  const description = buildKakaoDescription({
    location: schedule.location,
    seventyName,
    zoomLink: schedule.zoomLink,
    notes: schedule.notes,
  })
  return {
    title: truncateTitle(buildScheduleTitle(schedule)),
    time: kakaoEventTime(schedule),
    ...(description ? { description } : {}),
  }
}

// calendarSync.ts의 needsUpdate 블록과 같은 목록. 두 동기화가 같은 입력에서
// 본문을 만드므로 갱신 조건도 같아야 한다.
const SYNCED_FIELDS = [
  'date',
  'endDate',
  'allDay',
  'startTime',
  'endTime',
  'zoomLink',
  'customTitle',
  'unitId',
  'wardName',
  'notes',
  'location',
] as const

// unitId만 ''을 기본값으로 쓴다 — calendarSync.ts의 needsUpdate 블록이
// (before?.unitId ?? '') !== (after.unitId ?? '')로 비교하기 때문에, 값을
// 맞추지 않으면 두 동기화가 같은 변경을 서로 다르게 판단할 수 있다.
const FIELD_DEFAULT: Record<(typeof SYNCED_FIELDS)[number], unknown> = {
  date: null,
  endDate: null,
  allDay: null,
  startTime: null,
  endTime: null,
  zoomLink: null,
  customTitle: null,
  unitId: '',
  wardName: null,
  notes: null,
  location: null,
}

export function needsKakaoUpdate(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown>,
): boolean {
  if (!before) return true
  return SYNCED_FIELDS.some((f) => (before[f] ?? FIELD_DEFAULT[f]) !== (after[f] ?? FIELD_DEFAULT[f]))
}
