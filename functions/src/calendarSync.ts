// DEPLOYMENT REQUIREMENT: The Firebase service account must have the Google Calendar API
// enabled in Google Cloud Console, AND the service account email must be granted
// "Make changes to events" (Editor) access on the shared calendar.
// Service account email: <project-id>@appspot.gserviceaccount.com
// Guide: https://cloud.google.com/iam/docs/service-accounts#service_account_permissions
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
    const db = admin.firestore()

    // Resolve which regional calendar to use via the seventy's regionId
    const after = change.after.data()
    const before = change.before.data()
    const seventyUid = after?.seventyUid ?? before?.seventyUid
    const seventySnap = seventyUid
      ? await db.collection('users').doc(seventyUid).get()
      : null
    const regionId: string = seventySnap?.data()?.regionId ?? ''

    const settingsSnap = await db.collection('settings').doc('calendar').get()
    const calendars: Record<string, string> = settingsSnap.data()?.calendars ?? {}
    // Fall back to legacy single-calendar field if present
    const sharedCalendarId = calendars[regionId] ?? settingsSnap.data()?.sharedCalendarId
    if (!sharedCalendarId) return

    // Document deleted or schedule cancelled — remove Google Calendar event
    const eventIdToDelete = before?.googleCalendarEventId
    const wasCancelled = !after || after.status === 'cancelled'
    if (wasCancelled && eventIdToDelete) {
      try {
        const calendar = getCalendarClient()
        await calendar.events.delete({ calendarId: sharedCalendarId, eventId: eventIdToDelete })
      } catch (err) {
        functions.logger.error('Google Calendar delete failed', err)
      }
      return
    }

    if (!after || after.status !== 'confirmed') return
    if (after.googleCalendarEventId) return

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
