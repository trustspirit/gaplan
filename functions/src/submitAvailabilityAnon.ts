import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface SubmitAvailabilityAnonRequest {
  taskId: string
  token: string
  respondedSlots: Array<{ date: string; startTime: string; endTime: string }>
}

export const submitAvailabilityAnon = functions
  .region('asia-northeast3')
  .https.onCall(async (data: SubmitAvailabilityAnonRequest) => {
    const { taskId, token, respondedSlots } = data

    if (!taskId || !token || !respondedSlots) {
      throw new functions.https.HttpsError('invalid-argument', 'taskId, token, respondedSlots required')
    }

    const taskRef = admin.firestore().collection('tasks').doc(taskId)
    const taskSnap = await taskRef.get()

    if (!taskSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Task not found')
    }

    const task = taskSnap.data()!

    if (task.respondToken !== token) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid token')
    }

    if (task.status === 'completed' || task.status === 'expired') {
      throw new functions.https.HttpsError('failed-precondition', 'Task is no longer accepting responses')
    }

    if (task.type !== 'select_interview') {
      throw new functions.https.HttpsError('invalid-argument', 'This task type does not accept slot responses')
    }

    await taskRef.update({
      respondedSlots,
      status: 'responded',
      respondedAt: new Date().toISOString(),
    })

    return { success: true }
  })
