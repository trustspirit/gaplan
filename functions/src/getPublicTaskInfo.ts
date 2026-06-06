import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface GetPublicTaskInfoRequest {
  taskId: string
  token: string
}

export const getPublicTaskInfo = functions
  .region('asia-northeast3')
  .https.onCall(async (data: GetPublicTaskInfoRequest) => {
    const { taskId, token } = data

    if (!taskId || !token) {
      throw new functions.https.HttpsError('invalid-argument', 'taskId and token required')
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

    return {
      taskId,
      title: task.title ?? '',
      note: task.note ?? '',
      type: task.type,
      status: task.status,
      dueDate: task.dueDate,
      availableDates: task.availableDates ?? [],
      availableDateSlots: task.availableDateSlots ?? [],
      slotDurationMinutes: task.slotDurationMinutes ?? 30,
      unitId: task.unitId ?? '',
      assignedTo: task.assignedTo,
      respondedSlots: task.respondedSlots ?? [],
      wardAssignments: task.wardAssignments ?? [],
    }
  })
