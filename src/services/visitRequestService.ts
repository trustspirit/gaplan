import {
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs, writeBatch,
  serverTimestamp, type Unsubscribe, type Query,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase'
import { generatePublicToken } from '@/utils/publicToken'
import type {
  AppUser, PublicVisitRequest, VisitRecommendation, VisitRequest, VisitRequestUnit,
} from '@/types'
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
  seventyUid: string
  seventyName: string
  sundays: string[]
  dueDate: string | null
  units: VisitRequestUnit[]
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
    token: generatePublicToken(),
    status: 'open',
    decisions: {},
    createdBy,
  })
  return ref.id
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

/**
 * 회장들이 보는 것과 같은 와드 방문 기록. 로그인한 칠십인도 같은 함수를 쓴다 —
 * 확정 화면과 추천 화면이 같은 와드를 서로 다른 숫자로 보여 주면 안 된다.
 */
export async function fetchWardStats(token: string): Promise<PublicVisitRequest['wardStats']> {
  const fn = httpsCallable<{ token: string }, PublicVisitRequest>(functions, 'getVisitRequestPublic')
  const res = await fn({ token })
  return res.data.wardStats ?? {}
}

/** decideVisitRequestDate가 겹치는 방문 때문에 거절했으면 그 와드 이름을, 아니면 null. */
export function alreadyVisitingWard(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : ''
  const m = /^already-visiting:(.*)$/.exec(msg)
  return m ? m[1] : null
}
