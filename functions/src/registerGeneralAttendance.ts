// 이제 UI에서 호출되지 않는다 — 기존 데이터 때문에 남겨 둔다.
import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'

interface RegisterAttendanceRequest {
  generalScheduleId: string
}

export const registerGeneralAttendance = onCall(
  PUBLIC_HTTP_OPTS,
  async (request: CallableRequest<RegisterAttendanceRequest>) => {
    const data = request.data
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { generalScheduleId } = data
    if (!generalScheduleId || typeof generalScheduleId !== 'string') {
      throw new HttpsError('invalid-argument', 'generalScheduleId required')
    }

    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(request.auth.uid).get()
    const callerData = callerSnap.data()
    const callerRole = callerData?.role
    const callerName: string = callerData?.name ?? request.auth.uid

    if (!['admin', 'seventy'].includes(callerRole)) {
      throw new HttpsError('permission-denied', 'Admin or seventy only')
    }

    const gsSnap = await db.collection('generalSchedules').doc(generalScheduleId).get()
    if (!gsSnap.exists) {
      throw new HttpsError('not-found', 'General schedule not found')
    }

    const gs = gsSnap.data()!

    const existing = await db
      .collection('schedules')
      .where('seventyUid', '==', request.auth.uid)
      .where('generalScheduleId', '==', generalScheduleId)
      .where('type', '==', 'general_attendance')
      .limit(1)
      .get()

    if (!existing.empty) {
      throw new HttpsError('already-exists', '이미 참석 등록되었습니다.')
    }

    await db.collection('schedules').add({
      type: 'general_attendance',
      seventyUid: request.auth.uid,
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
      customTitle: callerName,
      createdBy: request.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true }
  },
)
