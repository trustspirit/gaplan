// DEPLOYMENT REQUIREMENT: The Firebase service account must have the Google Calendar API
// enabled in Google Cloud Console, AND the service account email must be granted
// "Make changes to events" (Editor) access on the shared calendar.
// Service account email: <project-id>@appspot.gserviceaccount.com
// Guide: https://cloud.google.com/iam/docs/service-accounts#service_account_permissions
import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { google } from 'googleapis'
import { resolveScheduleRegionId } from './scheduleRegion'
import { buildScheduleTitle } from './scheduleTitle'
import { isBookkeepingOnlyWrite } from './bookkeepingWrite'
import { buildCalendarEventFields } from './calendarEventBody'

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

    const after = change.after.data()
    const before = change.before.data()

    // kakaoCalendarSync도 같은 문서에 onWrite로 걸려 있고 kakaoEventIds를 되쓴다.
    // 그 되쓰기가 먼저 도착하면 여기서 after.googleCalendarEventId는 아직
    // undefined라 아래 조기 반환 가드에 걸리지 않고, before 쪽도 undefined라
    // insert 경로로 들어가 구글 이벤트가 하나 더 생긴다.
    // 장부 필드만 바뀐 write에는 캘린더 쪽에서 할 일이 없으므로 여기서 끊는다.
    // (기존 동작 유지: 이 트리거 자신의 되쓰기는 원래도 66행 가드에서 반환됐다.
    //  달라지는 것은 반환 지점이 앞당겨져 Firestore 읽기를 아끼는 것뿐이다.)
    if (isBookkeepingOnlyWrite(before, after)) return

    const seventyUid = after?.seventyUid ?? before?.seventyUid
    const seventySnap = seventyUid
      ? await db.collection('users').doc(seventyUid).get()
      : null
    const regionId: string = resolveScheduleRegionId(
      {
        regionId: after?.regionId ?? before?.regionId,
        unitId: after?.unitId ?? before?.unitId,
      },
      seventySnap?.data()?.regionId,
    )

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
    const title = buildScheduleTitle(after)

    const calendar = getCalendarClient()
    const existingEventId: string | undefined = before?.googleCalendarEventId

    // 갱신 경로는 빈 문자열을 넘겨 칸을 명시적으로 지운다(undefined는 "변경 없음"이다).
    const fields = buildCalendarEventFields({
      location: after.location,
      zoomLink: after.zoomLink,
      notes: after.notes,
    })

    try {
      if (existingEventId) {
        await calendar.events.update({
          calendarId: sharedCalendarId,
          eventId: existingEventId,
          requestBody: {
            summary: title,
            description: fields.description,
            location: fields.location,
            start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
            end: { dateTime: endDateTime, timeZone: 'Asia/Seoul' },
          },
        })
      } else {
        const event = await calendar.events.insert({
          calendarId: sharedCalendarId,
          requestBody: {
            summary: title,
            ...(fields.description ? { description: fields.description } : {}),
            ...(fields.location ? { location: fields.location } : {}),
            start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
            end: { dateTime: endDateTime, timeZone: 'Asia/Seoul' },
          },
        })
        await change.after.ref.update({ googleCalendarEventId: event.data.id })
      }
    } catch (err) {
      functions.logger.error('Google Calendar sync failed', err)
    }
  })
