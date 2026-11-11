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
import { calendarSyncNeedsUpdate } from './calendarSyncNeedsUpdate'
import { isSeventyOnly } from './seventyOnly'
import { buildCalendarEventFields, googleEventTimes, type GoogleEventTimesInput } from './calendarEventBody'

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

    // 칠십인 전용 일정은 CC 구글 캘린더에 두지 않는다 — 칠십인 전용 공개 페이지에만 실린다.
    // 이미 올라가 있던 이벤트는 지우고 장부도 비운다. 장부를 남겨 두면 나중에 칠십인 전용을
    // 껐을 때 "이미 이벤트가 있다"고 보고 다시 만들지 않는다(아래 needsUpdate 가드).
    if (isSeventyOnly(after)) {
      const staleEventId: string | undefined = after.googleCalendarEventId
      if (!staleEventId) return
      try {
        const calendar = getCalendarClient()
        await calendar.events.delete({ calendarId: sharedCalendarId, eventId: staleEventId })
        await change.after.ref.update({ googleCalendarEventId: admin.firestore.FieldValue.delete() })
      } catch (err) {
        functions.logger.error('Google Calendar delete failed (seventyOnly)', err)
      }
      return
    }

    // Re-sync whenever any field that affects the GCal event changes
    const needsUpdate = calendarSyncNeedsUpdate(before, after)
    if (after.googleCalendarEventId && !needsUpdate) return

    // 여러 날 모임은 마지막 날의 endTime에 끝난다. 종일 일정은 시각 없이 날짜로 보낸다(scheduleDates.ts).
    const { start, end } = googleEventTimes(after as GoogleEventTimesInput)
    const title = buildScheduleTitle(after)

    const calendar = getCalendarClient()
    // 취소됐던 자리에 다시 확정하면 before에 남은 이벤트 ID는 이미 지운 이벤트다 —
    // 그걸 update하지 말고 새로 만든다.
    const existingEventId: string | undefined =
      before?.status === 'cancelled' ? undefined : before?.googleCalendarEventId

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
            start,
            end,
          },
        })
      } else {
        const event = await calendar.events.insert({
          calendarId: sharedCalendarId,
          requestBody: {
            summary: title,
            ...(fields.description ? { description: fields.description } : {}),
            ...(fields.location ? { location: fields.location } : {}),
            start,
            end,
          },
        })
        await change.after.ref.update({ googleCalendarEventId: event.data.id })
      }
    } catch (err) {
      functions.logger.error('Google Calendar sync failed', err)
    }
  })
