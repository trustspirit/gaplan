import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface AdminConfirmWardVisitParams {
  taskId: string
}

export const adminConfirmWardVisit = functions
  .region('asia-northeast3')
  .https.onCall(async (data: AdminConfirmWardVisitParams, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required')
    }
    if (!data.taskId || !/^[\w-]+$/.test(data.taskId)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid taskId')
    }

    const db = admin.firestore()
    const callerUid = context.auth.uid

    const callerSnap = await db.collection('users').doc(callerUid).get()
    const callerRole = callerSnap.data()?.role
    if (!['admin', 'seventy'].includes(callerRole)) {
      throw new functions.https.HttpsError('permission-denied', 'Only admin or seventy can confirm')
    }

    const taskRef = db.collection('tasks').doc(data.taskId)
    const taskSnap = await taskRef.get()
    if (!taskSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Task not found')
    }

    const taskData = taskSnap.data()!
    if (taskData.type !== 'select_visit') {
      throw new functions.https.HttpsError('invalid-argument', 'Only ward visit tasks can be confirmed this way')
    }
    if (taskData.status !== 'responded') {
      return { success: false, error: '아직 회장이 와드 배정을 제출하지 않았습니다.' }
    }

    const wardAssignments: { wardName: string; date: string }[] = taskData.wardAssignments ?? []
    if (wardAssignments.length === 0) {
      return { success: false, error: '배정된 와드/지부가 없습니다.' }
    }

    // Get president's unitId for schedule documents
    const presidentSnap = await db.collection('users').doc(taskData.assignedTo).get()
    const unitId = presidentSnap.data()?.unitId ?? ''

    const batch = db.batch()

    // Delete any existing schedules for this task (handles re-confirmation)
    // These are schedules created by a previous confirmation of the same task.
    const existingSnap = await db.collection('schedules')
      .where('taskId', '==', data.taskId)
      .get()
    existingSnap.docs.forEach(doc => batch.delete(doc.ref))

    // Create one schedule document per ward assignment
    for (const assignment of wardAssignments) {
      const safeWard = assignment.wardName.replace(/[^a-zA-Z0-9가-힣]/g, '_')
      const scheduleId = `wv_${data.taskId}_${safeWard}`
      const scheduleRef = db.collection('schedules').doc(scheduleId)
      batch.set(scheduleRef, {
        type: 'ward_visit',
        taskId: data.taskId,       // for future re-confirmation cleanup
        wardName: assignment.wardName,
        unitId,
        presidentUid: taskData.assignedTo,
        seventyUid: taskData.seventyUid,
        date: assignment.date,
        startTime: '10:00',
        endTime: '13:00',
        status: 'confirmed',
        createdBy: callerUid,
        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }

    batch.update(taskRef, { status: 'completed' })
    await batch.commit()

    return { success: true, scheduleCount: wardAssignments.length }
  })
