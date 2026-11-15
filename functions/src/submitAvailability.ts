import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'

interface SubmitAvailabilityParams {
  taskId: string
  slots: { date: string; startTime: string; endTime: string }[]
}

export const submitAvailability = onCall(
  PUBLIC_HTTP_OPTS,
  async (request: CallableRequest<SubmitAvailabilityParams>) => {
    const data = request.data
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Login required')
    }

    if (!data.taskId || !/^[\w-]+$/.test(data.taskId)) {
      throw new HttpsError('invalid-argument', 'Invalid taskId')
    }
    if (!Array.isArray(data.slots) || data.slots.length === 0) {
      throw new HttpsError('invalid-argument', 'At least one slot required')
    }
    for (const slot of data.slots) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(slot.date ?? '')) {
        throw new HttpsError('invalid-argument', 'Invalid slot date')
      }
      if (!/^\d{2}:\d{2}$/.test(slot.startTime ?? '') || !/^\d{2}:\d{2}$/.test(slot.endTime ?? '')) {
        throw new HttpsError('invalid-argument', 'Invalid slot time')
      }
    }

    const db = admin.firestore()
    const taskRef = db.collection('tasks').doc(data.taskId)

    return db.runTransaction(async tx => {
      const taskSnap = await tx.get(taskRef)
      if (!taskSnap.exists) {
        throw new HttpsError('not-found', 'Task not found')
      }
      const taskData = taskSnap.data()!
      if (taskData.assignedTo !== request.auth!.uid) {
        throw new HttpsError('permission-denied', 'Not your task')
      }
      if (taskData.type !== 'select_interview') {
        throw new HttpsError('invalid-argument', 'Only interview tasks support availability submission')
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
  },
)
