import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { DATE_RE, TIME_RE, isValidUrl } from './validators'

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
    zoomLink?: string | null
    customTitle?: string | null
    projectId?: string | null
    presidentAccompanied?: boolean | null
  }
}

export const adminEditSchedule = functions
  .region('asia-northeast3')
  .https.onCall(async (data: AdminEditScheduleRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }

    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(context.auth.uid).get()
    const callerRole = callerSnap.data()?.role
    if (!['admin', 'seventy', 'exec_secretary'].includes(callerRole)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin, seventy, or exec_secretary only')
    }

    const { scheduleId, updates } = data

    if (!scheduleId || !updates) {
      throw new functions.https.HttpsError('invalid-argument', 'scheduleId and updates required')
    }

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
    if (updates.zoomLink !== undefined) {
      if (updates.zoomLink !== null) {
        const trimmed = updates.zoomLink.trim()
        if (!trimmed || trimmed.length > 500 || !isValidUrl(trimmed)) {
          throw new functions.https.HttpsError('invalid-argument', 'Invalid zoomLink URL')
        }
        allowed.zoomLink = trimmed
      } else {
        allowed.zoomLink = null
      }
    }
    if (updates.customTitle !== undefined) {
      if (updates.customTitle !== null) {
        const trimmed = updates.customTitle.trim()
        if (!trimmed || trimmed.length > 200) {
          throw new functions.https.HttpsError('invalid-argument', 'customTitle must be 1-200 chars')
        }
        allowed.customTitle = trimmed
      } else {
        allowed.customTitle = null
      }
    }
    if (updates.projectId !== undefined) {
      allowed.projectId = updates.projectId || null
    }
    if (updates.presidentAccompanied !== undefined) {
      if (updates.presidentAccompanied !== null && typeof updates.presidentAccompanied !== 'boolean') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid presidentAccompanied')
      }
      allowed.presidentAccompanied = updates.presidentAccompanied === true ? true : null
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

    if (callerRole === 'exec_secretary') {
      const callerData = callerSnap.data()
      const assignedUid = callerData?.assignedSeventyUid as string | undefined
      if (!assignedUid || snap.data()?.seventyUid !== assignedUid) {
        throw new functions.https.HttpsError('permission-denied',
          'exec_secretary can only edit schedules for their assigned seventy')
      }
    }

    if (allowed.startTime !== undefined || allowed.endTime !== undefined) {
      const current = snap.data()!
      const effectiveStart = (allowed.startTime as string | undefined) ?? current.startTime
      const effectiveEnd = (allowed.endTime as string | undefined) ?? current.endTime
      if (effectiveStart >= effectiveEnd) {
        throw new functions.https.HttpsError('invalid-argument', 'endTime must be after startTime')
      }
    }

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

    await scheduleRef.update({
      ...allowed,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid,
    })

    return { success: true }
  })
