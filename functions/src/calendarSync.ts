import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { google } from 'googleapis'

function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  })
  return google.calendar({ version: 'v3', auth })
}

export const calendarSync = functions
  .region('asia-northeast3')
  .firestore.document('schedules/{scheduleId}')
  .onWrite(async (change) => {
    const after = change.after.data()
    if (!after || after.status !== 'confirmed') return
    if (after.googleCalendarEventId) return

    const db = admin.firestore()
    const settingsSnap = await db.collection('settings').doc('calendar').get()
    const sharedCalendarId = settingsSnap.data()?.sharedCalendarId
    if (!sharedCalendarId) return

    const unitSnap = await db.collection('units').doc(after.unitId).get()
    const unitName = unitSnap.data()?.name ?? after.unitId

    const startDateTime = `${after.date}T${after.startTime}:00+09:00`
    const endDateTime = `${after.date}T${after.endTime}:00+09:00`
    const title = after.type === 'ward_visit' ? `${unitName} 방문` : `${unitName} 접견`

    try {
      const calendar = getCalendarClient()
      const event = await calendar.events.insert({
        calendarId: sharedCalendarId,
        requestBody: {
          summary: title,
          start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
          end: { dateTime: endDateTime, timeZone: 'Asia/Seoul' },
        },
      })
      await change.after.ref.update({ googleCalendarEventId: event.data.id })
    } catch (err) {
      functions.logger.error('Google Calendar sync failed', err)
    }
  })
