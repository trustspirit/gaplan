import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'
import { PUBLIC_MAX_INSTANCES } from './publicLimits'

interface RespondedSlot {
  date: string
  startTime: string
  endTime: string
}

interface SubmitAvailabilityAnonRequest {
  taskId: string
  token: string
  respondedSlots: RespondedSlot[]
}

const TASK_ID_RE = /^[\w-]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

export const submitAvailabilityAnon = onCall(
  { ...PUBLIC_HTTP_OPTS, maxInstances: PUBLIC_MAX_INSTANCES },
  async (request: CallableRequest<SubmitAvailabilityAnonRequest>) => {
    const data = request.data
    const { taskId, token, respondedSlots } = data

    if (!taskId || !TASK_ID_RE.test(taskId) || !token) {
      throw new HttpsError('invalid-argument', 'Invalid request')
    }

    if (!Array.isArray(respondedSlots) || respondedSlots.length === 0) {
      throw new HttpsError('invalid-argument', 'respondedSlots must be a non-empty array')
    }

    for (const slot of respondedSlots) {
      if (typeof slot.date !== 'string' || !DATE_RE.test(slot.date)) {
        throw new HttpsError('invalid-argument', 'Invalid slot date')
      }
      if (typeof slot.startTime !== 'string' || !TIME_RE.test(slot.startTime)) {
        throw new HttpsError('invalid-argument', 'Invalid slot startTime')
      }
      if (typeof slot.endTime !== 'string' || !TIME_RE.test(slot.endTime)) {
        throw new HttpsError('invalid-argument', 'Invalid slot endTime')
      }
    }

    const db = admin.firestore()
    const taskRef = db.collection('tasks').doc(taskId)

    await db.runTransaction(async tx => {
      const taskSnap = await tx.get(taskRef)

      if (!taskSnap.exists || taskSnap.data()!.respondToken !== token) {
        throw new HttpsError('permission-denied', 'Invalid link')
      }

      const task = taskSnap.data()!

      if (task.status === 'completed' || task.status === 'expired') {
        throw new HttpsError('failed-precondition', 'Task is no longer accepting responses')
      }

      if (task.type !== 'select_interview') {
        throw new HttpsError('invalid-argument', 'This task type does not accept slot responses')
      }

      tx.update(taskRef, {
        respondedSlots,
        status: 'responded',
        respondedAt: new Date().toISOString(),
      })
    })

    return { success: true }
  },
)
