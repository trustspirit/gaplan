import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface WardAssignment {
  wardName: string
  date: string  // YYYY-MM-DD
}

interface SubmitWardAssignmentsParams {
  taskId: string
  wardAssignments: WardAssignment[]
}

export const submitWardAssignments = functions
  .region('asia-northeast3')
  .https.onCall(async (data: SubmitWardAssignmentsParams, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required')
    }
    if (!data || !data.taskId || !/^[\w-]+$/.test(data.taskId)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid taskId')
    }
    if (!Array.isArray(data.wardAssignments) || data.wardAssignments.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'At least one ward assignment required')
    }
    for (const a of data.wardAssignments) {
      if (!a.wardName?.trim() || a.wardName.trim().length > 100) {
        throw new functions.https.HttpsError('invalid-argument', 'Ward name is required and must be ≤100 chars')
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date ?? '')) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid date format')
      }
    }

    const db = admin.firestore()
    const taskRef = db.collection('tasks').doc(data.taskId)

    try {
      return await db.runTransaction(async tx => {
        const taskSnap = await tx.get(taskRef)
        if (!taskSnap.exists) {
          throw new functions.https.HttpsError('not-found', 'Task not found')
        }
        const taskData = taskSnap.data()!
        if (taskData.assignedTo !== context.auth!.uid) {
          throw new functions.https.HttpsError('permission-denied', 'Not your task')
        }
        if (taskData.type !== 'select_visit') {
          throw new functions.https.HttpsError('invalid-argument', 'Only ward visit tasks support ward assignments')
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
      if (err instanceof functions.https.HttpsError) throw err
      functions.logger.error('submitWardAssignments internal error', err)
      throw new functions.https.HttpsError('internal', 'Internal server error')
    }
  })
