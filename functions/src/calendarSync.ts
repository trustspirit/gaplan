// DEPLOYMENT REQUIREMENT: The Firebase service account must have the Google Calendar API
// enabled in Google Cloud Console, AND the service account email must be granted
// "Make changes to events" (Editor) access on the shared calendar.
// Service account email: <project-id>@appspot.gserviceaccount.com
// Guide: https://cloud.google.com/iam/docs/service-accounts#service_account_permissions
import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { google } from 'googleapis'
import { UNIT_REGION_MAP } from './unitRegionMap'
import { UNIT_NAME_MAP } from './unitNameMap'

function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  })
  return google.calendar({ version: 'v3', auth })
}

function buildTitle(data: FirebaseFirestore.DocumentData): string {
  if (data.customTitle) return data.customTitle as string
  const unitName = UNIT_NAME_MAP[data.unitId ?? ''] ?? data.unitId ?? ''
  if (data.type === 'ward_visit') {
    return data.wardName ? `${unitName} - ${data.wardName} 방문` : `${unitName} 방문`
  }
  if (data.type === 'interview') return `${unitName} 접견`
  return unitName ? `${unitName} 모임` : '모임'
}

export const calendarSync = functions
  .region('asia-northeast3')
  .firestore.document('schedules/{scheduleId}')
  .onWrite(async (change) => {
    const db = admin.firestore()

    const after = change.after.data()
    const before = change.before.data()
    const seventyUid = after?.seventyUid ?? before?.seventyUid
    const seventySnap = seventyUid
      ? await db.collection('users').doc(seventyUid).get()
      : null
    const scheduleUnitId = after?.unitId ?? before?.unitId ?? ''
    const regionId: string =
      UNIT_REGION_MAP[scheduleUnitId] ??
      seventySnap?.data()?.regionId ??
      ''

    const settingsSnap = await db.collection('settings').doc('calendar').get()
    const calendars: Record<string, string> = settingsSnap.data()?.calendars ?? {}
    const sharedCalendarId = calendars[regionId] ?? settingsSnap.data()?.sharedCalendarId
    if (!sharedCalendarId) return

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

    // Re-sync whenever any field that affects the GCal event changes
    const needsUpdate =
      before?.date !== after.date ||
      before?.startTime !== after.startTime ||
      before?.endTime !== after.endTime ||
      (before?.zoomLink ?? null) !== (after.zoomLink ?? null) ||
      (before?.customTitle ?? null) !== (after.customTitle ?? null) ||
      (before?.unitId ?? '') !== (after.unitId ?? '') ||
      (before?.wardName ?? null) !== (after.wardName ?? null) ||
      (before?.notes ?? null) !== (after.notes ?? null)
    if (after.googleCalendarEventId && !needsUpdate) return

    const startDateTime = `${after.date}T${after.startTime}:00+09:00`
    const endDateTime = `${after.date}T${after.endTime}:00+09:00`
    const title = buildTitle(after)

    const calendar = getCalendarClient()
    const existingEventId: string | undefined = before?.googleCalendarEventId

    // Use empty string to explicitly clear location in Google Calendar (undefined = omit = no change)
    const zoomLinkValue = after.zoomLink?.trim() ?? ''

    try {
      const description = after.notes?.trim() || undefined

      if (existingEventId) {
        await calendar.events.update({
          calendarId: sharedCalendarId,
          eventId: existingEventId,
          requestBody: {
            summary: title,
            description: description ?? '',
            start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
            end: { dateTime: endDateTime, timeZone: 'Asia/Seoul' },
            location: zoomLinkValue,
          },
        })
      } else {
        const event = await calendar.events.insert({
          calendarId: sharedCalendarId,
          requestBody: {
            summary: title,
            ...(description ? { description } : {}),
            start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
            end: { dateTime: endDateTime, timeZone: 'Asia/Seoul' },
            ...(zoomLinkValue ? { location: zoomLinkValue } : {}),
          },
        })
        await change.after.ref.update({ googleCalendarEventId: event.data.id })
      }
    } catch (err) {
      functions.logger.error('Google Calendar sync failed', err)
    }
  })
