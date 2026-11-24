import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import { BACKGROUND_OPTS, PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'
import { confirmDeniedReason } from './confirmGuards'
import { resolveScheduleLocation } from './adminScheduleFields'
import { REGION_UNITS } from './regions'
import { lastVisitRegion } from './visitRegionRotation'
import { WARD_UNITS } from './wardUnitMap'
import {
  sundayAvailability, isSundayBusy, publicCalendarEvents, type SundayStatus,
} from './visitSundayAvailability'
import {
  validateRecommendation,
  publicVisitRequestView,
  checkDecision,
  conflictingVisitId,
  decisionScheduleId,
  wardVisitStats,
  trustedUnits,
  staleDecisionDate,
  unitIdForToken,
  publicSundayStatusForUnit,
  sundaysForUnit,
  type VisitRequestDoc,
  type RecommendationDoc,
} from './visitRequestLogic'
import { PUBLIC_MAX_INSTANCES } from './publicLimits'
import Anthropic from '@anthropic-ai/sdk'
import { checkPlanBalance } from './visitPlanBalance'
import { buildReviewPayload, reviewPlan } from './visitPlanReview'
import { SHARE_TEMPLATE_MAX } from './shareTemplate'
import { translateShareTemplate as translateText } from './shareTranslate'
import {
  englishForPage, englishIsCurrent, englishSource, presidentsOfUnits, PRESIDENT_ROLES, type RequestEnglish,
} from './requestEnglish'
import { translateRequestTexts } from './requestTranslate'

const ID_RE = /^[\w-]+$/
const DEFAULT_START = '10:00'
const DEFAULT_END = '13:00'

/**
 * 요청 문서의 스테이크·와드 목록을 그 칠십인 담당 CC와 서버 와드 표로 거른다.
 * 목록은 클라이언트가 찍어 보낸 것이라 그대로 믿지 않는다(visitRequestLogic.trustedUnits).
 */
async function withTrustedUnits(request: VisitRequestDoc): Promise<VisitRequestDoc> {
  const { unitIds } = await seventyScope(request.seventyUid)
  return { ...request, units: trustedUnits(request.units, new Set(unitIds), WARD_UNITS, UNIT_REGIONS) }
}

/** 칠십인의 담당 CC와 그 CC의 단위들. 사용자 문서를 서버에서 읽는다. */
async function seventyScope(seventyUid: string | undefined) {
  const snap = seventyUid ? await admin.firestore().collection('users').doc(seventyUid).get() : null
  const seventy = snap?.data() ?? {}
  const regionIds: string[] = Array.isArray(seventy.regionIds) && seventy.regionIds.length
    ? seventy.regionIds
    : (typeof seventy.regionId === 'string' ? [seventy.regionId] : [])
  return { regionIds, unitIds: regionIds.flatMap((r) => REGION_UNITS[r] ?? []) }
}

/** unitId -> 소속 CC. REGION_UNITS를 뒤집은 것 */
const UNIT_REGIONS: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_UNITS).flatMap(([regionId, ids]) => ids.map((id) => [id, regionId])),
)

const DAY_MS = 24 * 60 * 60 * 1000
function shiftDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

/**
 * 일요일마다 칠십인이 비어 있는지(visitSundayAvailability). 여러 날 일정·행사가 앞에서 걸쳐
 * 들어올 수 있어 첫 일요일보다 넉넉히 앞부터 읽는다.
 * ignoreScheduleIds: 이 요청이 확정해 만든 방문 — 그 날을 "일정 있음"으로 세지 않는다.
 */
async function loadSundayStatus(
  seventyUid: string,
  sundays: string[],
  ignoreScheduleIds: ReadonlySet<string> = new Set(),
): Promise<Record<string, SundayStatus>> {
  if (sundays.length === 0) return {}
  const db = admin.firestore()
  const sorted = [...sundays].sort()
  const from = shiftDays(sorted[0], -31)
  const to = sorted[sorted.length - 1]
  const [scope, schedSnap, eventSnap, slotSnap] = await Promise.all([
    seventyScope(seventyUid),
    db.collection('schedules')
      .where('seventyUid', '==', seventyUid)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .get(),
    db.collection('generalSchedules').where('date', '>=', from).where('date', '<=', to).get(),
    db.collection('availability').doc(seventyUid).collection('slots')
      .where('type', '==', 'override')
      .get(),
  ])
  return sundayAvailability({
    sundays: sorted,
    regionIds: scope.regionIds,
    regionUnitIds: scope.unitIds,
    schedules: schedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    events: eventSnap.docs.map((d) => d.data()),
    blockedDates: slotSnap.docs
      .map((d) => d.data())
      .filter((x) => x.isBlocked === true && typeof x.date === 'string')
      .map((x) => x.date as string),
    ignoreScheduleIds,
    unitRegions: UNIT_REGIONS,
  })
}

/**
 * 추천 화면 달력용 공개 행사 — 요청의 첫 일요일이 든 달 1일부터 마지막 일요일이 든 달 말일까지.
 * 그 앞에서 시작해 걸쳐 들어오는 여러 날 행사를 위해 한 달 앞부터 읽는다.
 */
async function loadCalendarEvents(seventyUid: string, sundays: string[]) {
  if (sundays.length === 0) return []
  const sorted = [...sundays].sort()
  const from = `${sorted[0].slice(0, 7)}-01`
  const last = sorted[sorted.length - 1]
  const [y, m] = last.split('-').map(Number)
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  const [scope, snap] = await Promise.all([
    seventyScope(seventyUid),
    admin.firestore().collection('generalSchedules')
      .where('date', '>=', shiftDays(from, -31))
      .where('date', '<=', to)
      .get(),
  ])
  return publicCalendarEvents(snap.docs.map((d) => d.data()), scope.regionIds, scope.unitIds, from, to, UNIT_REGIONS)
}

function decidedScheduleIds(request: VisitRequestDoc): Set<string> {
  return new Set(
    Object.values(request.decisions ?? {})
      .map((d) => d.scheduleId)
      .filter((id): id is string => typeof id === 'string'),
  )
}

/**
 * 공개 링크(`/recommend/{requestId}/{token}`)의 요청을 연다. 토큰으로 질의하지 않고 id로 문서를
 * 집은 뒤 토큰을 비교한다 — 토큰은 요청을 만든 클라이언트가 정하므로, 질의로 찾으면 남의 링크를
 * 본 사람이 같은 토큰의 요청을 하나 더 만들어 그 링크를 가로챌 수 있다.
 * 링크는 스테이크마다 따로다 — 토큰이 연 스테이크(unitId)만 보고 그 스테이크로만 추천한다.
 */
async function openRequest(requestId: unknown, token: unknown) {
  if (typeof requestId !== 'string' || !ID_RE.test(requestId)) {
    throw new HttpsError('permission-denied', 'Invalid link')
  }
  const ref = admin.firestore().collection('visitRequests').doc(requestId)
  const snap = await ref.get()
  // 없는 문서와 틀린 토큰을 같은 오류로 — 문서 존재 여부를 흘리지 않는다.
  if (!snap.exists) throw new HttpsError('permission-denied', 'Invalid link')
  const request = await withTrustedUnits(snap.data() as VisitRequestDoc)
  const unitId = unitIdForToken(request, token)
  if (!unitId) throw new HttpsError('permission-denied', 'Invalid link')
  return { ref, request, unitId }
}

/** 공개 링크: 그 스테이크 기준의 요청 정보와 그 스테이크의 추천. 다른 스테이크는 확정 여부만. */
export const getVisitRequestPublic = onCall(
  { ...PUBLIC_HTTP_OPTS, maxInstances: PUBLIC_MAX_INSTANCES },
  async (req: CallableRequest<{ requestId?: unknown; token?: unknown }>) => {
    const data = req.data
    const { ref, request, unitId } = await openRequest(data?.requestId, data?.token)
    const recSnap = await ref.collection('recommendations').doc(unitId).get()
    const recs = recSnap.exists ? [recSnap.data() as RecommendationDoc] : []
    const units = (request.units ?? []).filter((u) => u.id === unitId)
    const [unitSchedules, sundayStatus, calendarEvents] = await Promise.all([
      schedulesForUnits(units.map((u) => u.id)),
      loadSundayStatus(request.seventyUid ?? '', request.sundays ?? [], decidedScheduleIds(request)),
      loadCalendarEvents(request.seventyUid ?? '', request.sundays ?? []),
    ])
    const wardStats = wardVisitStats(units, unitSchedules, todayInSeoul())
    return {
      ...publicVisitRequestView(request, recs, unitId),
      // 영어로 연 회장에게 보일 제목·강조 사항·칠십인 이름 — 원문이 바뀐 뒤면 보내지 않는다
      english: englishForPage((request as { english?: RequestEnglish }).english, request),
      wardStats,
      sundayStatus: publicSundayStatusForUnit(sundayStatus, unitId),
      // 다른 스테이크만 대상인 행사는 빼고, 대상 단위 목록도 이 스테이크만 남긴다
      calendarEvents: calendarEvents
        .filter((e) => !e.unitIds || e.unitIds.includes(unitId))
        .map((e) => (e.unitIds ? { ...e, unitIds: [unitId] } : e)),
    }
  },
)

/** 칠십인 담당 CC의 모든 와드 방문 기록. 회장들이 공개 링크에서 보는 숫자와 같은 함수로 센다. */
async function seventyWardStats(seventyUid: string) {
  const { unitIds } = await seventyScope(seventyUid)
  const units = unitIds.map((id) => ({
    id,
    ko: '',
    en: '',
    wards: Object.entries(WARD_UNITS)
      .filter(([, w]) => w.unitId === id)
      .map(([wardId, w]) => ({ id: wardId, ko: w.ko, en: '' })),
  }))
  return wardVisitStats(units, await schedulesForUnits(unitIds), todayInSeoul())
}

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
 * 공개 링크: 링크가 연 스테이크의 추천을 저장한다. 스테이크당 문서 하나라 다시 내면 덮어쓴다 —
 * 회장이 마음을 바꿀 수 있어야 한다. 다른 스테이크의 unitId로는 낼 수 없다.
 */
export const submitVisitRecommendation = onCall(
  { ...PUBLIC_HTTP_OPTS, maxInstances: PUBLIC_MAX_INSTANCES },
  async (req: CallableRequest<{
    requestId?: unknown
    token?: unknown
    unitId?: unknown
    submitterName?: unknown
    note?: unknown
    picks?: unknown
  }>) => {
    const data = req.data
    const { ref, request, unitId: linkUnitId } = await openRequest(data?.requestId, data?.token)
    if (data?.unitId !== linkUnitId) throw new HttpsError('permission-denied', 'Invalid link')
    const db = admin.firestore()
    // 칠십인 일정·대회로 막힌 일요일. 읽기가 여러 컬렉션이라 트랜잭션 밖에서 한 번 본다.
    const status = await loadSundayStatus(
      request.seventyUid ?? '',
      request.sundays ?? [],
      decidedScheduleIds(request),
    )
    const unavailable = (date: string, unitId: string) =>
      isSundayBusy(status[date]) || unitId in (status[date]?.unitBlocks ?? {})

    await db.runTransaction(async (tx) => {
      // 확정·마감과 경합할 수 있어 트랜잭션 안에서 요청을 다시 읽고 판정한다.
      // 스테이크·와드 목록만은 위에서 걸러 둔 것을 쓴다 — 그 목록은 만든 뒤 바뀌지 않는다.
      const fresh = await tx.get(ref)
      const freshDoc = fresh.data() as VisitRequestDoc
      // 이 스테이크 링크에 넣은 일요일만 받는다
      const current = { ...freshDoc, units: request.units, sundays: sundaysForUnit(freshDoc, linkUnitId) }
      const result = validateRecommendation(current, data ?? {}, unavailable)
      if (!result.ok) throw new HttpsError(result.code, result.message)

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
  },
)

/**
 * 로그인: 일요일 하나를 확정하거나(unitId·wardId), 확정을 거둔다(clear: true).
 * 확정하면 ward_visit 일정이 결정적 id로 만들어지고 — 같은 날을 다른 와드로 다시 확정하면
 * 같은 문서를 덮어쓴다 — 거두면 그 일정을 지운다. calendarSync 트리거가 캘린더를 따라간다.
 */
export const decideVisitRequestDate = onCall(
  PUBLIC_HTTP_OPTS,
  async (req: CallableRequest<{
    requestId?: unknown
    date?: unknown
    unitId?: unknown
    wardId?: unknown
    clear?: unknown
  }>) => {
    const data = req.data
    if (!req.auth) throw new HttpsError('unauthenticated', 'Login required')
    const requestId = data?.requestId
    if (typeof requestId !== 'string' || !ID_RE.test(requestId)) {
      throw new HttpsError('invalid-argument', 'Invalid requestId')
    }

    const db = admin.firestore()
    const callerUid = req.auth.uid
    const callerSnap = await db.collection('users').doc(callerUid).get()
    const caller = callerSnap.data() ?? {}

    const reqRef = db.collection('visitRequests').doc(requestId)
    const reqSnap = await reqRef.get()
    if (!reqSnap.exists) throw new HttpsError('not-found', 'Request not found')
    const request = reqSnap.data() as VisitRequestDoc

    const denied = confirmDeniedReason(
      { role: caller.role, uid: callerUid, assignedSeventyUid: caller.assignedSeventyUid },
      request.seventyUid,
    )
    if (denied) throw new HttpsError('permission-denied', denied)

    const date = typeof data.date === 'string' ? data.date : ''
    const decided = request.decisions?.[date]

    if (data.clear === true) {
      if (!(request.sundays ?? []).includes(date)) {
        throw new HttpsError('invalid-argument', 'Date is not part of this request')
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
    if (!check.ok) throw new HttpsError(check.code, check.message)

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
      throw new HttpsError(
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
  },
)

/**
 * 추천 요청이 만든 방문 일정을 일정 화면에서 지우거나(cancelled) 날짜를 옮기면 요청의 확정을
 * 거둔다. 그러지 않으면 요청에는 「확정」이 남아 회장들이 그 일요일을 추천할 수 없다.
 * 이 트리거는 visitRequests만 쓰므로 schedules 트리거들(calendarSync 등)을 다시 깨우지 않는다.
 */
export const visitRequestScheduleSync = onDocumentWritten(
  { ...BACKGROUND_OPTS, document: 'schedules/{scheduleId}' },
  async (event) => {
    if (!event.data) return
    const change = event.data
    const before = change.before.exists ? change.before.data() : undefined
    const after = change.after.exists ? change.after.data() : undefined
    const date = staleDecisionDate(before, after)
    if (!date || typeof before?.visitRequestId !== 'string' || !ID_RE.test(before.visitRequestId)) return

    const db = admin.firestore()
    const scheduleId = event.params.scheduleId as string
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
  },
)

/**
 * 로그인: 칠십인의 일요일별 일정 상황(요청 만들기·확정 화면용). 공개 링크와 달리 일정 제목까지 준다.
 * 집행서기는 규칙상 칠십인의 가용 시간 설정을 읽을 수 없어 서버가 대신 읽는다.
 */
export const getVisitSundayStatus = onCall(
  PUBLIC_HTTP_OPTS,
  async (req: CallableRequest<{
    seventyUid?: unknown; sundays?: unknown; requestId?: unknown; withWardStats?: unknown
  }>) => {
    const data = req.data
    if (!req.auth) throw new HttpsError('unauthenticated', 'Login required')
    const seventyUid = typeof data?.seventyUid === 'string' ? data.seventyUid : ''
    const sundays = Array.isArray(data?.sundays)
      ? data.sundays.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      : []
    if (!seventyUid || !ID_RE.test(seventyUid) || sundays.length === 0 || sundays.length > 60) {
      throw new HttpsError('invalid-argument', 'Invalid request')
    }

    const db = admin.firestore()
    const caller = (await db.collection('users').doc(req.auth.uid).get()).data() ?? {}
    const denied = confirmDeniedReason(
      { role: caller.role, uid: req.auth.uid, assignedSeventyUid: caller.assignedSeventyUid },
      seventyUid,
    )
    if (denied) throw new HttpsError('permission-denied', denied)

    let ignore = new Set<string>()
    if (typeof data.requestId === 'string' && ID_RE.test(data.requestId)) {
      const reqSnap = await db.collection('visitRequests').doc(data.requestId).get()
      const req = reqSnap.data() as VisitRequestDoc | undefined
      if (req && req.seventyUid === seventyUid) ignore = decidedScheduleIds(req)
    }
    const first = [...sundays].sort()[0]
    const [status, before, wardStats] = await Promise.all([
      loadSundayStatus(seventyUid, sundays, ignore),
      // 분기 경계에서 CC가 이어지지 않게 — 그 전 넉 달의 와드 방문 중 마지막 것의 CC
      db.collection('schedules')
        .where('seventyUid', '==', seventyUid)
        .where('date', '>=', shiftDays(first, -120))
        .where('date', '<', first)
        .select('type', 'status', 'date', 'unitId')
        .get(),
      // 요청을 만들기 전에 일요일마다 어느 와드가 급한지 보여 주려고 — 공개 링크와 같은 집계
      data.withWardStats === true ? seventyWardStats(seventyUid) : Promise.resolve(undefined),
    ])
    return {
      status,
      lastVisitRegion: lastVisitRegion(before.docs.map((d) => d.data()), first, UNIT_REGIONS),
      ...(wardStats ? { wardStats } : {}),
    }
  },
)

/**
 * 칠십인·집행서기: 스테이크별 일요일 배정을 Claude에게 검토받는다(버튼을 누를 때만).
 * 요청·방문 기록·일요일 상황은 서버에서 직접 읽고, 사람·비밀 값을 뺀 요약만 보낸다(visitPlanReview).
 * 키(ANTHROPIC_API_KEY)가 없으면 failed-precondition — 화면은 규칙 점검만 보인다.
 */
export const reviewVisitPlan = onCall(
  { ...PUBLIC_HTTP_OPTS, timeoutSeconds: 60, maxInstances: 3 },
  async (req: CallableRequest<{ requestId?: unknown }>) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Login required')
    const requestId = req.data?.requestId
    if (typeof requestId !== 'string' || !ID_RE.test(requestId)) {
      throw new HttpsError('invalid-argument', 'Invalid request')
    }
    const db = admin.firestore()
    const [callerSnap, reqSnap] = await Promise.all([
      db.collection('users').doc(req.auth.uid).get(),
      db.collection('visitRequests').doc(requestId).get(),
    ])
    if (!reqSnap.exists) throw new HttpsError('not-found', 'Request not found')
    const caller = callerSnap.data() ?? {}
    const raw = reqSnap.data() as VisitRequestDoc
    const denied = confirmDeniedReason(
      { role: caller.role, uid: req.auth.uid, assignedSeventyUid: caller.assignedSeventyUid },
      raw.seventyUid,
    )
    if (denied) throw new HttpsError('permission-denied', denied)

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new HttpsError('failed-precondition', 'ai-unavailable')

    const request = await withTrustedUnits(raw)
    const units = request.units ?? []
    const sundays = request.sundays ?? []
    const today = todayInSeoul()
    const [schedules, status] = await Promise.all([
      schedulesForUnits(units.map((u) => u.id)),
      loadSundayStatus(request.seventyUid ?? '', sundays, decidedScheduleIds(request)),
    ])
    // 공개 링크와 같은 집계 — 요청에 찍힌 스테이크 기준
    const wardStats = wardVisitStats(units, schedules, today)
    const base = {
      sundays, units, sundayRegions: request.sundayRegions,
      unitSundays: request.unitSundays, decisions: request.decisions,
    }
    const issues = checkPlanBalance({ request: base, status, wardStats, today })
    const payload = buildReviewPayload({ request, wardStats, status, issues, today })
    try {
      const suggestions = await reviewPlan(new Anthropic({ apiKey }), payload)
      return { suggestions }
    } catch (err) {
      logger.error(`[reviewVisitPlan] failed request=${requestId}`, err)
      throw new HttpsError('internal', 'ai-failed')
    }
  },
)

/**
 * 칠십인·집행서기·관리자: 한국어 안내문을 교회 공식 문체의 영어로 옮긴다(저장할 때).
 * 저장은 하지 않는다 — 화면이 영어 칸에 넣고 두 안내문을 함께 저장한다.
 */
export const translateShareTemplate = onCall(
  { ...PUBLIC_HTTP_OPTS, timeoutSeconds: 60, maxInstances: 3 },
  async (req: CallableRequest<{ text?: unknown }>) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Login required')
    const text = req.data?.text
    if (typeof text !== 'string' || !text.trim() || text.length > SHARE_TEMPLATE_MAX) {
      throw new HttpsError('invalid-argument', 'Invalid text')
    }
    const caller = (await admin.firestore().collection('users').doc(req.auth.uid).get()).data() ?? {}
    if (!['admin', 'seventy', 'exec_secretary'].includes(caller.role)) {
      throw new HttpsError('permission-denied', 'Not allowed')
    }
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new HttpsError('failed-precondition', 'ai-unavailable')
    try {
      return { english: await translateText(new Anthropic({ apiKey }), text) }
    } catch (err) {
      logger.error('[translateShareTemplate] failed', err)
      throw new HttpsError('internal', 'ai-failed')
    }
  },
)

/**
 * 칠십인·집행서기·관리자: 영어로 보내는 스테이크를 위해 요청의 제목·강조 사항·칠십인 이름·회장 이름을
 * 영어로 옮겨 요청 문서(english)에 둔다. 원문이 그대로면 다시 옮기지 않는다.
 */
export const translateVisitRequest = onCall(
  { ...PUBLIC_HTTP_OPTS, timeoutSeconds: 60, maxInstances: 3 },
  async (req: CallableRequest<{ requestId?: unknown }>) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Login required')
    const requestId = req.data?.requestId
    if (typeof requestId !== 'string' || !ID_RE.test(requestId)) {
      throw new HttpsError('invalid-argument', 'Invalid request')
    }
    const db = admin.firestore()
    const ref = db.collection('visitRequests').doc(requestId)
    const [callerSnap, reqSnap, leaderSnap] = await Promise.all([
      db.collection('users').doc(req.auth.uid).get(),
      ref.get(),
      db.collection('leaders').where('role', 'in', PRESIDENT_ROLES).get(),
    ])
    if (!reqSnap.exists) throw new HttpsError('not-found', 'Request not found')
    const caller = callerSnap.data() ?? {}
    const raw = reqSnap.data() as VisitRequestDoc & { english?: RequestEnglish }
    const denied = confirmDeniedReason(
      { role: caller.role, uid: req.auth.uid, assignedSeventyUid: caller.assignedSeventyUid },
      raw.seventyUid,
    )
    if (denied) throw new HttpsError('permission-denied', denied)

    const request = await withTrustedUnits(raw)
    const leaders = leaderSnap.docs.map((d) => d.data() as { unitNameKo: string; role: string; name: string })
    const source = englishSource(request, presidentsOfUnits(request.units ?? [], leaders))
    if (englishIsCurrent(raw.english, source)) return { english: raw.english }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new HttpsError('failed-precondition', 'ai-unavailable')
    try {
      const english: RequestEnglish = { ...(await translateRequestTexts(new Anthropic({ apiKey }), source)), source }
      await ref.update({ english })
      return { english }
    } catch (err) {
      logger.error(`[translateVisitRequest] failed request=${requestId}`, err)
      throw new HttpsError('internal', 'ai-failed')
    }
  },
)
