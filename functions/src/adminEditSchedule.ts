import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface AdminEditScheduleRequest {
  scheduleId: string
  updates: {
    date?: string
    startTime?: string
    endTime?: string
    note?: string
  }
}

export const adminEditSchedule = functions
  .region('asia-northeast3')
  .https.onCall(async (data: AdminEditScheduleRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }

    const { scheduleId, updates } = data

    if (!scheduleId || !updates || Object.keys(updates).length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'scheduleId and updates required')
    }

    const scheduleRef = admin.firestore().collection('schedules').doc(scheduleId)
    const snap = await scheduleRef.get()

    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Schedule not found')
    }

    await scheduleRef.update({
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: context.auth.uid,
    })

    return { success: true }
  })
