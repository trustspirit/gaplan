import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface AdminDeleteScheduleRequest {
  scheduleId: string
}

export const adminDeleteSchedule = functions
  .region('asia-northeast3')
  .https.onCall(async (data: AdminDeleteScheduleRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }

    const { scheduleId } = data

    if (!scheduleId) {
      throw new functions.https.HttpsError('invalid-argument', 'scheduleId required')
    }

    const db = admin.firestore()
    const scheduleRef = db.collection('schedules').doc(scheduleId)
    const snap = await scheduleRef.get()

    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Schedule not found')
    }

    const schedule = snap.data()!

    await scheduleRef.update({ status: 'cancelled' })

    if (schedule.taskId) {
      const taskRef = db.collection('tasks').doc(schedule.taskId)
      const taskSnap = await taskRef.get()
      if (taskSnap.exists) {
        const task = taskSnap.data()!
        const hasResponses =
          (task.respondedSlots?.length ?? 0) > 0 ||
          (task.wardAssignments?.length ?? 0) > 0
        await taskRef.update({
          status: hasResponses ? 'responded' : 'pending',
          scheduleId: admin.firestore.FieldValue.delete(),
        })
      }
    }

    return { success: true }
  })
