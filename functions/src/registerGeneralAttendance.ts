import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface RegisterAttendanceRequest {
  generalScheduleId: string
}

export const registerGeneralAttendance = functions
  .region('asia-northeast3')
  .https.onCall(async (data: RegisterAttendanceRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }

    const { generalScheduleId } = data
    if (!generalScheduleId || typeof generalScheduleId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'generalScheduleId required')
    }

    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(context.auth.uid).get()
    const callerRole = callerSnap.data()?.role

    if (!['admin', 'seventy'].includes(callerRole)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin or seventy only')
    }

    const gsSnap = await db.collection('generalSchedules').doc(generalScheduleId).get()
    if (!gsSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'General schedule not found')
    }

    const gs = gsSnap.data()!

    const existing = await db
      .collection('schedules')
      .where('seventyUid', '==', context.auth.uid)
      .where('generalScheduleId', '==', generalScheduleId)
      .where('type', '==', 'general_attendance')
      .limit(1)
      .get()

    if (!existing.empty) {
      throw new functions.https.HttpsError('already-exists', '이미 참석 등록되었습니다.')
    }

    await db.collection('schedules').add({
      type: 'general_attendance',
      seventyUid: context.auth.uid,
      unitId: '',
      presidentUid: null,
      date: gs.date,
      startTime: gs.startTime ?? '00:00',
      endTime: gs.endTime ?? '23:59',
      status: 'confirmed',
      generalScheduleId,
      wardName: null,
      taskId: null,
      notes: null,
      zoomLink: null,
      customTitle: gs.title,
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true }
  })
