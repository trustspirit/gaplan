import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { DATE_RE, TIME_RE, isValidUrl } from './validators'

interface AdminCreateScheduleRequest {
  type: 'ward_visit' | 'interview' | 'meeting'
  seventyUid: string
  unitId?: string
  wardName?: string
  presidentUid?: string
  date: string
  startTime: string
  endTime: string
  notes?: string
  zoomLink?: string
  customTitle?: string
  projectId?: string
  presidentAccompanied?: boolean
  targetKind?: 'stake_president' | 'ward_bishop' | 'other'
  wardId?: string
}

export const adminCreateSchedule = functions
  .region('asia-northeast3')
  .https.onCall(async (data: AdminCreateScheduleRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }

    const { type, seventyUid, unitId, wardName, presidentUid, date, startTime, endTime, notes, zoomLink, customTitle, projectId, presidentAccompanied, targetKind, wardId } = data

    if (!['ward_visit', 'interview', 'meeting'].includes(type)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid type')
    }
    if (!DATE_RE.test(date)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid date format (YYYY-MM-DD)')
    }
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid time format (HH:mm)')
    }
    if (startTime >= endTime) {
      throw new functions.https.HttpsError('invalid-argument', 'endTime must be after startTime')
    }
    if (type === 'ward_visit') {
      if (!unitId) throw new functions.https.HttpsError('invalid-argument', 'unitId required for ward_visit')
      if (!wardName || wardName.trim().length < 1 || wardName.trim().length > 100) {
        throw new functions.https.HttpsError('invalid-argument', 'wardName required (1-100 chars) for ward_visit')
      }
    }
    if (type !== 'ward_visit' && wardName) {
      throw new functions.https.HttpsError('invalid-argument', 'wardName is only allowed for ward_visit type')
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
    if (projectId !== undefined && typeof projectId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'projectId must be a string')
    }
    if (presidentAccompanied !== undefined && typeof presidentAccompanied !== 'boolean') {
      throw new functions.https.HttpsError('invalid-argument', 'presidentAccompanied must be a boolean')
    }
    if (targetKind !== undefined) {
      if (type === 'ward_visit') {
        throw new functions.https.HttpsError('invalid-argument', 'targetKind is only for interview/meeting')
      }
      if (!['stake_president', 'ward_bishop', 'other'].includes(targetKind)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid targetKind')
      }
    }
    if (wardId !== undefined && (typeof wardId !== 'string' || wardId.length > 100)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid wardId')
    }
    if (targetKind === 'ward_bishop' && !wardId) {
      throw new functions.https.HttpsError('invalid-argument', 'wardId required when targetKind is ward_bishop')
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

    await db.collection('schedules').add({
      type,
      seventyUid,
      unitId: unitId ?? '',
      wardName: (type === 'ward_visit' && wardName) ? wardName.trim() : null,
      presidentUid: presidentUid ?? null,
      date,
      startTime,
      endTime,
      notes: notes ?? null,
      zoomLink: zoomLink?.trim() ?? null,
      customTitle: customTitle?.trim() ?? null,
      projectId: (projectId && projectId.trim()) ? projectId.trim() : null,
      presidentAccompanied: (type === 'ward_visit' && presidentAccompanied === true) ? true : null,
      targetKind: (type !== 'ward_visit' && targetKind) ? targetKind : null,
      wardId: wardId ?? null,
      status: 'confirmed',
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true }
  })
