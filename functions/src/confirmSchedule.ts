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

    const db = admin.firestore()

    return db.runTransaction(async tx => {
      // Check for conflict: same seventy, same date, already confirmed
      const conflictSnap = await db.collection('schedules')
        .where('seventyUid', '==', data.seventyUid)
        .where('date', '==', data.slot.date)
        .where('status', '==', 'confirmed')
        .get()

      if (!conflictSnap.empty) {
        return {
          success: false,
          error: '해당 날짜에 이미 확정된 일정이 있습니다. 다른 날짜를 선택해주세요.',
        }
      }

      const scheduleRef = db.collection('schedules').doc()
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

      const taskRef = db.collection('tasks').doc(data.taskId)
      tx.update(taskRef, { status: 'completed' })

      return { success: true, scheduleId: scheduleRef.id }
    })
  })
