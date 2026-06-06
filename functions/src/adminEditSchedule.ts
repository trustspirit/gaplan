import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface AdminEditScheduleRequest {
  scheduleId: string
  updates: {
    date?: string
    startTime?: string
    endTime?: string
    notes?: string | null
    unitId?: string
    wardName?: string | null
    presidentUid?: string | null
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

export const adminEditSchedule = functions
  .region('asia-northeast3')
  .https.onCall(async (data: AdminEditScheduleRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }

    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(context.auth.uid).get()
    const callerRole = callerSnap.data()?.role
    if (!['admin', 'seventy'].includes(callerRole)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin or seventy only')
    }

    const { scheduleId, updates } = data

    if (!scheduleId || !updates) {
      throw new functions.https.HttpsError('invalid-argument', 'scheduleId and updates required')
    }

    // Whitelist and validate permitted fields
    const allowed: Record<string, unknown> = {}
    if (updates.date !== undefined) {
      if (typeof updates.date !== 'string' || !DATE_RE.test(updates.date)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid date format')
      }
      allowed.date = updates.date
    }
    if (updates.startTime !== undefined) {
      if (typeof updates.startTime !== 'string' || !TIME_RE.test(updates.startTime)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid startTime format')
      }
      allowed.startTime = updates.startTime
    }
    if (updates.endTime !== undefined) {
      if (typeof updates.endTime !== 'string' || !TIME_RE.test(updates.endTime)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid endTime format')
      }
      allowed.endTime = updates.endTime
    }
    if (updates.notes !== undefined) {
      if (updates.notes !== null && (typeof updates.notes !== 'string' || updates.notes.length > 500)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid notes')
      }
      allowed.notes = updates.notes
    }
    if (updates.unitId !== undefined) {
      if (typeof updates.unitId !== 'string' || updates.unitId.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid unitId')
      }
      allowed.unitId = updates.unitId
    }
    if (updates.wardName !== undefined) {
      if (updates.wardName !== null && typeof updates.wardName !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid wardName')
      }
      allowed.wardName = updates.wardName
    }
    if (updates.presidentUid !== undefined) {
      if (updates.presidentUid !== null && typeof updates.presidentUid !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid presidentUid')
      }
      allowed.presidentUid = updates.presidentUid
    }

    if (Object.keys(allowed).length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'No valid updates provided')
    }

    const scheduleRef = db.collection('schedules').doc(scheduleId)
    const snap = await scheduleRef.get()

    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Schedule not found')
    }

    if (callerRole === 'seventy' && snap.data()?.seventyUid !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Seventy can only edit their own schedules')
    }

    // Validate startTime < endTime cross-field
    if (allowed.startTime !== undefined || allowed.endTime !== undefined) {
      const current = snap.data()!
      const effectiveStart = (allowed.startTime as string | undefined) ?? current.startTime
      const effectiveEnd = (allowed.endTime as string | undefined) ?? current.endTime
      if (effectiveStart >= effectiveEnd) {
        throw new functions.https.HttpsError('invalid-argument', 'endTime must be after startTime')
      }
    }

    // Double-booking guard — only when date or startTime changes
    if (allowed.date !== undefined || allowed.startTime !== undefined) {
      const current = snap.data()!
      const checkDate = (allowed.date as string | undefined) ?? current.date
      const checkStart = (allowed.startTime as string | undefined) ?? current.startTime
      const duplicate = await db.collection('schedules')
        .where('seventyUid', '==', current.seventyUid)
        .where('date', '==', checkDate)
        .where('startTime', '==', checkStart)
        .where('status', '==', 'confirmed')
        .limit(1)
        .get()
      const conflict = duplicate.docs.find(d => d.id !== scheduleId)
      if (conflict) {
        throw new functions.https.HttpsError('already-exists', '해당 시간에 이미 확정된 일정이 있습니다.')
      }
    }

    // calendarSync trigger handles GCal update automatically
    await scheduleRef.update({
      ...allowed,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid,
    })

    return { success: true }
  })
