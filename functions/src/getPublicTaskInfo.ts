import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'
import { PUBLIC_MAX_INSTANCES } from './publicLimits'
import { WARD_UNITS } from './wardUnitMap'

/** 그 스테이크의 와드 이름(표에 적힌 순서) */
export function wardNamesOfUnit(unitId: string): string[] {
  if (!unitId) return []
  return Object.values(WARD_UNITS)
    .filter((w) => w.unitId === unitId)
    .map((w) => w.ko)
}

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

    // 와드 방문 요청은 회장이 와드마다 날짜를 고른다 — 와드 목록은 요청 문서에 없으니 여기서 채운다.
    // 요청에 스테이크가 없으면(화면이 만드는 요청은 받는 회장만 적는다) 받는 회장의 스테이크로 찾는다.
    let wards: string[] = []
    if (task.type === 'select_visit') {
      let unitId: string = typeof task.unitId === 'string' ? task.unitId : ''
      if (!unitId && typeof task.assignedTo === 'string' && task.assignedTo) {
        const userSnap = await admin.firestore().collection('users').doc(task.assignedTo).get()
        const found = userSnap.get('unitId')
        if (typeof found === 'string') unitId = found
      }
      wards = wardNamesOfUnit(unitId)
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
      wards,
    }
  },
)
