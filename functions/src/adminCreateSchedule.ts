import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

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
}

export const adminCreateSchedule = functions
  .region('asia-northeast3')
  .https.onCall(async (data: AdminCreateScheduleRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }

    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(context.auth.uid).get()
    const callerRole = callerSnap.data()?.role
    if (!['admin', 'seventy'].includes(callerRole)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin or seventy only')
    }
    if (callerRole === 'seventy' && context.auth.uid !== data.seventyUid) {
      throw new functions.https.HttpsError('permission-denied', 'Seventy can only create schedules for themselves')
    }

    const seventySnap = await db.collection('users').doc(data.seventyUid).get()
    if (!seventySnap.exists || seventySnap.data()?.role !== 'seventy') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid seventyUid: user not found or not a seventy')
    }

    const { type, seventyUid, unitId, wardName, presidentUid, date, startTime, endTime, notes } = data

    if (presidentUid) {
      const presidentSnap = await db.collection('users').doc(presidentUid).get()
      if (!presidentSnap.exists || presidentSnap.data()?.role !== 'president') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid presidentUid: user not found or not a president')
      }
    }

    if (!['ward_visit', 'interview', 'meeting'].includes(type)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid type')
    }
    if (!seventyUid || typeof seventyUid !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'seventyUid required')
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
    if (type === 'interview' && !unitId) {
      throw new functions.https.HttpsError('invalid-argument', 'unitId required for interview')
    }
    if (type !== 'ward_visit' && wardName) {
      throw new functions.https.HttpsError('invalid-argument', 'wardName is only allowed for ward_visit type')
    }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
      throw new functions.https.HttpsError('invalid-argument', 'notes max 500 chars')
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
      status: 'confirmed',
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true }
  })
