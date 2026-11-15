import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'
import { isSlotTaken, wardVisitConfirmError } from './confirmGuards'

interface ConfirmParams {
  taskId: string
  seventyUid: string
  unitId: string
  slot: { date: string; startTime: string; endTime: string }
  type: 'ward_visit' | 'interview'
}

export const confirmSchedule = onCall(
  PUBLIC_HTTP_OPTS,
  async (request: CallableRequest<ConfirmParams>) => {
    const data = request.data
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Login required')
    }

    // Validate all inputs before building Firestore document IDs
    if (!data.taskId || !/^[\w-]+$/.test(data.taskId)) {
      throw new HttpsError('invalid-argument', 'Invalid taskId')
    }
    if (!data.unitId || !/^[\w-]+$/.test(data.unitId)) {
      throw new HttpsError('invalid-argument', 'Invalid unitId')
    }
    if (!/^[\w-]+$/.test(data.seventyUid ?? '')) {
      throw new HttpsError('invalid-argument', 'Invalid seventyUid')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.slot?.date ?? '')) {
      throw new HttpsError('invalid-argument', 'Invalid date format')
    }
    if (!/^\d{2}:\d{2}$/.test(data.slot?.startTime ?? '') || !/^\d{2}:\d{2}$/.test(data.slot?.endTime ?? '')) {
      throw new HttpsError('invalid-argument', 'Invalid time format')
    }
    if (!['ward_visit', 'interview'].includes(data.type)) {
      throw new HttpsError('invalid-argument', 'Invalid type for task confirmation flow')
    }

    const db = admin.firestore()

    // Deterministic ID ensures tx.get participates in the transaction's optimistic lock.
    // Two concurrent requests for the same seventy+date will conflict at commit time.
    const scheduleId = `${data.seventyUid}_${data.slot.date}`
    const scheduleRef = db.collection('schedules').doc(scheduleId)
    const taskRef = db.collection('tasks').doc(data.taskId)
    const callerRef = db.collection('users').doc(request.auth.uid)

    return db.runTransaction(async tx => {
      // Validate task ownership and data integrity before writing
      const [existingSchedule, taskSnap, callerSnap] = await Promise.all([
        tx.get(scheduleRef),
        tx.get(taskRef),
        tx.get(callerRef),
      ])

      if (!taskSnap.exists) {
        throw new HttpsError('not-found', 'Task not found')
      }
      const taskData = taskSnap.data()!
      if (taskData.assignedTo !== request.auth!.uid) {
        throw new HttpsError('permission-denied', 'Not your task')
      }
      if (taskData.seventyUid !== data.seventyUid) {
        throw new HttpsError('invalid-argument', 'seventyUid mismatch')
      }
      if (taskData.status === 'completed') {
        return { success: false, error: '이미 처리된 Task입니다.' }
      }
      // 일정의 종류·소속·날짜는 요청이 아니라 과제와 회장 문서에서 온다.
      const mismatch = wardVisitConfirmError(
        taskData,
        { unitId: data.unitId, date: data.slot.date },
        callerSnap.data()?.unitId,
      )
      if (mismatch) {
        throw new HttpsError('invalid-argument', mismatch)
      }

      if (isSlotTaken(existingSchedule.data())) {
        return {
          success: false,
          error: '해당 날짜에 이미 확정된 일정이 있습니다. 다른 날짜를 선택해주세요.',
        }
      }

      tx.set(scheduleRef, {
        type: 'ward_visit',
        seventyUid: data.seventyUid,
        unitId: data.unitId,
        presidentUid: request.auth!.uid,
        date: data.slot.date,
        startTime: data.slot.startTime,
        endTime: data.slot.endTime,
        notes: null,
        zoomLink: null,
        customTitle: null,
        status: 'confirmed',
        projectId: taskData.projectId ?? null,
        createdBy: request.auth!.uid,
        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      tx.update(taskRef, { status: 'completed' })

      return { success: true, scheduleId }
    })
  },
)
