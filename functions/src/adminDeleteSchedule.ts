import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'

interface AdminDeleteScheduleRequest {
  scheduleId: string
}

export const adminDeleteSchedule = onCall(
  PUBLIC_HTTP_OPTS,
  async (request: CallableRequest<AdminDeleteScheduleRequest>) => {
    const data = request.data
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(request.auth.uid).get()
    const callerRole = callerSnap.data()?.role
    if (!['admin', 'seventy', 'exec_secretary'].includes(callerRole)) {
      throw new HttpsError('permission-denied', 'Admin, seventy, or exec_secretary only')
    }

    const { scheduleId } = data

    if (!scheduleId) {
      throw new HttpsError('invalid-argument', 'scheduleId required')
    }

    const scheduleRef = db.collection('schedules').doc(scheduleId)
    const snap = await scheduleRef.get()

    if (!snap.exists) {
      throw new HttpsError('not-found', 'Schedule not found')
    }

    const schedule = snap.data()!

    if (callerRole === 'seventy' && schedule.seventyUid !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Seventy can only delete their own schedules')
    }

    if (callerRole === 'exec_secretary') {
      const callerData = callerSnap.data()
      const assignedUid = callerData?.assignedSeventyUid as string | undefined
      if (!assignedUid || schedule.seventyUid !== assignedUid) {
        throw new HttpsError('permission-denied',
          'exec_secretary can only delete schedules for their assigned seventy')
      }
    }

    // Idempotency guard — already cancelled, nothing to do
    if (schedule.status === 'cancelled') {
      return { success: true }
    }

    // calendarSync trigger handles GCal deletion when status becomes 'cancelled'
    await scheduleRef.update({ status: 'cancelled' })

    if (schedule.taskId) {
      const siblingsSnap = await db.collection('schedules')
        .where('taskId', '==', schedule.taskId)
        .where('status', '==', 'confirmed')
        .get()
      // Only restore task if no other confirmed schedules remain for this task
      // (the current schedule was just set to cancelled, so count remaining confirmed ones)
      const remainingConfirmed = siblingsSnap.docs.filter(d => d.id !== scheduleId).length
      if (remainingConfirmed === 0) {
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
    }

    return { success: true }
  },
)
