import { buildScheduleTitle, type ScheduleTitleInput } from './scheduleTitle'

const KAKAO_TITLE_MAX = 50

export interface KakaoTime {
  start_at: string
  end_at: string
  time_zone: string
}

export interface KakaoEventBody {
  title: string
  time: KakaoTime
  description?: string
}

export interface KakaoScheduleInput extends ScheduleTitleInput {
  date: string
  startTime: string
  endTime: string
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
  seventyName?: string
  zoomLink?: string | null
  notes?: string | null
}): string | undefined {
  const lines: string[] = []
  if (p.seventyName?.trim()) lines.push(`담당 칠십인: ${p.seventyName.trim()}`)
  const zoom = p.zoomLink?.trim()
  if (zoom) lines.push(`줌: ${zoom}`)
  const notes = p.notes?.trim()
  if (notes) lines.push(notes)
  return lines.length ? lines.join('\n') : undefined
}

export function buildKakaoEventBody(p: {
  schedule: KakaoScheduleInput
  seventyName?: string
}): KakaoEventBody {
  const { schedule, seventyName } = p
  const description = buildKakaoDescription({
    seventyName,
    zoomLink: schedule.zoomLink,
    notes: schedule.notes,
  })
  return {
    title: truncateTitle(buildScheduleTitle(schedule)),
    time: {
      start_at: toKakaoTime(schedule.date, schedule.startTime),
      end_at: toKakaoTime(schedule.date, schedule.endTime),
      time_zone: 'Asia/Seoul',
    },
    ...(description ? { description } : {}),
  }
}

// calendarSync.ts의 needsUpdate 블록과 같은 목록. 두 동기화가 같은 입력에서
// 본문을 만드므로 갱신 조건도 같아야 한다.
const SYNCED_FIELDS = [
  'date',
  'startTime',
  'endTime',
  'zoomLink',
  'customTitle',
  'unitId',
  'wardName',
  'notes',
] as const

// unitId만 ''을 기본값으로 쓴다 — calendarSync.ts의 needsUpdate 블록이
// (before?.unitId ?? '') !== (after.unitId ?? '')로 비교하기 때문에, 값을
// 맞추지 않으면 두 동기화가 같은 변경을 서로 다르게 판단할 수 있다.
const FIELD_DEFAULT: Record<(typeof SYNCED_FIELDS)[number], unknown> = {
  date: null,
  startTime: null,
  endTime: null,
  zoomLink: null,
  customTitle: null,
  unitId: '',
  wardName: null,
  notes: null,
}

export function needsKakaoUpdate(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown>,
): boolean {
  if (!before) return true
  return SYNCED_FIELDS.some((f) => (before[f] ?? FIELD_DEFAULT[f]) !== (after[f] ?? FIELD_DEFAULT[f]))
}
