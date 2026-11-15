import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'
import { PUBLIC_MAX_INSTANCES } from './publicLimits'

interface WardAssignment {
  wardName: string
  date: string
}

interface SubmitWardAssignmentsAnonRequest {
  taskId: string
  token: string
  wardAssignments: WardAssignment[]
}

const TASK_ID_RE = /^[\w-]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const submitWardAssignmentsAnon = onCall(
  { ...PUBLIC_HTTP_OPTS, maxInstances: PUBLIC_MAX_INSTANCES },
  async (request: CallableRequest<SubmitWardAssignmentsAnonRequest>) => {
    const data = request.data
    const { taskId, token, wardAssignments } = data

    // Validate taskId format before using as Firestore path
    if (!taskId || !TASK_ID_RE.test(taskId) || !token) {
      throw new HttpsError('invalid-argument', 'Invalid request')
    }

    if (!Array.isArray(wardAssignments) || wardAssignments.length === 0) {
      throw new HttpsError('invalid-argument', 'wardAssignments must be a non-empty array')
    }

    // Validate each ward assignment
    for (const wa of wardAssignments) {
      if (typeof wa.wardName !== 'string' || wa.wardName.trim().length === 0 || wa.wardName.length > 100) {
        throw new HttpsError('invalid-argument', 'Invalid wardName')
      }
      if (typeof wa.date !== 'string' || !DATE_RE.test(wa.date)) {
        throw new HttpsError('invalid-argument', 'Invalid date format in wardAssignment')
      }
    }

    const db = admin.firestore()
    const taskRef = db.collection('tasks').doc(taskId)

    await db.runTransaction(async tx => {
      const taskSnap = await tx.get(taskRef)

      // Collapse not-found and invalid-token into one error to avoid leaking document existence
      if (!taskSnap.exists || taskSnap.data()!.respondToken !== token) {
        throw new HttpsError('permission-denied', 'Invalid link')
      }

      const task = taskSnap.data()!

      if (task.status === 'completed' || task.status === 'expired') {
        throw new HttpsError('failed-precondition', 'Task is no longer accepting responses')
      }

      if (task.type !== 'select_visit') {
        throw new HttpsError('invalid-argument', 'This task type does not accept ward assignments')
      }

      // Validate dates are within availableDates when provided
      if (Array.isArray(task.availableDates) && task.availableDates.length > 0) {
        const validDates = new Set<string>(task.availableDates)
        for (const wa of wardAssignments) {
          if (!validDates.has(wa.date)) {
            throw new HttpsError('invalid-argument', `Date ${wa.date} is not available`)
          }
        }
      }

      tx.update(taskRef, {
        wardAssignments,
        status: 'responded',
        respondedAt: new Date().toISOString(),
      })
    })

    return { success: true }
  },
)
