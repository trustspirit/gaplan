import dayjs from 'dayjs'
import { getUnitsByRegion, getWardsByUnit } from '@/constants/regions'
import type {
  VisitRecommendation,
  VisitRequestDecision,
  VisitRequestUnit,
} from '@/types'

/** 공개 추천 링크의 경로. 라우터와 공유 버튼이 같은 문자열을 쓴다. */
export const RECOMMEND_PATH_PREFIX = '/recommend/'

/**
 * 요청 id와 토큰을 둘 다 싣는다. CF는 id로 문서를 집고 토큰을 비교한다 — 토큰만으로 찾으면
 * 같은 토큰의 요청을 하나 더 만들어 링크를 가로챌 수 있다.
 */
export function recommendUrl(
  requestId: string,
  token: string,
  origin: string = window.location.origin,
): string {
  return `${origin}${RECOMMEND_PATH_PREFIX}${requestId}/${token}`
}

/**
 * 오늘 다음부터 count개의 일요일(YYYY-MM-DD). 오늘이 일요일이면 오늘은 뺀다 —
 * 당일 방문을 추천받을 수는 없다.
 */
export function upcomingSundays(count: number, today: dayjs.Dayjs = dayjs()): string[] {
  const daysToSunday = (7 - today.day()) % 7 || 7
  const first = today.startOf('day').add(daysToSunday, 'day')
  return Array.from({ length: count }, (_, i) => first.add(i * 7, 'day').format('YYYY-MM-DD'))
}

/**
 * 칠십인 담당 CC들의 스테이크/지방부와 와드를 요청 문서에 찍어 둘 형태로 만든다.
 * 와드가 없는 단위는 추천할 거리가 없으니 뺀다.
 */
export function unitsSnapshotForRegions(regionIds: string[]): VisitRequestUnit[] {
  return regionIds.flatMap((regionId) =>
    getUnitsByRegion(regionId)
      .map((unit) => ({
        id: unit.id,
        ko: unit.name.ko,
        en: unit.name.en,
        regionId,
        wards: getWardsByUnit(unit.id).map((w) => ({ id: w.id, ko: w.name.ko, en: w.name.en })),
      }))
      .filter((unit) => unit.wards.length > 0),
  )
}

export interface SundayCandidate {
  unitId: string
  wardId: string
  wardName: string
  submitterName: string
  note: string
  submittedAt: string
}

/** 한 일요일에 들어온 추천들. 스테이크마다 일요일 하나에 와드 하나뿐이라 겹치지 않는다. */
export function candidatesForSunday(
  recommendations: VisitRecommendation[],
  date: string,
): SundayCandidate[] {
  return recommendations.flatMap((rec) =>
    rec.picks
      .filter((p) => p.date === date)
      .map((p) => ({
        unitId: rec.unitId,
        wardId: p.wardId,
        wardName: p.wardName,
        submitterName: rec.submitterName,
        note: rec.note ?? '',
        submittedAt: rec.submittedAt,
      })),
  )
}

/**
 * 칠십인 확정 화면에서 한 일요일의 후보를 어떤 순서로 보여 줄지.
 *
 * 기본 규칙: 이 요청에서 이미 확정된 방문이 적은 스테이크를 위로(한 스테이크에 방문이
 * 몰리지 않게), 같으면 먼저 낸 추천을 위로. 정렬은 제안일 뿐 — 칠십인은 어느 후보든 고를 수 있다.
 */
export function rankCandidates(
  candidates: SundayCandidate[],
  decisions: Record<string, VisitRequestDecision>,
): SundayCandidate[] {
  const decidedPerUnit = new Map<string, number>()
  for (const d of Object.values(decisions)) {
    decidedPerUnit.set(d.unitId, (decidedPerUnit.get(d.unitId) ?? 0) + 1)
  }
  return [...candidates].sort(
    (a, b) =>
      (decidedPerUnit.get(a.unitId) ?? 0) - (decidedPerUnit.get(b.unitId) ?? 0) ||
      a.submittedAt.localeCompare(b.submittedAt),
  )
}

export interface RequestProgress {
  respondedUnits: number
  totalUnits: number
  decidedSundays: number
  totalSundays: number
}

export function requestProgress(
  request: { units: { id: string }[]; sundays: string[]; decisions?: Record<string, unknown> },
  recommendations: { unitId: string }[],
): RequestProgress {
  const unitIds = new Set(request.units.map((u) => u.id))
  const responded = new Set(recommendations.map((r) => r.unitId).filter((id) => unitIds.has(id)))
  const decided = request.sundays.filter((d) => request.decisions?.[d]).length
  return {
    respondedUnits: responded.size,
    totalUnits: unitIds.size,
    decidedSundays: decided,
    totalSundays: request.sundays.length,
  }
}

export type RecencyTone = 'fresh' | 'aging' | 'stale' | 'never'

/**
 * 와드 방문 기록을 회장이 읽을 말로 줄인다. 구간은 통계 화면의 severityOf와 같다
 * (60일 이내 · 120일 이내 · 그 이상) — 두 화면이 같은 와드를 다른 색으로 그리면 안 된다.
 */
export function wardRecency(
  stat: { lastVisit: string | null } | undefined,
  today: string,
): { tone: RecencyTone; daysSince: number | null; monthsSince: number | null } {
  if (!stat?.lastVisit) return { tone: 'never', daysSince: null, monthsSince: null }
  const daysSince = dayjs(today).diff(dayjs(stat.lastVisit), 'day')
  const monthsSince = dayjs(today).diff(dayjs(stat.lastVisit), 'month')
  const tone: RecencyTone = daysSince <= 60 ? 'fresh' : daysSince <= 120 ? 'aging' : 'stale'
  return { tone, daysSince, monthsSince }
}

/** 회장들에게 강조할 말의 길이 제한 — firestore.rules의 guidance 제한과 같다 */
export const GUIDANCE_MAX = 500

/** 강조 사항으로 자주 쓰는 문장(i18n 키). 첫 문장이 새 요청의 기본값이다. */
export const GUIDANCE_PRESET_KEYS = [
  'visitRequest.guidancePreset.longUnvisited',
  'visitRequest.guidancePreset.ministry',
  'visitRequest.guidancePreset.newBishop',
] as const

/** 방문 계획은 보통 분기 단위다. 분기는 1~4 */
export interface Quarter {
  year: number
  q: number
}

export function quarterOf(day: dayjs.Dayjs): Quarter {
  return { year: day.year(), q: Math.floor(day.month() / 3) + 1 }
}

export function quarterKey({ year, q }: Quarter): string {
  return `${year}-Q${q}`
}

/**
 * 고를 수 있는 분기들: 이번 분기부터 count개. 이번 분기에 남은 일요일이 없으면(마지막 주) 다음 분기부터.
 */
export function upcomingQuarters(count: number, today: dayjs.Dayjs = dayjs()): Quarter[] {
  const out: Quarter[] = []
  let { year, q } = quarterOf(today)
  if (quarterSundays({ year, q }, today).length === 0) {
    q += 1
    if (q > 4) [year, q] = [year + 1, 1]
  }
  while (out.length < count) {
    out.push({ year, q })
    q += 1
    if (q > 4) [year, q] = [year + 1, 1]
  }
  return out
}

/** 주어진 날짜들이 든 달의 모든 일요일(YYYY-MM-DD, 오름차순, 중복 없음) */
export function monthSundays(dates: string[]): string[] {
  const months = [...new Set(dates.map((d) => d.slice(0, 7)))].sort()
  return months.flatMap((m) => {
    const start = dayjs(`${m}-01`)
    const end = start.add(1, 'month')
    const out: string[] = []
    for (let d = start.add((7 - start.day()) % 7, 'day'); d.isBefore(end); d = d.add(7, 'day')) {
      out.push(d.format('YYYY-MM-DD'))
    }
    return out
  })
}

/** 그 분기의 일요일 중 오늘 뒤의 것(YYYY-MM-DD, 오름차순) */
export function quarterSundays({ year, q }: Quarter, today: dayjs.Dayjs = dayjs()): string[] {
  const start = dayjs(new Date(year, (q - 1) * 3, 1))
  const end = start.add(3, 'month')
  let d = start.add((7 - start.day()) % 7, 'day')
  const out: string[] = []
  const todayKey = today.format('YYYY-MM-DD')
  for (; d.isBefore(end); d = d.add(7, 'day')) {
    const key = d.format('YYYY-MM-DD')
    if (key > todayKey) out.push(key)
  }
  return out
}
