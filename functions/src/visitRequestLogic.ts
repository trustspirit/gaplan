/**
 * 방문 추천 요청(visitRequests)의 판정 로직. firebase를 import하지 않는 순수 함수로 두어
 * 테스트에서 바로 부른다 — 공개 링크로 들어오는 입력은 전부 여기서 걸러진다.
 *
 * 흐름: 칠십인·집행서기가 방문 가능한 일요일을 골라 요청을 만들고 링크 하나를 회장들에게
 * 공유한다 → 각 스테이크/지방부 회장이 그 링크에서 일요일마다 자기 와드/지부를 추천한다
 * (recommendations/{unitId}, 스테이크당 한 문서) → 칠십인·집행서기가 로그인해 일요일마다
 * 추천 하나를 골라 확정하면 ward_visit 일정이 만들어진다(decisions[date]).
 */

export interface RequestWard {
  id: string
  ko: string
  en: string
}

export interface RequestUnit {
  id: string
  ko: string
  en: string
  /** 소속 CC. 서버가 trustedUnits에서 자기 표로 채운다(클라이언트 값은 믿지 않는다) */
  regionId?: string
  wards: RequestWard[]
}

export interface RequestDecision {
  unitId: string
  wardId: string
  wardName: string
  scheduleId: string
}

export interface VisitRequestDoc {
  title?: string
  note?: string
  guidance?: string
  seventyUid?: string
  seventyName?: string
  sundays?: string[]
  dueDate?: string | null
  status?: string
  units?: RequestUnit[]
  decisions?: Record<string, RequestDecision>
  /** 칠십인이 CC를 둘 이상 맡았을 때 일요일마다 차례인 CC(visitRegionRotation) */
  sundayRegions?: Record<string, string>
  /** 화면에 보일 CC 이름 */
  regions?: { id: string; name: string }[]
  /**
   * 스테이크별 공개 링크 토큰(unitId -> token). 링크 하나가 스테이크 하나만 연다.
   * 예전 요청의 공용 토큰(token)은 더 받지 않는다.
   */
  unitTokens?: Record<string, string>
  /** 스테이크별 링크에 넣을 일요일(unitId -> dates). 없으면 요청의 모든 일요일 */
  unitSundays?: Record<string, string[]>
}

/**
 * 이 스테이크의 링크에 들어가는 일요일. 요청의 일요일 중 그 스테이크 CC 차례인 날이고,
 * 칠십인이 그 스테이크에 골라 두었으면 그중 고른 것만.
 */
export function sundaysForUnit(request: VisitRequestDoc, unitId: string): string[] {
  const regionId = (request.units ?? []).find((u) => u.id === unitId)?.regionId
  const turns = request.sundayRegions ?? {}
  const ours = [...(request.sundays ?? [])]
    .sort()
    .filter((d) => !turns[d] || turns[d] === regionId)
  const chosen = request.unitSundays?.[unitId]
  if (!Array.isArray(chosen)) return ours
  const set = new Set(chosen)
  return ours.filter((d) => set.has(d))
}

export interface PickInput {
  date?: unknown
  wardId?: unknown
}

export interface CleanPick {
  date: string
  wardId: string
  wardName: string
}

export const SUBMITTER_NAME_MAX = 40
export const RECOMMENDATION_NOTE_MAX = 500
export const TOKEN_RE = /^[0-9a-f]{16,64}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type RecommendationResult =
  // note가 null이면 "메모는 건드리지 않음" — 공개 화면은 남의 메모를 받지 못하므로, 메모 칸을
  // 비워 둔 채 다시 내도 예전 메모가 지워지지 않아야 한다.
  | { ok: true; picks: CleanPick[]; submitterName: string; note: string | null }
  | { ok: false; code: 'failed-precondition' | 'invalid-argument'; message: string }

/**
 * 공개 링크로 들어온 추천을 검증하고, 저장할 형태로 정리한다.
 * - 마감된 요청은 받지 않는다.
 * - unitId는 요청에 실린 스테이크여야 하고, wardId는 그 스테이크의 와드여야 한다.
 * - 날짜는 요청의 일요일이어야 하고, 한 일요일에는 와드 하나만 추천한다.
 * - 이미 확정된 일요일은 추천을 받지 않는다 — 다른 스테이크로 확정된 날에 추천을 남겨 봐야
 *   칠십인 화면에 쓸모없는 후보만 쌓인다. 자기 와드로 확정된 날은 그대로 둔다(재제출 시 유지).
 * picks가 빈 배열이면 "이번에는 추천하지 않음"으로 받아들인다 — 이미 제출한 추천을 거둘 수 있어야 한다.
 */
export function validateRecommendation(
  request: VisitRequestDoc,
  input: { unitId?: unknown; submitterName?: unknown; note?: unknown; picks?: unknown },
  /** 칠십인 일정·대회 등으로 이 단위가 그날 추천할 수 없는가(visitSundayAvailability) */
  unavailable: (date: string, unitId: string) => boolean = () => false,
): RecommendationResult {
  if (request.status !== 'open') {
    return { ok: false, code: 'failed-precondition', message: 'This request is closed' }
  }

  const unit = (request.units ?? []).find((u) => u.id === input.unitId)
  if (!unit) return { ok: false, code: 'invalid-argument', message: 'Unknown unit' }

  const submitterName = typeof input.submitterName === 'string' ? input.submitterName.trim() : ''
  if (!submitterName || submitterName.length > SUBMITTER_NAME_MAX) {
    return { ok: false, code: 'invalid-argument', message: 'Submitter name is required' }
  }

  const note = typeof input.note === 'string' ? input.note.trim() : null
  if (note !== null && note.length > RECOMMENDATION_NOTE_MAX) {
    return { ok: false, code: 'invalid-argument', message: 'Note is too long' }
  }

  if (!Array.isArray(input.picks)) {
    return { ok: false, code: 'invalid-argument', message: 'picks must be an array' }
  }

  const sundays = new Set(request.sundays ?? [])
  const decisions = request.decisions ?? {}
  const seen = new Set<string>()
  const picks: CleanPick[] = []

  for (const raw of input.picks as PickInput[]) {
    const date = typeof raw?.date === 'string' ? raw.date : ''
    const wardId = typeof raw?.wardId === 'string' ? raw.wardId : ''
    if (!DATE_RE.test(date) || !sundays.has(date)) {
      return { ok: false, code: 'invalid-argument', message: `Date ${date} is not offered` }
    }
    if (seen.has(date)) {
      return { ok: false, code: 'invalid-argument', message: `Only one ward per Sunday (${date})` }
    }
    const ward = unit.wards.find((w) => w.id === wardId)
    if (!ward) {
      return { ok: false, code: 'invalid-argument', message: 'Ward does not belong to this unit' }
    }
    const decided = decisions[date]
    if (decided && decided.unitId !== unit.id) {
      return { ok: false, code: 'failed-precondition', message: `${date} is already decided` }
    }
    // 다른 CC 차례인 일요일 — 한 CC를 연달아 방문하지 않도록 칠십인이 정해 둔 것이다.
    const turn = request.sundayRegions?.[date]
    if (turn && unit.regionId !== turn) {
      return { ok: false, code: 'failed-precondition', message: `${date} is for another CC` }
    }
    // 이미 이 단위로 확정된 날은 그대로 둔다 — 확정 뒤 생긴 일정은 칠십인이 정리할 몫이다.
    if (!decided && unavailable(date, unit.id)) {
      return { ok: false, code: 'failed-precondition', message: `${date} is not available` }
    }
    seen.add(date)
    picks.push({ date, wardId: ward.id, wardName: ward.ko })
  }

  picks.sort((a, b) => a.date.localeCompare(b.date))
  return { ok: true, picks, submitterName, note }
}

export interface RecommendationDoc {
  unitId: string
  submitterName: string
  note?: string
  picks: CleanPick[]
  submittedAt: string
}

/**
 * 링크를 가진 누구에게나 내려가는 요청 정보. 토큰·칠십인 uid·만든 사람 같은 내부 값은 뺀다.
 * 다른 스테이크의 추천을 같이 내려 주는 건 의도다 — 회장들이 이미 추천이 몰린 일요일을
 * 보고 비어 있는 날로 옮겨 갈 수 있어야 한 날에 겹치는 추천이 줄어든다.
 */
export function publicVisitRequestView(
  request: VisitRequestDoc,
  recommendations: RecommendationDoc[],
  /** 링크가 연 스테이크. 다른 스테이크의 추천·확정 와드는 내보내지 않는다 */
  unitId: string,
) {
  const decisions = request.decisions ?? {}
  return {
    title: request.title ?? '',
    note: request.note ?? '',
    guidance: request.guidance ?? '',
    seventyName: request.seventyName ?? '',
    dueDate: request.dueDate ?? null,
    status: request.status === 'open' ? 'open' : 'closed',
    sundays: sundaysForUnit(request, unitId),
    units: (request.units ?? []).filter((u) => u.id === unitId),
    sundayRegions: request.sundayRegions ?? {},
    regions: (request.regions ?? []).map((r) => ({ id: r.id, name: r.name })),
    // 다른 스테이크로 확정된 날은 "확정됨"만 알린다 — 어느 스테이크·와드인지는 빈 값.
    decisions: Object.fromEntries(
      Object.entries(decisions).map(([date, d]) => [
        date,
        d.unitId === unitId
          ? { unitId: d.unitId, wardId: d.wardId, wardName: d.wardName }
          : { unitId: '', wardId: '', wardName: '' },
      ]),
    ),
    // 메모는 내보내지 않는다 — 있는지만 알려 줘서, 다시 연 회장이 "남긴 말이 있다"는 것만 안다.
    recommendations: recommendations
      .filter((r) => r.unitId === unitId)
      .map((r) => ({
        unitId: r.unitId,
        submitterName: r.submitterName,
        hasNote: !!r.note,
        picks: r.picks,
        submittedAt: r.submittedAt,
      })),
  }
}

/** 일요일 하나에 대한 확정 일정의 결정적 id. 같은 날을 다시 확정하면 같은 문서를 덮어쓴다. */
export function decisionScheduleId(requestId: string, date: string): string {
  return `vr_${requestId}_${date}`
}

export type DecisionCheck =
  | { ok: true; unit: RequestUnit; ward: RequestWard }
  | { ok: false; code: 'invalid-argument' | 'failed-precondition'; message: string }

/**
 * 확정하려는 (일요일, 스테이크, 와드)가 이 요청에서 말이 되는지.
 * 추천받지 않은 와드도 확정할 수 있게 둔다 — 칠십인이 추천 밖의 와드를 직접 고르는 일이
 * 실제로 있고, 그때마다 회장에게 다시 추천해 달라고 할 수는 없다. 다만 요청의 일요일과
 * 요청에 실린 스테이크의 와드라는 범위는 지킨다.
 */
export function checkDecision(
  request: VisitRequestDoc,
  input: { date?: unknown; unitId?: unknown; wardId?: unknown },
): DecisionCheck {
  const date = typeof input.date === 'string' ? input.date : ''
  if (!DATE_RE.test(date) || !(request.sundays ?? []).includes(date)) {
    return { ok: false, code: 'invalid-argument', message: 'Date is not part of this request' }
  }
  const unit = (request.units ?? []).find((u) => u.id === input.unitId)
  if (!unit) return { ok: false, code: 'invalid-argument', message: 'Unknown unit' }
  const ward = unit.wards.find((w) => w.id === input.wardId)
  if (!ward) return { ok: false, code: 'invalid-argument', message: 'Ward does not belong to this unit' }
  return { ok: true, unit, ward }
}

/**
 * 같은 칠십인이 그날 이미 다른 와드 방문을 잡아 두었는가. 이 요청이 만든 일정(같은 id)과
 * 취소된 일정은 빼고 본다. 겹치는 일정이 있으면 그 id를, 없으면 null을 돌려준다.
 */
export function conflictingVisitId(
  existing: { id: string; type?: unknown; status?: unknown }[],
  ownScheduleId: string,
): string | null {
  const hit = existing.find(
    (s) => s.id !== ownScheduleId && s.type === 'ward_visit' && s.status !== 'cancelled',
  )
  return hit ? hit.id : null
}

export interface WardVisitStat {
  lastVisit: string | null    // 오늘 이전(오늘 포함) 마지막 와드 방문일
  nextVisit: string | null    // 오늘 이후 잡혀 있는 가장 가까운 방문일
  count12m: number            // 최근 12개월 방문 횟수
}

interface ScheduleLike {
  type?: unknown
  status?: unknown
  unitId?: unknown
  wardId?: unknown
  wardName?: unknown
  date?: unknown
}

/**
 * 추천하는 회장이 참고할 와드별 방문 기록. 통계 화면(src/utils/visitStats.ts)과 같은 기준이다 —
 * ward_visit이고 confirmed·pending인 일정만 센다. 와드는 wardId로, 옛 문서처럼 wardId가 없으면
 * 같은 스테이크 안의 와드 이름으로 맞춘다(스테이크가 달라도 이름이 같은 와드가 있다).
 * 칠십인이 누구였든 센다 — 회장 입장에서는 "우리 와드에 지역 칠십인이 언제 왔나"가 궁금한 것이다.
 */
export function wardVisitStats(
  units: RequestUnit[],
  schedules: ScheduleLike[],
  today: string,
): Record<string, WardVisitStat> {
  const since = shiftMonths(today, -12)
  const stats: Record<string, WardVisitStat> = {}
  const byName = new Map<string, string>()   // `${unitId}|${wardKo}` -> wardId
  for (const u of units) {
    for (const w of u.wards) {
      stats[w.id] = { lastVisit: null, nextVisit: null, count12m: 0 }
      byName.set(`${u.id}|${w.ko}`, w.id)
    }
  }

  for (const s of schedules) {
    if (s.type !== 'ward_visit') continue
    if (s.status !== 'confirmed' && s.status !== 'pending') continue
    if (typeof s.date !== 'string') continue
    const wardId =
      typeof s.wardId === 'string' && stats[s.wardId]
        ? s.wardId
        : byName.get(`${String(s.unitId)}|${String(s.wardName)}`)
    if (!wardId) continue
    const st = stats[wardId]
    if (s.date <= today) {
      if (!st.lastVisit || s.date > st.lastVisit) st.lastVisit = s.date
      if (s.date >= since) st.count12m += 1
    } else if (!st.nextVisit || s.date < st.nextVisit) {
      st.nextVisit = s.date
    }
  }
  return stats
}

/** YYYY-MM-DD에 달을 더하고 뺀다. 말일은 그 달의 말일로 맞춘다(dayjs와 같은 규칙). */
function shiftMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const target = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, lastDay))
  return target.toISOString().slice(0, 10)
}

/**
 * 요청 문서의 스테이크·와드 목록 중 믿을 수 있는 것만 남긴다. 목록은 요청을 만든 클라이언트가
 * 찍어 보낸 것이라, 그대로 믿으면 칠십인이 담당 밖 CC의 와드로 방문 일정을 만들거나 그 와드의
 * 방문 기록을 공개 링크로 내보낼 수 있다.
 * - 스테이크는 그 칠십인 담당 CC의 것이어야 한다(allowedUnitIds).
 * - 와드는 서버 표(wardUnits)에서 그 스테이크 소속이어야 하고, 이름은 서버 표의 이름으로 바꾼다.
 */
export function trustedUnits(
  units: RequestUnit[] | undefined,
  allowedUnitIds: ReadonlySet<string>,
  wardUnits: Record<string, { unitId: string; ko: string }>,
  /** unitId -> 소속 CC. 없으면 regionId를 비운다 */
  unitRegions: Record<string, string> = {},
): RequestUnit[] {
  return (units ?? [])
    .filter((u) => allowedUnitIds.has(u.id))
    .map((u) => ({
      ...u,
      regionId: unitRegions[u.id],
      wards: u.wards
        .filter((w) => wardUnits[w.id]?.unitId === u.id)
        .map((w) => ({ ...w, ko: wardUnits[w.id].ko })),
    }))
    .filter((u) => u.wards.length > 0)
}

/**
 * 추천 요청이 만든 방문 일정이 바뀐 뒤, 그 요청의 확정 중 거둬야 할 날짜.
 * 일정 화면에서 방문을 지우면(status: cancelled) 또는 날짜를 옮기면 요청에는 「확정」이 남아
 * 회장들이 그 일요일을 추천할 수 없게 된다. 거둘 게 없으면 null.
 */
export function staleDecisionDate(
  before: { visitRequestId?: unknown; date?: unknown; status?: unknown } | undefined,
  after: { date?: unknown; status?: unknown } | undefined,
): string | null {
  if (!before || typeof before.visitRequestId !== 'string' || typeof before.date !== 'string') {
    return null
  }
  if (before.status === 'cancelled') return null
  if (!after || after.status === 'cancelled' || after.date !== before.date) return before.date
  return null
}

/** 공개 링크 경로의 토큰이 저장된 토큰과 맞는가. 둘 다 형식이 맞아야 한다(짧은 토큰은 추측된다). */
export function tokenMatches(stored: unknown, given: unknown): boolean {
  return (
    typeof stored === 'string' && typeof given === 'string' &&
    TOKEN_RE.test(stored) && TOKEN_RE.test(given) && stored === given
  )
}

/** 공개 링크의 토큰이 여는 스테이크. 요청에 실린(믿을 수 있는) 스테이크여야 한다. 없으면 null. */
export function unitIdForToken(request: VisitRequestDoc, token: unknown): string | null {
  const units = new Set((request.units ?? []).map((u) => u.id))
  for (const [unitId, stored] of Object.entries(request.unitTokens ?? {})) {
    if (units.has(unitId) && tokenMatches(stored, token)) return unitId
  }
  return null
}

/**
 * 공개 링크용 일요일 상황을 그 스테이크 기준으로 줄인다 — 다른 스테이크의 대회·행사는 빼고,
 * 칠십인 일정은 종류와 공개 행사 제목만 남긴다.
 */
export function publicSundayStatusForUnit(
  status: Record<string, {
    busy: { kind: string; label: string; publicLabel: boolean }[]
    notes: { title: string; unitIds: string[] | null }[]
    unitBlocks: Record<string, string>
  }>,
  unitId: string,
) {
  return Object.fromEntries(
    Object.entries(status).map(([date, st]) => [
      date,
      {
        busy: st.busy.map((b) => ({ kind: b.kind, label: b.publicLabel ? b.label : '' })),
        notes: st.notes
          .filter((n) => !n.unitIds || n.unitIds.includes(unitId))
          .map((n) => ({ title: n.title, unitIds: n.unitIds ? [unitId] : null })),
        unitBlocks: unitId in st.unitBlocks ? { [unitId]: st.unitBlocks[unitId] } : {},
      },
    ]),
  )
}
