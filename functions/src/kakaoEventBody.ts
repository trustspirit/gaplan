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
  return new Date(`${date}T${time}:00+09:00`).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function truncateTitle(title: string): string {
  return title.length <= KAKAO_TITLE_MAX ? title : title.slice(0, KAKAO_TITLE_MAX)
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

// calendarSync.ts:67-75와 같은 목록. 두 동기화가 같은 입력에서 본문을 만드므로
// 갱신 조건도 같아야 한다.
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

export function needsKakaoUpdate(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown>,
): boolean {
  if (!before) return true
  return SYNCED_FIELDS.some((f) => (before[f] ?? null) !== (after[f] ?? null))
}
