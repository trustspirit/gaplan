import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface ConfirmParams {
  taskId: string
  seventyUid: string
  unitId: string
  slot: { date: string; startTime: string; endTime: string }
  type: 'ward_visit' | 'interview'
}

export const confirmSchedule = functions
  .region('asia-northeast3')
  .https.onCall(async (data: ConfirmParams, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required')
    }

    // Validate all inputs before building Firestore document IDs
    if (!data.taskId || !/^[\w-]+$/.test(data.taskId)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid taskId')
    }
    if (!data.unitId || !/^[\w-]+$/.test(data.unitId)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid unitId')
    }
    if (!/^[\w-]+$/.test(data.seventyUid ?? '')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid seventyUid')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.slot?.date ?? '')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid date format')
    }
    if (!/^\d{2}:\d{2}$/.test(data.slot?.startTime ?? '') || !/^\d{2}:\d{2}$/.test(data.slot?.endTime ?? '')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid time format')
    }
    if (!['ward_visit', 'interview'].includes(data.type)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid schedule type')
    }

    const db = admin.firestore()

    // Deterministic ID ensures tx.get participates in the transaction's optimistic lock.
    // Two concurrent requests for the same seventy+date will conflict at commit time.
    const scheduleId = `${data.seventyUid}_${data.slot.date}`
    const scheduleRef = db.collection('schedules').doc(scheduleId)
    const taskRef = db.collection('tasks').doc(data.taskId)

    return db.runTransaction(async tx => {
      // Validate task ownership and data integrity before writing
      const [existingSchedule, taskSnap] = await Promise.all([
        tx.get(scheduleRef),
        tx.get(taskRef),
      ])

      if (!taskSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Task not found')
      }
      const taskData = taskSnap.data()!
      if (taskData.assignedTo !== context.auth!.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not your task')
      }
      if (taskData.seventyUid !== data.seventyUid) {
        throw new functions.https.HttpsError('invalid-argument', 'seventyUid mismatch')
      }
      if (taskData.status === 'completed') {
        return { success: false, error: '이미 처리된 Task입니다.' }
      }

      if (existingSchedule.exists) {
        return {
          success: false,
          error: '해당 날짜에 이미 확정된 일정이 있습니다. 다른 날짜를 선택해주세요.',
        }
      }

      tx.set(scheduleRef, {
        type: data.type,
        seventyUid: data.seventyUid,
        unitId: data.unitId,
        presidentUid: context.auth!.uid,
        date: data.slot.date,
        startTime: data.slot.startTime,
        endTime: data.slot.endTime,
        status: 'confirmed',
        createdBy: context.auth!.uid,
        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      tx.update(taskRef, { status: 'completed' })

      return { success: true, scheduleId }
    })
  })
