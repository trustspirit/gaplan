/**
 * manualCalendarSync — callable by admin to re-trigger Google Calendar sync
 * for all confirmed schedules that don't have a googleCalendarEventId yet.
 *
 * This handles the case where the calendarSync Firestore trigger failed
 * (e.g. due to missing regionId on the seventy user).
 */
import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { google } from 'googleapis'
import { UNIT_REGION_MAP } from './unitRegionMap'

function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  })
  return google.calendar({ version: 'v3', auth })
}

export const manualCalendarSync = functions
  .region('asia-northeast3')
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required')
    }

    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(context.auth.uid).get()
    if (callerSnap.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only')
    }

    const settingsSnap = await db.collection('settings').doc('calendar').get()
    const calendars: Record<string, string> = settingsSnap.data()?.calendars ?? {}

    // Find all confirmed schedules without a calendar event
    const snap = await db.collection('schedules')
      .where('status', '==', 'confirmed')
      .get()

    const pending = snap.docs.filter(d => !d.data().googleCalendarEventId)
    if (pending.length === 0) {
      return { success: true, synced: 0, message: '모든 일정이 이미 캘린더에 등록되어 있습니다.' }
    }

    const calendar = getCalendarClient()
    let synced = 0
    let failed = 0

    for (const docSnap of pending) {
      const s = docSnap.data()
      const regionId = UNIT_REGION_MAP[s.unitId ?? ''] ?? ''
      const calendarId = calendars[regionId]
      if (!calendarId) {
        functions.logger.warn(`manualCalendarSync: no calendar for regionId="${regionId}" (unitId=${s.unitId})`)
        failed++
        continue
      }

      const unitSnap = s.unitId
        ? await db.collection('units').doc(s.unitId).get()
        : null
      const unitName = unitSnap?.data()?.name ?? s.unitId ?? ''

      const startDateTime = `${s.date}T${s.startTime}:00+09:00`
      const endDateTime = `${s.date}T${s.endTime}:00+09:00`
      let title: string
      if (s.type === 'ward_visit') {
        title = s.wardName ? `${unitName} - ${s.wardName} 방문` : `${unitName} 방문`
      } else if (s.type === 'interview') {
        title = `${unitName} 접견`
      } else {
        title = unitName ? `${unitName} 모임` : '모임'
      }

      try {
        const event = await calendar.events.insert({
          calendarId,
          requestBody: {
            summary: title,
            start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
            end: { dateTime: endDateTime, timeZone: 'Asia/Seoul' },
          },
        })
        await docSnap.ref.update({ googleCalendarEventId: event.data.id })
        synced++
      } catch (err) {
        functions.logger.error(`manualCalendarSync: failed for ${docSnap.id}`, err)
        failed++
      }
    }

    return {
      success: true,
      synced,
      failed,
      message: `${synced}개 일정을 캘린더에 등록했습니다.${failed > 0 ? ` (${failed}개 실패)` : ''}`,
    }
  })
