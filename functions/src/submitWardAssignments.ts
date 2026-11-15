import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'

interface WardAssignment {
  wardName: string
  date: string  // YYYY-MM-DD
}

interface SubmitWardAssignmentsParams {
  taskId: string
  wardAssignments: WardAssignment[]
}

export const submitWardAssignments = onCall(
  PUBLIC_HTTP_OPTS,
  async (request: CallableRequest<SubmitWardAssignmentsParams>) => {
    const data = request.data
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Login required')
    }
    if (!data || !data.taskId || !/^[\w-]+$/.test(data.taskId)) {
      throw new HttpsError('invalid-argument', 'Invalid taskId')
    }
    if (!Array.isArray(data.wardAssignments) || data.wardAssignments.length === 0) {
      throw new HttpsError('invalid-argument', 'At least one ward assignment required')
    }
    for (const a of data.wardAssignments) {
      if (!a.wardName?.trim() || a.wardName.trim().length > 100) {
        throw new HttpsError('invalid-argument', 'Ward name is required and must be ≤100 chars')
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date ?? '')) {
        throw new HttpsError('invalid-argument', 'Invalid date format')
      }
    }

    const db = admin.firestore()
    const taskRef = db.collection('tasks').doc(data.taskId)

    try {
      return await db.runTransaction(async tx => {
        const taskSnap = await tx.get(taskRef)
        if (!taskSnap.exists) {
          throw new HttpsError('not-found', 'Task not found')
        }
        const taskData = taskSnap.data()!
        if (taskData.assignedTo !== request.auth!.uid) {
          throw new HttpsError('permission-denied', 'Not your task')
        }
        if (taskData.type !== 'select_visit') {
          throw new HttpsError('invalid-argument', 'Only ward visit tasks support ward assignments')
        }
        if (taskData.status === 'completed' || taskData.status === 'expired') {
          return { success: false, error: '이미 처리된 Task입니다.' }
        }

        const availableDates: string[] = taskData.availableDates ?? []
        for (const a of data.wardAssignments) {
          if (availableDates.length > 0 && !availableDates.includes(a.date)) {
            return { success: false, error: `${a.date}은 가능한 방문 날짜가 아닙니다.` }
          }
        }

        tx.update(taskRef, {
          status: 'responded',
          wardAssignments: data.wardAssignments,
          respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        return { success: true }
      })
    } catch (err: unknown) {
      // Re-throw HttpsErrors as-is; wrap other errors to avoid CORS masking
      if (err instanceof HttpsError) throw err
      logger.error('submitWardAssignments internal error', err)
      throw new HttpsError('internal', 'Internal server error')
    }
  },
)
