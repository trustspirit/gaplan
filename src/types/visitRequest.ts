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
  wards: VisitRequestWard[]
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
  seventyUid: string
  seventyName: string
  sundays: string[]          // YYYY-MM-DD, 오름차순
  dueDate?: string | null    // YYYY-MM-DD
  token: string
  status: VisitRequestStatus
  units: VisitRequestUnit[]
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
  seventyName: string
  dueDate: string | null
  status: VisitRequestStatus
  sundays: string[]
  units: VisitRequestUnit[]
  decisions: Record<string, VisitRequestDecision>
  /** 메모는 오지 않는다 — 다른 회장에게 보일 글이 아니라서 있는지만 온다 */
  recommendations: (Omit<VisitRecommendation, 'note'> & { hasNote: boolean })[]
  /** wardId -> 방문 기록. 회장이 오래 방문받지 못한 와드를 보고 추천하도록 */
  wardStats: Record<string, WardVisitStat>
}

/** functions/src/visitRequestLogic.ts의 wardVisitStats와 같은 모양 */
export interface WardVisitStat {
  lastVisit: string | null
  nextVisit: string | null
  count12m: number
}
