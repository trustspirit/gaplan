import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { confirmDeniedReason } from './confirmGuards'
import { resolveScheduleLocation } from './adminScheduleFields'
import { REGION_UNITS } from './regions'
import { WARD_UNITS } from './wardUnitMap'
import {
  validateRecommendation,
  publicVisitRequestView,
  checkDecision,
  conflictingVisitId,
  decisionScheduleId,
  wardVisitStats,
  trustedUnits,
  staleDecisionDate,
  tokenMatches,
  type VisitRequestDoc,
  type RecommendationDoc,
} from './visitRequestLogic'

const REGION = 'asia-northeast3'
const ID_RE = /^[\w-]+$/
const DEFAULT_START = '10:00'
const DEFAULT_END = '13:00'

/**
 * 요청 문서의 스테이크·와드 목록을 그 칠십인 담당 CC와 서버 와드 표로 거른다.
 * 목록은 클라이언트가 찍어 보낸 것이라 그대로 믿지 않는다(visitRequestLogic.trustedUnits).
 */
async function withTrustedUnits(request: VisitRequestDoc): Promise<VisitRequestDoc> {
  const seventySnap = request.seventyUid
    ? await admin.firestore().collection('users').doc(request.seventyUid).get()
    : null
  const seventy = seventySnap?.data() ?? {}
  const regionIds: string[] = Array.isArray(seventy.regionIds) && seventy.regionIds.length
    ? seventy.regionIds
    : (typeof seventy.regionId === 'string' ? [seventy.regionId] : [])
  const allowed = new Set(regionIds.flatMap((r) => REGION_UNITS[r] ?? []))
  return { ...request, units: trustedUnits(request.units, allowed, WARD_UNITS) }
}

/**
 * 공개 링크(`/recommend/{requestId}/{token}`)의 요청을 연다. 토큰으로 질의하지 않고 id로 문서를
 * 집은 뒤 토큰을 비교한다 — 토큰은 요청을 만든 클라이언트가 정하므로, 질의로 찾으면 남의 링크를
 * 본 사람이 같은 토큰의 요청을 하나 더 만들어 그 링크를 가로챌 수 있다.
 */
async function openRequest(requestId: unknown, token: unknown) {
  if (typeof requestId !== 'string' || !ID_RE.test(requestId)) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid link')
  }
  const ref = admin.firestore().collection('visitRequests').doc(requestId)
  const snap = await ref.get()
  // 없는 문서와 틀린 토큰을 같은 오류로 — 문서 존재 여부를 흘리지 않는다.
  if (!snap.exists || !tokenMatches(snap.data()!.token, token)) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid link')
  }
  return { ref, request: await withTrustedUnits(snap.data() as VisitRequestDoc) }
}

/** 공개 링크: 요청 정보와 지금까지 들어온 추천(모든 스테이크)을 돌려준다. */
export const getVisitRequestPublic = functions
  .region(REGION)
  .https.onCall(async (data: { requestId?: unknown; token?: unknown }) => {
    const { ref, request } = await openRequest(data?.requestId, data?.token)
    const recSnap = await ref.collection('recommendations').get()
    const recs = recSnap.docs.map((d) => d.data() as RecommendationDoc)
    const units = request.units ?? []
    const wardStats = wardVisitStats(
      units,
      await schedulesForUnits(units.map((u) => u.id)),
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
    requestId?: unknown
    token?: unknown
    unitId?: unknown
    submitterName?: unknown
    note?: unknown
    picks?: unknown
  }) => {
    const { ref, request } = await openRequest(data?.requestId, data?.token)
    const db = admin.firestore()

    await db.runTransaction(async (tx) => {
      // 확정·마감과 경합할 수 있어 트랜잭션 안에서 요청을 다시 읽고 판정한다.
      // 스테이크·와드 목록만은 위에서 걸러 둔 것을 쓴다 — 그 목록은 만든 뒤 바뀌지 않는다.
      const fresh = await tx.get(ref)
      const current = { ...(fresh.data() as VisitRequestDoc), units: request.units }
      const result = validateRecommendation(current, data ?? {})
      if (!result.ok) throw new functions.https.HttpsError(result.code, result.message)

      const unitId = data.unitId as string
      const recRef = ref.collection('recommendations').doc(unitId)
      // 공개 화면은 남의 메모를 받지 못한다 — 메모를 안 보냈으면 예전 메모를 그대로 둔다.
      const note = result.note ?? ((await tx.get(recRef)).data()?.note ?? '')
      const doc: RecommendationDoc = {
        unitId,
        submitterName: result.submitterName,
        note,
        picks: result.picks,
        submittedAt: new Date().toISOString(),
      }
      tx.set(recRef, doc)
      // 목록 화면이 하위 컬렉션을 일일이 읽지 않고 응답 현황을 그리도록 부모에 적어 둔다.
      tx.update(ref, { respondedUnitIds: admin.firestore.FieldValue.arrayUnion(unitId) })
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
    const decided = request.decisions?.[date]

    if (data.clear === true) {
      if (!(request.sundays ?? []).includes(date)) {
        throw new functions.https.HttpsError('invalid-argument', 'Date is not part of this request')
      }
      const batch = db.batch()
      // 확정이 가리키는 일정을 지운다. 그 일정이 이미 다른 날로 옮겨졌으면 건드리지 않는다 —
      // 그건 이제 이 일요일의 확정이 아니라 칠십인이 따로 잡은 방문이다.
      if (decided?.scheduleId && ID_RE.test(decided.scheduleId)) {
        const ref = db.collection('schedules').doc(decided.scheduleId)
        const cur = await ref.get()
        if (cur.exists && cur.data()!.date === date) batch.delete(ref)
      }
      batch.update(reqRef, { [`decisions.${date}`]: admin.firestore.FieldValue.delete() })
      await batch.commit()
      return { success: true }
    }

    const check = checkDecision(await withTrustedUnits(request), data)
    if (!check.ok) throw new functions.https.HttpsError(check.code, check.message)

    // 이 일요일의 일정 자리는 결정적 id다. 다만 그 자리의 일정이 일정 화면에서 다른 날로 옮겨져
    // 있으면 덮어쓰지 않고 새 문서를 쓴다 — 덮어쓰면 옮겨 둔 방문이 이 날로 끌려온다.
    // 이미 이 날 확정이 있으면 그 일정을 다시 쓴다(와드만 바꾸는 재확정).
    const reuseId = decided?.scheduleId && ID_RE.test(decided.scheduleId)
      ? decided.scheduleId
      : decisionScheduleId(requestId, date)
    let scheduleRef = db.collection('schedules').doc(reuseId)
    let existing = await scheduleRef.get()
    if (existing.exists && existing.data()!.date !== date && existing.data()!.status !== 'cancelled') {
      scheduleRef = db.collection('schedules').doc()
      existing = await scheduleRef.get()
    }
    const scheduleId = scheduleRef.id

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

/**
 * 추천 요청이 만든 방문 일정을 일정 화면에서 지우거나(cancelled) 날짜를 옮기면 요청의 확정을
 * 거둔다. 그러지 않으면 요청에는 「확정」이 남아 회장들이 그 일요일을 추천할 수 없다.
 * 이 트리거는 visitRequests만 쓰므로 schedules 트리거들(calendarSync 등)을 다시 깨우지 않는다.
 */
export const visitRequestScheduleSync = functions
  .region(REGION)
  .firestore.document('schedules/{scheduleId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : undefined
    const after = change.after.exists ? change.after.data() : undefined
    const date = staleDecisionDate(before, after)
    if (!date || typeof before?.visitRequestId !== 'string' || !ID_RE.test(before.visitRequestId)) return

    const db = admin.firestore()
    const scheduleId = context.params.scheduleId as string
    const reqRef = db.collection('visitRequests').doc(before.visitRequestId)
    await db.runTransaction(async (tx) => {
      const [reqSnap, schedSnap] = await Promise.all([
        tx.get(reqRef),
        tx.get(db.collection('schedules').doc(scheduleId)),
      ])
      if (!reqSnap.exists) return
      const decision = (reqSnap.data() as VisitRequestDoc).decisions?.[date]
      if (decision?.scheduleId !== scheduleId) return
      // 이벤트가 늦게 도착하는 사이 같은 날이 다시 확정됐을 수 있다 — 지금 문서가 살아 있으면 둔다.
      const now = schedSnap.exists ? schedSnap.data()! : undefined
      if (now && now.status !== 'cancelled' && now.date === date) return
      tx.update(reqRef, { [`decisions.${date}`]: admin.firestore.FieldValue.delete() })
    })
  })
