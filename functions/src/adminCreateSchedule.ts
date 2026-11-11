import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { DATE_RE, TIME_RE, isValidUrl } from './validators'
import { validateRelatedVisit } from './relatedVisit'
import { buildCcCouncilTitle, isKnownRegionId } from './ccCouncil'
import { resolveScheduleLocation } from './adminScheduleFields'
import { canBeSeventyOnly } from './seventyOnly'
import { isMultiDaySchedule } from './scheduleDates'

interface AdminCreateScheduleRequest {
  type: 'ward_visit' | 'interview' | 'meeting'
  seventyUid: string
  unitId?: string
  regionId?: string
  wardName?: string
  presidentUid?: string
  date: string
  endDate?: string   // 여러 날 모임의 마지막 날 (meeting only). scheduleDates.ts 참고
  startTime: string
  endTime: string
  notes?: string
  zoomLink?: string
  location?: string
  customTitle?: string
  projectId?: string
  presidentAccompanied?: boolean
  targetKind?: 'stake_president' | 'ward_bishop' | 'other' | 'cc_council'
  wardId?: string
  relatedVisitId?: string
  seventyOnly?: boolean
}

export const adminCreateSchedule = functions
  .region('asia-northeast3')
  .https.onCall(async (data: AdminCreateScheduleRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }

    const { type, seventyUid, unitId, regionId, wardName, presidentUid, date, startTime, endTime, notes, zoomLink, location, customTitle, projectId, presidentAccompanied, targetKind, wardId, relatedVisitId, seventyOnly, endDate } = data

    if (!['ward_visit', 'interview', 'meeting'].includes(type)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid type')
    }
    if (!DATE_RE.test(date)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid date format (YYYY-MM-DD)')
    }
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid time format (HH:mm)')
    }
    // 여러 날은 모임만 된다. 접견·방문은 하루 안에 끝나는 일정이다.
    if (endDate !== undefined) {
      if (type !== 'meeting') {
        throw new functions.https.HttpsError('invalid-argument', 'endDate is only for meeting')
      }
      if (typeof endDate !== 'string' || !DATE_RE.test(endDate)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid endDate format (YYYY-MM-DD)')
      }
      if (endDate < date) {
        throw new functions.https.HttpsError('invalid-argument', 'endDate must not be before date')
      }
    }
    const multiDay = isMultiDaySchedule({ date, endDate })
    // 여러 날 모임은 startTime이 첫날, endTime이 마지막 날의 시각이라 서로 비교할 수 없다
    // (금요일 18:00 시작 – 토요일 12:00 종료).
    if (!multiDay && startTime >= endTime) {
      throw new functions.https.HttpsError('invalid-argument', 'endTime must be after startTime')
    }
    if (type === 'ward_visit') {
      if (!unitId) throw new functions.https.HttpsError('invalid-argument', 'unitId required for ward_visit')
      if (!wardName || wardName.trim().length < 1 || wardName.trim().length > 100) {
        throw new functions.https.HttpsError('invalid-argument', 'wardName required (1-100 chars) for ward_visit')
      }
    }
    // ward_visit이 아니어도 와드 대상 접견/모임(targetKind='ward_bishop')은 그 와드 이름을
    // 실어 보낸다 — 제목 규칙(scheduleRules.ts)이 접견에서도 wardName을 읽기 때문이다
    // (Controller ruling, Fix 1). 그래도 형식은 지켜야 하니 길이는 계속 검사한다.
    if (type !== 'ward_visit' && wardName !== undefined &&
      (typeof wardName !== 'string' || wardName.trim().length > 100)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid wardName')
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
      throw new functions.https.HttpsError('invalid-argument', 'notes max 500 chars')
    }
    if (zoomLink !== undefined) {
      // Check type restriction first for clearer error message
      if (type === 'ward_visit') {
        throw new functions.https.HttpsError('invalid-argument', 'zoomLink is not applicable to ward_visit')
      }
      const trimmed = typeof zoomLink === 'string' ? zoomLink.trim() : ''
      if (!trimmed || trimmed.length > 500 || !isValidUrl(trimmed)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid zoomLink URL')
      }
    }
    if (customTitle !== undefined) {
      if (type === 'ward_visit') {
        throw new functions.https.HttpsError('invalid-argument', 'customTitle is not applicable to ward_visit')
      }
      if (typeof customTitle !== 'string' || customTitle.trim().length === 0 || customTitle.length > 200) {
        throw new functions.https.HttpsError('invalid-argument', 'customTitle must be 1-200 chars')
      }
    }
    if (location !== undefined && location !== null) {
      const trimmed = typeof location === 'string' ? location.trim() : ''
      if (trimmed.length > 100) {
        throw new functions.https.HttpsError('invalid-argument', 'location max 100 chars')
      }
    }
    if (projectId !== undefined && typeof projectId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'projectId must be a string')
    }
    if (presidentAccompanied !== undefined && typeof presidentAccompanied !== 'boolean') {
      throw new functions.https.HttpsError('invalid-argument', 'presidentAccompanied must be a boolean')
    }
    if (seventyOnly !== undefined && typeof seventyOnly !== 'boolean') {
      throw new functions.https.HttpsError('invalid-argument', 'seventyOnly must be a boolean')
    }
    // 칠십인 전용은 대상이 '기타'인 접견/모임에만 둘 수 있다. 방문·협의 평의회·스테이크 회장·
    // 와드 감독처럼 대상이 정해진 일정은 공개 범위도 그 대상으로 정해져 있다.
    if (seventyOnly === true && !canBeSeventyOnly({ type, targetKind })) {
      throw new functions.https.HttpsError('invalid-argument', "seventyOnly is only for interview/meeting with targetKind 'other'")
    }
    if (targetKind !== undefined) {
      if (type === 'ward_visit') {
        throw new functions.https.HttpsError('invalid-argument', 'targetKind is only for interview/meeting')
      }
      if (!['stake_president', 'ward_bishop', 'other', 'cc_council'].includes(targetKind)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid targetKind')
      }
    }
    // CC 협의 평의회: 특정 스테이크가 아니라 CC 전체가 대상이므로 unitId 대신 regionId로 범위를 잡는다.
    if (targetKind === 'cc_council') {
      if (type !== 'meeting') {
        throw new functions.https.HttpsError('invalid-argument', 'cc_council is only valid for meeting type')
      }
      if (!regionId || !isKnownRegionId(regionId)) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid regionId required when targetKind is cc_council')
      }
      if (unitId) {
        throw new functions.https.HttpsError('invalid-argument', 'unitId must be empty for cc_council')
      }
    } else if (regionId !== undefined) {
      throw new functions.https.HttpsError('invalid-argument', 'regionId is only for cc_council meetings')
    }
    if (wardId !== undefined && (typeof wardId !== 'string' || wardId.length > 100)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid wardId')
    }
    if (targetKind === 'ward_bishop' && !wardId) {
      throw new functions.https.HttpsError('invalid-argument', 'wardId required when targetKind is ward_bishop')
    }
    if (relatedVisitId !== undefined && (typeof relatedVisitId !== 'string' || relatedVisitId.length > 200)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid relatedVisitId')
    }

    const db = admin.firestore()
    const [callerSnap, seventySnap] = await Promise.all([
      db.collection('users').doc(context.auth.uid).get(),
      db.collection('users').doc(seventyUid).get(),
    ])

    const callerData = callerSnap.data()
    const callerRole = callerData?.role
    if (!['admin', 'seventy', 'exec_secretary'].includes(callerRole)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin, seventy, or exec_secretary only')
    }
    if (callerRole === 'seventy' && context.auth.uid !== seventyUid) {
      throw new functions.https.HttpsError('permission-denied', 'Seventy can only create schedules for themselves')
    }
    if (callerRole === 'exec_secretary') {
      const assignedUid = callerData?.assignedSeventyUid as string | undefined
      if (!assignedUid) {
        throw new functions.https.HttpsError('permission-denied', 'exec_secretary has no assigned seventy')
      }
      if (seventyUid !== assignedUid) {
        throw new functions.https.HttpsError('permission-denied', 'exec_secretary can only create schedules for their assigned seventy')
      }
    }

    if (!seventySnap.exists || seventySnap.data()?.role !== 'seventy') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid seventyUid: user not found or not a seventy')
    }

    if (presidentUid) {
      const presidentSnap = await db.collection('users').doc(presidentUid).get()
      if (!presidentSnap.exists || presidentSnap.data()?.role !== 'president') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid presidentUid: user not found or not a president')
      }
    }

    let relatedVisitWardName: string | undefined
    if (relatedVisitId && relatedVisitId.trim()) {
      const trimmedRelatedVisitId = relatedVisitId.trim()
      const visitSnap = await db.collection('schedules').doc(trimmedRelatedVisitId).get()
      const visitData = visitSnap.exists ? (visitSnap.data() as { type?: string; seventyUid?: string; date?: string; wardName?: string }) : null
      const problem = validateRelatedVisit({
        scheduleType: type,
        scheduleSeventyUid: seventyUid,
        scheduleDate: date,
        visit: visitData,
      })
      if (problem) {
        throw new functions.https.HttpsError('invalid-argument', problem)
      }
      relatedVisitWardName = visitData?.wardName
    }

    const existing = await db.collection('schedules')
      .where('seventyUid', '==', seventyUid)
      .where('date', '==', date)
      .where('startTime', '==', startTime)
      .where('status', '==', 'confirmed')
      .limit(1)
      .get()
    if (!existing.empty) {
      throw new functions.https.HttpsError('already-exists', '해당 시간에 이미 확정된 일정이 있습니다.')
    }

    // CC 협의 평의회는 unitId가 없어 화면들이 이름을 못 붙인다. 앱/공개페이지/ICS/캘린더가
    // 모두 customTitle을 우선 표시하므로, 제목을 여기서 한 번 채워 두면 전 표시 경로가 맞는다.
    const resolvedCustomTitle =
      customTitle?.trim() ||
      (targetKind === 'cc_council' && regionId ? buildCcCouncilTitle(regionId) : null) ||
      (relatedVisitWardName ? `${relatedVisitWardName} 방문 사전 모임` : null)

    await db.collection('schedules').add({
      type,
      seventyUid,
      unitId: unitId ?? '',
      regionId: targetKind === 'cc_council' ? regionId : null,
      wardName: wardName ? wardName.trim() : null,
      presidentUid: presidentUid ?? null,
      date,
      endDate: multiDay ? endDate : null,
      startTime,
      endTime,
      notes: notes ?? null,
      zoomLink: zoomLink?.trim() ?? null,
      customTitle: resolvedCustomTitle,
      location: resolveScheduleLocation({ type, unitId, regionId, targetKind, wardName, zoomLink, location }),
      projectId: (projectId && projectId.trim()) ? projectId.trim() : null,
      presidentAccompanied: (type === 'ward_visit' && presidentAccompanied === true) ? true : null,
      targetKind: (type !== 'ward_visit' && targetKind) ? targetKind : null,
      wardId: wardId ?? null,
      relatedVisitId: (relatedVisitId && relatedVisitId.trim()) ? relatedVisitId.trim() : null,
      seventyOnly: seventyOnly === true,
      status: 'confirmed',
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true }
  })
