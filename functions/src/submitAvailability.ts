import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface SubmitAvailabilityParams {
  taskId: string
  slots: { date: string; startTime: string; endTime: string }[]
}

export const submitAvailability = functions
  .region('asia-northeast3')
  .https.onCall(async (data: SubmitAvailabilityParams, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required')
    }

    if (!data.taskId || !/^[\w-]+$/.test(data.taskId)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid taskId')
    }
    if (!Array.isArray(data.slots) || data.slots.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'At least one slot required')
    }
    for (const slot of data.slots) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(slot.date ?? '')) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid slot date')
      }
      if (!/^\d{2}:\d{2}$/.test(slot.startTime ?? '') || !/^\d{2}:\d{2}$/.test(slot.endTime ?? '')) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid slot time')
      }
    }

    const db = admin.firestore()
    const taskRef = db.collection('tasks').doc(data.taskId)

    return db.runTransaction(async tx => {
      const taskSnap = await tx.get(taskRef)
      if (!taskSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Task not found')
      }
      const taskData = taskSnap.data()!
      if (taskData.assignedTo !== context.auth!.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not your task')
      }
      if (!['select_interview', 'select_meeting'].includes(taskData.type)) {
        throw new functions.https.HttpsError('invalid-argument', 'Only interview/meeting tasks support availability submission')
      }
      if (taskData.status === 'completed') {
        return { success: false, error: '이미 완료된 Task입니다.' }
      }

      tx.update(taskRef, {
        status: 'responded',
        respondedSlots: data.slots,
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      return { success: true }
    })
  })
