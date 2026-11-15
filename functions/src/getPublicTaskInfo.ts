import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'
import { PUBLIC_MAX_INSTANCES } from './publicLimits'

interface GetPublicTaskInfoRequest {
  taskId: string
  token: string
}

export const getPublicTaskInfo = onCall(
  { ...PUBLIC_HTTP_OPTS, maxInstances: PUBLIC_MAX_INSTANCES },
  async (request: CallableRequest<GetPublicTaskInfoRequest>) => {
    const data = request.data
    const { taskId, token } = data

    if (!taskId || !token) {
      throw new HttpsError('invalid-argument', 'taskId and token required')
    }

    const taskRef = admin.firestore().collection('tasks').doc(taskId)
    const taskSnap = await taskRef.get()

    if (!taskSnap.exists) {
      throw new HttpsError('not-found', 'Task not found')
    }

    const task = taskSnap.data()!

    if (task.respondToken !== token) {
      throw new HttpsError('permission-denied', 'Invalid token')
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
  },
)
