import {
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs, writeBatch,
  serverTimestamp, type Unsubscribe, type Query,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase'
import { generatePublicToken } from '@/utils/publicToken'
import type {
  AppUser, VisitRecommendation, VisitRequest, VisitRequestUnit, WardVisitStat,
} from '@/types'
import type { SundayStatus } from '../../functions/src/visitSundayAvailability'
import { mapDocs, snapshotErrHandler } from './_utils'

/**
 * 이 사용자가 보는 요청 목록. 규칙이 칠십인·집행서기에게는 seventyUid로 거른 질의만 허락하므로
 * 질의 자체를 그렇게 만든다(조건 없는 목록 조회는 거부된다). 정렬은 클라이언트에서 —
 * where + orderBy 조합은 복합 색인을 하나 더 요구한다.
 */
function listQuery(user: Pick<AppUser, 'role' | 'uid' | 'assignedSeventyUid'>): Query | null {
  const col = collection(db, 'visitRequests')
  if (user.role === 'admin') return col
  if (user.role === 'seventy') return query(col, where('seventyUid', '==', user.uid))
  if (user.role === 'exec_secretary' && user.assignedSeventyUid) {
    return query(col, where('seventyUid', '==', user.assignedSeventyUid))
  }
  return null
}

export function subscribeToVisitRequests(
  user: Pick<AppUser, 'role' | 'uid' | 'assignedSeventyUid'>,
  callback: (requests: VisitRequest[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = listQuery(user)
  if (!q) {
    callback([])
    return () => {}
  }
  return onSnapshot(
    q,
    (snap) => {
      const list = mapDocs<VisitRequest>(snap)
      list.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
      callback(list)
    },
    snapshotErrHandler('visitRequests', onError),
  )
}

export function subscribeToVisitRequest(
  id: string,
  callback: (request: VisitRequest | null) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'visitRequests', id),
    (snap) => callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as VisitRequest) : null),
    snapshotErrHandler('visitRequest', onError),
  )
}

export function subscribeToRecommendations(
  requestId: string,
  callback: (recs: VisitRecommendation[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'visitRequests', requestId, 'recommendations'),
    (snap) => callback(snap.docs.map((d) => d.data() as VisitRecommendation)),
    snapshotErrHandler('visitRecommendations', onError),
  )
}

export interface CreateVisitRequestInput {
  title: string
  note: string
  guidance: string
  seventyUid: string
  seventyName: string
  sundays: string[]
  dueDate: string | null
  units: VisitRequestUnit[]
  /** CC를 둘 이상 맡았을 때만 */
  sundayRegions?: Record<string, string>
  regions?: { id: string; name: string }[]
}

function newUnitTokens(units: { id: string }[]): Record<string, string> {
  return Object.fromEntries(units.map((u) => [u.id, generatePublicToken()]))
}

/**
 * 스테이크별 링크 이전에 만든 요청에 스테이크별 토큰을 채운다. 규칙이 한 번만 허락한다 —
 * 이미 있으면 그대로 둔다(바꾸면 보낸 링크가 끊긴다).
 */
export async function ensureUnitTokens(request: Pick<VisitRequest, 'id' | 'units' | 'unitTokens'>): Promise<void> {
  if (request.unitTokens && Object.keys(request.unitTokens).length > 0) return
  await updateDoc(doc(db, 'visitRequests', request.id), { unitTokens: newUnitTokens(request.units) })
}

/** 스테이크 하나의 링크에 넣을 일요일을 바꾼다. */
export async function setUnitSundays(requestId: string, unitId: string, sundays: string[]): Promise<void> {
  await updateDoc(doc(db, 'visitRequests', requestId), { [`unitSundays.${unitId}`]: [...sundays].sort() })
}

export async function createVisitRequest(
  input: CreateVisitRequestInput,
  createdBy: string,
): Promise<string> {
  const ref = await addDoc(collection(db, 'visitRequests'), {
    ...input,
    sundays: [...input.sundays].sort(),
    // createdAt은 정렬용 문자열 — 목록이 클라이언트에서 문자열로 비교한다.
    createdAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
    // 스테이크마다 따로 보내는 링크 — 링크 하나는 그 스테이크만 연다
    unitTokens: newUnitTokens(input.units),
    status: 'open',
    decisions: {},
    createdBy,
  })
  return ref.id
}

/** 제목·메모·강조 사항 고치기. 일요일·단위는 이미 받은 추천과 엇갈리므로 바꾸지 않는다. */
export async function updateVisitRequestText(
  id: string,
  fields: { title: string; note: string; guidance: string },
): Promise<void> {
  await updateDoc(doc(db, 'visitRequests', id), fields)
}

export async function setVisitRequestStatus(id: string, status: 'open' | 'closed'): Promise<void> {
  await updateDoc(doc(db, 'visitRequests', id), { status })
}

/** 요청과 그 추천을 함께 지운다. 이미 확정된 방문 일정은 남는다 — 실제 일정이다. */
export async function deleteVisitRequest(id: string): Promise<void> {
  const recs = await getDocs(collection(db, 'visitRequests', id, 'recommendations'))
  const batch = writeBatch(db)
  recs.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'visitRequests', id))
  await batch.commit()
}

interface DecideParams {
  requestId: string
  date: string
  unitId?: string
  wardId?: string
  clear?: boolean
}

export async function decideVisitRequestDate(
  requestId: string,
  date: string,
  pick: { unitId: string; wardId: string } | null,
): Promise<void> {
  const fn = httpsCallable<DecideParams, { success: boolean }>(functions, 'decideVisitRequestDate')
  await fn(pick ? { requestId, date, ...pick } : { requestId, date, clear: true })
}

/** decideVisitRequestDate가 겹치는 방문 때문에 거절했으면 그 와드 이름을, 아니면 null. */
export function alreadyVisitingWard(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : ''
  const m = /^already-visiting:(.*)$/.exec(msg)
  return m ? m[1] : null
}

/**
 * 칠십인의 일요일별 상황(일정·참석 행사·막은 날·금식/연차 대회 주일·단위 행사).
 * 집행서기는 칠십인의 가용 시간 설정을 직접 읽을 수 없어 서버에서 함께 계산한다.
 */
/** 일요일마다 칠십인이 비어 있는지, 그리고 첫 일요일 전 마지막 와드 방문의 CC */
export interface SundayStatusResult {
  status: Record<string, SundayStatus>
  lastVisitRegion: string | null
  /** withWardStats로 물었을 때만: 칠십인 담당 CC의 와드 방문 기록(공개 링크와 같은 집계) */
  wardStats?: Record<string, WardVisitStat>
}

export async function fetchSundayStatus(
  seventyUid: string,
  sundays: string[],
  requestId?: string,
  options: { withWardStats?: boolean } = {},
): Promise<SundayStatusResult> {
  const fn = httpsCallable<
    { seventyUid: string; sundays: string[]; requestId?: string; withWardStats?: boolean },
    SundayStatusResult
  >(functions, 'getVisitSundayStatus')
  const res = await fn({
    seventyUid,
    sundays,
    ...(requestId ? { requestId } : {}),
    ...(options.withWardStats ? { withWardStats: true } : {}),
  })
  return res.data
}
