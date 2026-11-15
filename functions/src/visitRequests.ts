import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { confirmDeniedReason } from './confirmGuards'
import { resolveScheduleLocation } from './adminScheduleFields'
import {
  TOKEN_RE,
  validateRecommendation,
  publicVisitRequestView,
  checkDecision,
  conflictingVisitId,
  decisionScheduleId,
  wardVisitStats,
  type VisitRequestDoc,
  type RecommendationDoc,
} from './visitRequestLogic'

const REGION = 'asia-northeast3'
const ID_RE = /^[\w-]+$/
const DEFAULT_START = '10:00'
const DEFAULT_END = '13:00'

async function findRequestByToken(token: unknown) {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid link')
  }
  const snap = await admin.firestore()
    .collection('visitRequests')
    .where('token', '==', token)
    .limit(1)
    .get()
  // 없는 문서와 틀린 토큰을 같은 오류로 — 문서 존재 여부를 흘리지 않는다.
  if (snap.empty) throw new functions.https.HttpsError('permission-denied', 'Invalid link')
  return snap.docs[0]
}

/** 공개 링크: 요청 정보와 지금까지 들어온 추천(모든 스테이크)을 돌려준다. */
export const getVisitRequestPublic = functions
  .region(REGION)
  .https.onCall(async (data: { token?: unknown }) => {
    const reqDoc = await findRequestByToken(data?.token)
    const recSnap = await reqDoc.ref.collection('recommendations').get()
    const recs = recSnap.docs.map((d) => d.data() as RecommendationDoc)
    const request = reqDoc.data() as VisitRequestDoc
    const wardStats = wardVisitStats(
      request.units ?? [],
      await schedulesForUnits((request.units ?? []).map((u) => u.id)),
      todayInSeoul(),
    )
    return { ...publicVisitRequestView(request, recs), wardStats }
  })

/** 와드 방문 기록 집계용. `in`은 30개까지라 나눠 묻는다 — CC 하나에 스테이크는 그보다 훨씬 적다. */
async function schedulesForUnits(unitIds: string[]) {
  const db = admin.firestore()
  const out: FirebaseFirestore.DocumentData[] = []
  for (let i = 0; i < unitIds.length; i += 30) {
    const snap = await db.collection('schedules')
      .where('unitId', 'in', unitIds.slice(i, i + 30))
      .select('type', 'status', 'unitId', 'wardId', 'wardName', 'date')
      .get()
    snap.docs.forEach((d) => out.push(d.data()))
  }
  return out
}

function todayInSeoul(): string {
  // en-CA는 YYYY-MM-DD로 찍는다.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
}

/**
 * 공개 링크: 스테이크 하나의 추천을 저장한다. 스테이크당 문서 하나라 다시 내면 덮어쓴다 —
 * 회장이 마음을 바꾸거나 다른 회장 추천을 보고 날짜를 옮길 수 있어야 한다.
 */
export const submitVisitRecommendation = functions
  .region(REGION)
  .https.onCall(async (data: {
    token?: unknown
    unitId?: unknown
    submitterName?: unknown
    note?: unknown
    picks?: unknown
  }) => {
    const reqDoc = await findRequestByToken(data?.token)
    const db = admin.firestore()

    await db.runTransaction(async (tx) => {
      // 확정·마감과 경합할 수 있어 트랜잭션 안에서 요청을 다시 읽고 판정한다.
      const fresh = await tx.get(reqDoc.ref)
      const result = validateRecommendation(fresh.data() as VisitRequestDoc, data ?? {})
      if (!result.ok) throw new functions.https.HttpsError(result.code, result.message)

      const unitId = data.unitId as string
      const recRef = reqDoc.ref.collection('recommendations').doc(unitId)
      const doc: RecommendationDoc = {
        unitId,
        submitterName: result.submitterName,
        note: result.note,
        picks: result.picks,
        submittedAt: new Date().toISOString(),
      }
      tx.set(recRef, doc)
      // 목록 화면이 하위 컬렉션을 일일이 읽지 않고 응답 현황을 그리도록 부모에 적어 둔다.
      tx.update(reqDoc.ref, { respondedUnitIds: admin.firestore.FieldValue.arrayUnion(unitId) })
    })

    return { success: true }
  })

/**
 * 로그인: 일요일 하나를 확정하거나(unitId·wardId), 확정을 거둔다(clear: true).
 * 확정하면 ward_visit 일정이 결정적 id로 만들어지고 — 같은 날을 다른 와드로 다시 확정하면
 * 같은 문서를 덮어쓴다 — 거두면 그 일정을 지운다. calendarSync 트리거가 캘린더를 따라간다.
 */
export const decideVisitRequestDate = functions
  .region(REGION)
  .https.onCall(async (data: {
    requestId?: unknown
    date?: unknown
    unitId?: unknown
    wardId?: unknown
    clear?: unknown
  }, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    const requestId = data?.requestId
    if (typeof requestId !== 'string' || !ID_RE.test(requestId)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid requestId')
    }

    const db = admin.firestore()
    const callerUid = context.auth.uid
    const callerSnap = await db.collection('users').doc(callerUid).get()
    const caller = callerSnap.data() ?? {}

    const reqRef = db.collection('visitRequests').doc(requestId)
    const reqSnap = await reqRef.get()
    if (!reqSnap.exists) throw new functions.https.HttpsError('not-found', 'Request not found')
    const request = reqSnap.data() as VisitRequestDoc

    const denied = confirmDeniedReason(
      { role: caller.role, uid: callerUid, assignedSeventyUid: caller.assignedSeventyUid },
      request.seventyUid,
    )
    if (denied) throw new functions.https.HttpsError('permission-denied', denied)

    const date = typeof data.date === 'string' ? data.date : ''
    const scheduleId = decisionScheduleId(requestId, date)
    const scheduleRef = db.collection('schedules').doc(scheduleId)

    if (data.clear === true) {
      if (!(request.sundays ?? []).includes(date)) {
        throw new functions.https.HttpsError('invalid-argument', 'Date is not part of this request')
      }
      const batch = db.batch()
      batch.delete(scheduleRef)
      batch.update(reqRef, { [`decisions.${date}`]: admin.firestore.FieldValue.delete() })
      await batch.commit()
      return { success: true }
    }

    const check = checkDecision(request, data)
    if (!check.ok) throw new functions.https.HttpsError(check.code, check.message)

    // 같은 칠십인이 그날 이미 다른 방문을 잡아 두었으면 막는다 — 한 일요일에 두 와드는 갈 수 없다.
    const sameDay = await db.collection('schedules')
      .where('seventyUid', '==', request.seventyUid)
      .where('date', '==', date)
      .get()
    const conflict = conflictingVisitId(
      sameDay.docs.map((d) => ({ id: d.id, type: d.data().type, status: d.data().status })),
      scheduleId,
    )
    if (conflict) {
      const c = sameDay.docs.find((d) => d.id === conflict)!.data()
      throw new functions.https.HttpsError(
        'failed-precondition',
        `already-visiting:${c.wardName ?? ''}`,
      )
    }

    const presidentQ = await db.collection('users')
      .where('role', '==', 'president')
      .where('unitId', '==', check.unit.id)
      .limit(1)
      .get()
    const presidentUid = presidentQ.empty ? null : presidentQ.docs[0].id

    // 이미 확정돼 있던 일정의 시각은 유지한다 — 칠십인이 일정 화면에서 시각을 고친 뒤
    // 와드만 바꿔 다시 확정해도 고친 시각이 기본값으로 돌아가지 않게.
    const existing = await scheduleRef.get()
    const startTime = existing.exists ? existing.data()!.startTime ?? DEFAULT_START : DEFAULT_START
    const endTime = existing.exists ? existing.data()!.endTime ?? DEFAULT_END : DEFAULT_END

    const batch = db.batch()
    batch.set(scheduleRef, {
      type: 'ward_visit',
      seventyUid: request.seventyUid,
      unitId: check.unit.id,
      wardName: check.ward.ko,
      wardId: check.ward.id,
      presidentUid,
      date,
      startTime,
      endTime,
      status: 'confirmed',
      notes: null,
      zoomLink: null,
      customTitle: null,
      location: resolveScheduleLocation({
        type: 'ward_visit',
        unitId: check.unit.id,
        wardName: check.ward.ko,
        zoomLink: null,
        location: null,
      }),
      visitRequestId: requestId,
      createdBy: callerUid,
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
    }, { merge: true })
    batch.update(reqRef, {
      [`decisions.${date}`]: {
        unitId: check.unit.id,
        wardId: check.ward.id,
        wardName: check.ward.ko,
        scheduleId,
        decidedBy: callerUid,
        decidedAt: new Date().toISOString(),
      },
    })
    await batch.commit()

    return { success: true, scheduleId }
  })
