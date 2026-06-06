import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface WardAssignment {
  wardName: string
  date: string
}

interface SubmitWardAssignmentsAnonRequest {
  taskId: string
  token: string
  wardAssignments: WardAssignment[]
}

export const submitWardAssignmentsAnon = functions
  .region('asia-northeast3')
  .https.onCall(async (data: SubmitWardAssignmentsAnonRequest) => {
    const { taskId, token, wardAssignments } = data

    if (!taskId || !token || !wardAssignments) {
      throw new functions.https.HttpsError('invalid-argument', 'taskId, token, wardAssignments required')
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

    if (task.type !== 'select_visit') {
      throw new functions.https.HttpsError('invalid-argument', 'This task type does not accept ward assignments')
    }

    await taskRef.update({
      wardAssignments,
      status: 'responded',
      respondedAt: new Date().toISOString(),
    })

    return { success: true }
  })
