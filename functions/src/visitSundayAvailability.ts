/**
 * 방문 추천 요청의 일요일이 지역 칠십인에게 비어 있는가. 순수 함수라 CF와 브라우저가 같이 쓴다
 * (scheduleDates.ts와 같은 방식 — import가 하나도 없다).
 *
 * 칠십인 기준으로 "가능한 일요일"은 그날 칠십인의 일정이 없는 날이다:
 *   - schedule: 칠십인의 일정(취소 제외)이 그날에 걸쳐 있다. 이 요청이 확정해 만든 일정은 뺀다.
 *   - event:    칠십인이 참석하는 행사(seventyAttends) 또는 칠십인 전용 행사가 그날에 걸쳐 있고,
 *               칠십인 담당 지역과 관련 있다.
 *   - blocked:  칠십인이 가용 시간 설정에서 그날을 막아 두었다.
 *   - fast:     금식 주일(그 달 첫 일요일 — 4월·10월도 같다). 와드 방문을 하지 않는다.
 *   - generalConference: 4월·10월 둘째 일요일 — 한국에서 연차 대회를 시청하는 날. 와드 방문을 하지 않는다.
 *   - event:    위 칠십인 행사, 또는 담당 지역 전체·교회 전체 대상의 대회/행사·금식 행사
 *               (지역 대회 등) — 그날은 어느 단위도 와드 방문을 받지 않는다.
 *
 * 협의 평의회(일정의 targetKind 'cc_council')는 오후 모임이라 오전 와드 방문을 막지 않는다. 대신 그날은
 * 그 CC의 와드를 방문해야 이동이 쉬우므로 councilRegionId로 알려 CC 차례를 그 CC로 고정하게 한다.
 *
 * 특정 스테이크/지방부만 대상인 대회/행사(스테이크 대회 등)는 칠십인이 참석하지 않으면 칠십인을 막지
 * 않고 그 단위만 막는다(unitBlocks; 그 단위의 CC가 함께 지정되어 있어도 마찬가지) — 그 단위 회장은 그날을 추천하지 않아도 되고, 다른 단위는 추천할 수 있다.
 * 그 밖의 공개 행사는 막지 않고 notes로 참고만 시킨다.
 */

export type BusyKind = 'schedule' | 'event' | 'blocked' | 'fast' | 'generalConference'

/** 이 행사 종류는 대상 단위의 와드 방문을 막는다(GeneralScheduleCategory의 'conference'는 "대회/행사"). */
const BLOCKING_CATEGORIES = new Set(['conference', 'fasting'])

export interface BusyReason {
  kind: BusyKind
  /** 일정 종류(schedule일 때) */
  scheduleType?: string
  /** 사람이 읽을 이름: 일정 제목·와드 이름·행사 제목. 없으면 '' */
  label: string
  /** 공개해도 되는가 — 공개 링크에는 공개 행사 제목만 싣는다 */
  publicLabel: boolean
}

export interface SundayNote {
  title: string
  /** 대상 단위. null이면 담당 지역 전체 */
  unitIds: string[] | null
}

export interface SundayStatus {
  busy: BusyReason[]
  notes: SundayNote[]
  /** 그 단위만 막힌 날: unitId -> 행사 제목(비공개 행사면 '') */
  unitBlocks: Record<string, string>
  /** 그날 오후 협의 평의회의 CC — 와드 방문도 그 CC에서 하도록. 없으면 null */
  councilRegionId: string | null
}

export interface AvailabilitySchedule {
  id: string
  type?: unknown
  status?: unknown
  date?: unknown
  endDate?: unknown
  customTitle?: unknown
  wardName?: unknown
  targetKind?: unknown
  regionId?: unknown
}

export interface AvailabilityEvent {
  title?: unknown
  category?: unknown
  date?: unknown
  endDate?: unknown
  isPublic?: unknown
  seventyAttends?: unknown
  seventyOnly?: unknown
  targetRegionIds?: unknown
  targetUnitIds?: unknown
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/** date~endDate(없거나 깨졌으면 date 하루)가 day에 걸쳐 있는가 */
function covers(date: string, endDate: string, day: string): boolean {
  if (!date) return false
  const end = endDate && endDate >= date ? endDate : date
  return date <= day && day <= end
}

/** 그 달의 첫 일요일인가. YYYY-MM-DD가 일요일이라고 가정한다. */
export function isFirstSunday(day: string): boolean {
  return Number(day.slice(8, 10)) <= 7
}

/**
 * 연차 대회 시청 주일 — 4월·10월 둘째 일요일. 대회는 미국 시간으로 첫째 주말에 열리고, 한국에서는
 * 시차 때문에 그다음 일요일에 모여 시청한다. 그달 첫 일요일은 다른 달처럼 금식 주일이다.
 */
export function isGeneralConferenceSunday(day: string): boolean {
  const month = day.slice(5, 7)
  const date = Number(day.slice(8, 10))
  return (month === '04' || month === '10') && date >= 8 && date <= 14
}

/**
 * 행사가 칠십인 담당 지역의 누구에게 해당하는가. null이면 무관하다.
 *   - 대상 단위가 있으면 그 단위만(wide=false). 스테이크 대회는 대상 단위와 함께 그 스테이크의
 *     CC도 targetRegionIds에 들어 있다(CC 캘린더에 싣기 위해) — 그 CC 전체 행사로 읽으면 안 된다.
 *   - 대상 단위 없이 CC만 있으면 그 CC 전체, 아무 대상도 없으면 교회 전체(wide=true).
 */
function eventScope(
  e: AvailabilityEvent,
  regions: ReadonlySet<string>,
  units: ReadonlySet<string>,
): { wide: boolean; unitHits: string[] } | null {
  const targetUnits = strList(e.targetUnitIds)
  if (targetUnits.length > 0) {
    const unitHits = targetUnits.filter((u) => units.has(u))
    return unitHits.length > 0 ? { wide: false, unitHits } : null
  }
  const targetRegions = strList(e.targetRegionIds)
  if (targetRegions.length === 0 || targetRegions.some((r) => regions.has(r))) return { wide: true, unitHits: [] }
  return null
}

export function sundayAvailability(input: {
  sundays: string[]
  regionIds: string[]
  regionUnitIds: string[]
  schedules: AvailabilitySchedule[]
  events: AvailabilityEvent[]
  blockedDates: string[]
  ignoreScheduleIds?: ReadonlySet<string>
}): Record<string, SundayStatus> {
  const ignore = input.ignoreScheduleIds ?? new Set<string>()
  const regions = new Set(input.regionIds)
  const units = new Set(input.regionUnitIds)
  const blocked = new Set(input.blockedDates)
  const out: Record<string, SundayStatus> = {}

  for (const day of input.sundays) {
    const busy: BusyReason[] = []
    const notes: SundayNote[] = []
    const unitBlocks: Record<string, string> = {}
    let councilRegionId: string | null = null

    if (isGeneralConferenceSunday(day)) busy.push({ kind: 'generalConference', label: '', publicLabel: true })
    else if (isFirstSunday(day)) busy.push({ kind: 'fast', label: '', publicLabel: true })
    else if (blocked.has(day)) busy.push({ kind: 'blocked', label: '', publicLabel: true })

    for (const s of input.schedules) {
      if (ignore.has(s.id) || s.status === 'cancelled') continue
      if (!covers(str(s.date), str(s.endDate), day)) continue
      // 협의 평의회는 오후라 막지 않는다 — 그 CC로 가는 길에 그 CC 와드를 방문하면 된다.
      if (s.targetKind === 'cc_council' && str(s.regionId)) {
        councilRegionId = str(s.regionId)
        continue
      }
      busy.push({
        kind: 'schedule',
        scheduleType: str(s.type),
        label: str(s.customTitle) || str(s.wardName),
        publicLabel: false,
      })
    }

    for (const e of input.events) {
      if (!covers(str(e.date), str(e.endDate), day)) continue
      const scope = eventScope(e, regions, units)
      if (!scope) continue
      const { wide, unitHits } = scope

      const title = str(e.title)
      const isPublic = e.isPublic === true
      const blocking = BLOCKING_CATEGORIES.has(str(e.category))
      if (e.seventyAttends === true || e.seventyOnly === true || (blocking && wide)) {
        busy.push({ kind: 'event', label: title, publicLabel: isPublic })
      } else if (blocking) {
        for (const u of unitHits) unitBlocks[u] = isPublic ? title : ''
      } else if (isPublic) {
        notes.push({ title, unitIds: wide ? null : unitHits })
      }
    }

    out[day] = { busy, notes, unitBlocks, councilRegionId }
  }
  return out
}

/** 이 일요일에 칠십인을 막는 이유가 있는가 */
export function isSundayBusy(status: SundayStatus | undefined): boolean {
  return !!status && status.busy.length > 0
}

export interface CalendarEvent {
  title: string
  date: string
  endDate: string | null
  category: string
  /** 대상 단위. null이면 담당 지역 전체·교회 전체 */
  unitIds: string[] | null
  /** 이 행사로 대상 단위(또는 전체)의 와드 방문이 빠지는가 — BLOCKING_CATEGORIES */
  blocking: boolean
  seventyAttends: boolean
}

/**
 * 추천 화면 달력에 깔 행사들. 공개 행사 중 칠십인 담당 지역과 관련 있는 것만 — 칠십인 전용·
 * 비공개 행사는 링크를 가진 누구에게나 보여 줄 수 없다. 기간과 겹치는 것만 남긴다.
 */
export function publicCalendarEvents(
  events: AvailabilityEvent[],
  regionIds: string[],
  regionUnitIds: string[],
  from: string,
  to: string,
): CalendarEvent[] {
  const regions = new Set(regionIds)
  const units = new Set(regionUnitIds)
  const out: CalendarEvent[] = []
  for (const e of events) {
    if (e.isPublic !== true || e.seventyOnly === true) continue
    const date = str(e.date)
    const endRaw = str(e.endDate)
    const end = endRaw && endRaw >= date ? endRaw : date
    if (!date || end < from || date > to) continue
    const scope = eventScope(e, regions, units)
    if (!scope) continue
    const { wide, unitHits } = scope
    out.push({
      title: str(e.title),
      date,
      endDate: end > date ? end : null,
      category: str(e.category),
      unitIds: wide ? null : unitHits,
      blocking: BLOCKING_CATEGORIES.has(str(e.category)),
      seventyAttends: e.seventyAttends === true,
    })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
