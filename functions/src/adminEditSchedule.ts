import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface AdminEditScheduleRequest {
  scheduleId: string
  updates: {
    date?: string
    startTime?: string
    endTime?: string
    notes?: string
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
      throw new functions.https.HttpsError('permission-denied', 'Admin only')
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
      if (typeof updates.notes !== 'string' || updates.notes.length > 500) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid notes')
      }
      allowed.notes = updates.notes
    }

    if (Object.keys(allowed).length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'No valid updates provided')
    }

    const scheduleRef = db.collection('schedules').doc(scheduleId)
    const snap = await scheduleRef.get()

    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Schedule not found')
    }

    // calendarSync trigger handles GCal update automatically
    await scheduleRef.update({
      ...allowed,
      updatedAt: new Date().toISOString(),
      updatedBy: context.auth.uid,
    })

    return { success: true }
  })
