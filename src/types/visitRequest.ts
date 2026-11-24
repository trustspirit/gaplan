import type { RequestEnglish } from '../../functions/src/requestEnglish'
/**
 * 방문 추천 요청. 칠십인(또는 담당 집행서기·관리자)이 방문 가능한 일요일을 골라 만들고,
 * 공개 링크 하나를 모든 스테이크/지방부 회장에게 공유한다. 회장들은 로그인 없이 일요일마다
 * 자기 와드/지부를 추천하고, 칠십인·집행서기가 로그인해 일요일마다 하나를 확정한다.
 * 서버 쪽 판정은 functions/src/visitRequestLogic.ts에 있다.
 */
export type VisitRequestStatus = 'open' | 'closed'

export interface VisitRequestWard {
  id: string
  ko: string
  en: string
}

/** 요청을 만들 때 찍어 두는 스테이크/지방부와 그 와드 목록. CF는 이걸로 추천을 검증한다. */
export interface VisitRequestUnit {
  id: string
  ko: string
  en: string
  /** 소속 CC — CC 차례(sundayRegions)를 맞출 때 쓴다 */
  regionId?: string
  wards: VisitRequestWard[]
}

export interface VisitRequestRegion {
  id: string
  name: string
}

export interface VisitRequestDecision {
  unitId: string
  wardId: string
  wardName: string
  scheduleId?: string   // 공개 응답에는 없다
  decidedBy?: string
  decidedAt?: string
}

export interface VisitRequest {
  id: string
  title: string
  note?: string
  /** 회장들에게 강조할 말(예: 오래 방문받지 못한 와드를 먼저). 공개 화면 위쪽에 보인다 */
  guidance?: string
  seventyUid: string
  seventyName: string
  /** 영어로 보내는 스테이크용 — 제목·강조 사항·칠십인·회장 이름을 옮긴 것(translateVisitRequest) */
  english?: RequestEnglish
  sundays: string[]          // YYYY-MM-DD, 오름차순
  dueDate?: string | null    // YYYY-MM-DD
  /** 스테이크별 공개 링크 토큰(unitId -> token). 스테이크별 링크 이전 요청에는 없다 — 상세 화면이 채운다 */
  unitTokens?: Record<string, string>
  /** 스테이크별 링크에 넣을 일요일(unitId -> dates). 없는 스테이크는 요청의 모든 일요일 */
  unitSundays?: Record<string, string[]>
  /**
   * 추천 배정에서 일요일마다 1순위·예비 스테이크(date -> roles). 칠십인 화면에서만 쓴다 —
   * 회장 링크에는 가지 않는다(공개 응답은 필드를 골라 담는다).
   */
  unitSundayRoles?: Record<string, { primary?: string; backup?: string }>
  status: VisitRequestStatus
  units: VisitRequestUnit[]
  /**
   * 칠십인이 CC를 둘 이상 맡았을 때 일요일마다 차례인 CC(date -> regionId). 한 CC를 연달아
   * 방문하지 않도록 정해 두고, 그 일요일에는 그 CC의 단위만 추천한다. 없으면 CC 구분 없음.
   */
  sundayRegions?: Record<string, string>
  regions?: VisitRequestRegion[]
  decisions: Record<string, VisitRequestDecision>
  respondedUnitIds?: string[]   // submitVisitRecommendation이 채운다 — 목록의 응답 현황용
  createdBy: string
  createdAt: string
}

export interface VisitRecommendationPick {
  date: string
  wardId: string
  wardName: string
}

/** visitRequests/{id}/recommendations/{unitId} — 스테이크당 한 문서, 다시 내면 덮어쓴다. */
export interface VisitRecommendation {
  unitId: string
  submitterName: string
  note?: string
  picks: VisitRecommendationPick[]
  submittedAt: string
}

/** 공개 링크가 받는 요청 정보(getVisitRequestPublic). 토큰·uid 같은 내부 값은 없다. */
export interface PublicVisitRequest {
  title: string
  note: string
  guidance: string
  seventyName: string
  dueDate: string | null
  /** 영어로 연 회장에게 보일 값. 옮기지 않았거나 원문이 바뀌었으면 없다 */
  english?: { title: string; guidance: string; note: string; seventy: string } | null
  status: VisitRequestStatus
  sundays: string[]
  units: VisitRequestUnit[]
  /** 배포 전 서버는 보내지 않는다 — 없으면 CC 구분 없음 */
  sundayRegions?: Record<string, string>
  regions?: VisitRequestRegion[]
  decisions: Record<string, VisitRequestDecision>
  /** 메모는 오지 않는다 — 다른 회장에게 보일 글이 아니라서 있는지만 온다 */
  recommendations: (Omit<VisitRecommendation, 'note'> & { hasNote: boolean })[]
  /** wardId -> 방문 기록. 회장이 오래 방문받지 못한 와드를 보고 추천하도록 */
  wardStats: Record<string, WardVisitStat>
  /** date -> 칠십인 일정·대회로 막혔는가 */
  sundayStatus: Record<string, PublicSundayStatus>
  /** 요청 기간의 공개 행사 — 달력에 깐다 */
  calendarEvents?: PublicCalendarEvent[]
}

/** functions/src/visitSundayAvailability.ts의 CalendarEvent와 같은 모양 */
export interface PublicCalendarEvent {
  title: string
  date: string
  endDate: string | null
  category: string
  unitIds: string[] | null
  blocking: boolean
  seventyAttends: boolean
}

export type SundayBusyKind = 'schedule' | 'event' | 'blocked' | 'fast' | 'generalConference'

/**
 * 공개 링크가 받는 일요일 상황. 칠십인 일정의 내용은 오지 않고 막힌 이유의 종류와
 * 공개 행사 제목만 온다. 로그인 화면은 functions/src/visitSundayAvailability.ts의
 * SundayStatus(일정 제목 포함)를 그대로 받는다.
 */
export interface PublicSundayStatus {
  busy: { kind: SundayBusyKind; label: string }[]
  notes: { title: string; unitIds: string[] | null }[]
  unitBlocks: Record<string, string>
}

/** functions/src/visitRequestLogic.ts의 wardVisitStats와 같은 모양 */
export interface WardVisitStat {
  lastVisit: string | null
  nextVisit: string | null
  count12m: number
}
