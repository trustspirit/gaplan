import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface AdminConfirmParams {
  taskId: string
  slot: { date: string; startTime: string; endTime: string }
}

export const adminConfirmSchedule = functions
  .region('asia-northeast3')
  .https.onCall(async (data: AdminConfirmParams, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required')
    }

    if (!data.taskId || !/^[\w-]+$/.test(data.taskId)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid taskId')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.slot?.date ?? '')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid date format')
    }
    if (!/^\d{2}:\d{2}$/.test(data.slot?.startTime ?? '') || !/^\d{2}:\d{2}$/.test(data.slot?.endTime ?? '')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid time format')
    }

    const db = admin.firestore()
    const callerUid = context.auth.uid
    const callerSnap = await db.collection('users').doc(callerUid).get()
    const callerRole = callerSnap.data()?.role

    if (!['admin', 'seventy', 'exec_secretary'].includes(callerRole)) {
      throw new functions.https.HttpsError('permission-denied', 'Only admin, seventy, or exec_secretary can confirm')
    }

    const taskRef = db.collection('tasks').doc(data.taskId)
    const taskSnap = await taskRef.get()
    if (!taskSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Task not found')
    }
    const taskData = taskSnap.data()!

    if (callerRole === 'exec_secretary') {
      const callerData = callerSnap.data()
      const assignedUid = callerData?.assignedSeventyUid as string | undefined
      if (!assignedUid || taskData?.seventyUid !== assignedUid) {
        throw new functions.https.HttpsError('permission-denied',
          'exec_secretary can only confirm schedules for their assigned seventy')
      }
    }

    if (taskData.status !== 'responded') {
      return { success: false, error: '아직 회장이 가능 시간을 제출하지 않았습니다.' }
    }
    if (taskData.type !== 'select_interview') {
      throw new functions.https.HttpsError('invalid-argument', 'Only interview tasks can be confirmed this way')
    }

    // Verify the selected slot is one the president submitted
    const respondedSlots: { date: string; startTime: string }[] = taskData.respondedSlots ?? []
    const slotValid = respondedSlots.some(
      s => s.date === data.slot.date && s.startTime === data.slot.startTime,
    )
    if (!slotValid) {
      throw new functions.https.HttpsError('invalid-argument', '제출된 가능 시간 중에 없는 슬롯입니다.')
    }

    const scheduleType = 'interview'
    const scheduleId = `${taskData.seventyUid}_${data.slot.date}_${data.slot.startTime.replace(':', '')}`
    const scheduleRef = db.collection('schedules').doc(scheduleId)

    return db.runTransaction(async tx => {
      const existing = await tx.get(scheduleRef)
      if (existing.exists) {
        return { success: false, error: '해당 슬롯에 이미 확정된 일정이 있습니다.' }
      }

      tx.set(scheduleRef, {
        type: scheduleType,
        seventyUid: taskData.seventyUid,
        unitId: taskData.unitId ?? '',
        presidentUid: taskData.assignedTo,
        date: data.slot.date,
        startTime: data.slot.startTime,
        endTime: data.slot.endTime,
        notes: null,
        zoomLink: null,
        customTitle: null,
        status: 'confirmed',
        taskId: data.taskId,
        projectId: taskData.projectId ?? null,
        createdBy: callerUid,
        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      tx.update(taskRef, { status: 'completed', scheduleId })

      return { success: true, scheduleId }
    })
  })
