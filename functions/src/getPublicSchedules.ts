import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface PublicSchedule {
  id: string
  type: string
  unitId: string
  date: string
  startTime: string
  endTime: string
  status: string
  wardName?: string
  zoomLink?: string | null
  customTitle?: string | null
  confirmedAt?: string
}

export const getPublicSchedules = functions
  .region('asia-northeast3')
  .https.onCall(async () => {
    const settingsSnap = await admin.firestore().doc('settings/public').get()
    const enabled = settingsSnap.exists && settingsSnap.data()?.schedulePublic === true

    if (!enabled) {
      throw new functions.https.HttpsError('permission-denied', 'Public schedule is not enabled')
    }

    const snap = await admin.firestore()
      .collection('schedules')
      .where('status', '==', 'confirmed')
      .orderBy('date', 'asc')
      .get()

    const schedules: PublicSchedule[] = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        type: data.type,
        unitId: data.unitId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        ...(data.wardName ? { wardName: data.wardName } : {}),
        ...(data.zoomLink != null ? { zoomLink: data.zoomLink } : {}),
        ...(data.customTitle != null ? { customTitle: data.customTitle } : {}),
        ...(data.confirmedAt ? { confirmedAt: data.confirmedAt } : {}),
      }
    })

    return { schedules }
  })
