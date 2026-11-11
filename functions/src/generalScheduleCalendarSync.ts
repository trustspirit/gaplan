// DEPLOYMENT REQUIREMENT: 서비스 계정 권한 요건은 calendarSync.ts와 동일하다(파일 첫머리 주석 참고).
//
// schedules/{id}의 calendarSync/kakaoCalendarSync와 같은 재진입 문제를 여기서도 겪는다: 이
// 트리거가 googleCalendarEventIds를 되쓰면 스스로를 다시 깨운다. bookkeepingWrite.ts의
// isBookkeepingOnlyWrite가 그 되쓰기를 걸러낸다 — 그 파일의 긴 주석이 이유를 설명한다.
//
// 행사는 여러 CC 캘린더에 동시에 들어갈 수 있어(schedules는 캘린더 하나뿐) 이벤트 id를 문자열
// 하나가 아니라 지역별 맵으로 들고 있다 — kakaoCalendarSync.ts가 kakaoEventIds를
// Record<uid, eventId>로 담는 것과 같은 이유, 같은 모양이다.
import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { google, calendar_v3 } from 'googleapis'
import { isBookkeepingOnlyWrite } from './bookkeepingWrite'
import { targetCalendarIdsFor, GENERAL_SCHEDULE_SHARED_CALENDAR_KEY } from './generalScheduleCalendarTargets'
import { generalScheduleEventBody, type GeneralScheduleForCalendar } from './generalScheduleEventBody'
import { planGeneralScheduleCalendarSync } from './generalScheduleCalendarPlan'
import { isSeventyOnly } from './seventyOnly'

function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  })
  return google.calendar({ version: 'v3', auth })
}

export const generalScheduleCalendarSync = functions
  .region('asia-northeast3')
  .firestore.document('generalSchedules/{id}')
  .onWrite(async (change) => {
    const after = change.after.data()
    const before = change.before.data()

    if (isBookkeepingOnlyWrite(before, after)) return

    const existingEventIds: Record<string, string> =
      (before?.googleCalendarEventIds as Record<string, string> | undefined) ?? {}

    // 새 클라이언트는 seventyOnly를 항상 boolean으로 쓴다. 필드가 없는 문서는 배포 전에 열려
    // 있던 옛 탭이 만든 것이다 — 그대로 두면 회장 계정의 조회(seventyOnly == false)에 걸리지
    // 않아 그 행사가 회장에게만 조용히 안 보인다. 여기서 채우고 끝낸다: 이 write가 트리거를
    // 다시 깨우고, 캘린더 동기화는 그 두 번째 호출이 한다(한 호출에서 둘 다 하면 장부 필드
    // 되쓰기와 경합해 이벤트가 중복 생성될 수 있다).
    if (after && typeof after.seventyOnly !== 'boolean') {
      await change.after.ref.update({ seventyOnly: false })
      return
    }

    // 칠십인 전용 행사는 isPublic이 false로 저장되지만, 두 값이 어긋난 문서가 있어도
    // CC 캘린더로 나가지 않게 여기서 한 번 더 막는다.
    const isPublicAfter = !!after && after.isPublic === true && !isSeventyOnly(after)

    const db = admin.firestore()
    const settingsSnap = await db.collection('settings').doc('calendar').get()
    const calendars: Record<string, string> = settingsSnap.data()?.calendars ?? {}
    const sharedCalendarId: string | undefined = settingsSnap.data()?.sharedCalendarId

    // 삭제 대상 지역의 calendarId는 desiredCalendarIds에는 더 이상 없다(그래서 빠졌다) —
    // 지우려면 현재 설정에서 다시 찾아야 한다. calendarSync.ts도 매번 설정을 새로 읽어
    // 같은 방식으로 삭제 대상 캘린더를 찾는다.
    const allCalendarIds: Record<string, string> = { ...calendars }
    if (sharedCalendarId) allCalendarIds[GENERAL_SCHEDULE_SHARED_CALENDAR_KEY] = sharedCalendarId

    const desiredCalendarIds = isPublicAfter
      ? targetCalendarIdsFor(after?.targetRegionIds as string[] | undefined, calendars, sharedCalendarId)
      : {}

    const plan = planGeneralScheduleCalendarSync(desiredCalendarIds, existingEventIds)
    if (!plan.toInsert.length && !plan.toUpdate.length && !plan.toDelete.length) return

    const calendar = getCalendarClient()
    const idUpdates: Record<string, string | admin.firestore.FieldValue> = {}

    if (plan.toDelete.length) {
      for (const key of plan.toDelete) {
        const calendarId = allCalendarIds[key]
        const eventId = existingEventIds[key]
        if (!calendarId) {
          // 설정에서 이 지역의 캘린더가 아예 사라진 경우 — 지울 대상을 찾을 수 없다.
          // 장부만 남겨 두고(무한 재시도하지 않도록 건드리지 않는다) 다음에 사람이 손볼 수 있게 로그만 남긴다.
          functions.logger.error(
            `[generalScheduleCalendarSync] no calendarId configured for '${key}', cannot delete event ${eventId}`,
          )
          continue
        }
        try {
          await calendar.events.delete({ calendarId, eventId })
          idUpdates[`googleCalendarEventIds.${key}`] = admin.firestore.FieldValue.delete()
        } catch (err) {
          functions.logger.error(`[generalScheduleCalendarSync] delete failed key=${key}`, err)
        }
      }
    }

    if (plan.toInsert.length || plan.toUpdate.length) {
      const gs: GeneralScheduleForCalendar = {
        title: after?.title,
        description: after?.description ?? null,
        date: after?.date,
        startTime: after?.startTime,
        endTime: after?.endTime,
        endDate: after?.endDate,
      }
      const body = generalScheduleEventBody(gs)
      const requestBody: calendar_v3.Schema$Event = {
        summary: body.summary,
        ...(body.description ? { description: body.description } : {}),
        start: body.start,
        end: body.end,
      }

      for (const key of plan.toInsert) {
        const calendarId = desiredCalendarIds[key]
        try {
          const event = await calendar.events.insert({ calendarId, requestBody })
          if (event.data.id) idUpdates[`googleCalendarEventIds.${key}`] = event.data.id
        } catch (err) {
          functions.logger.error(`[generalScheduleCalendarSync] insert failed key=${key}`, err)
        }
      }

      for (const key of plan.toUpdate) {
        const calendarId = desiredCalendarIds[key]
        const eventId = existingEventIds[key]
        try {
          await calendar.events.update({ calendarId, eventId, requestBody })
        } catch (err) {
          functions.logger.error(`[generalScheduleCalendarSync] update failed key=${key}`, err)
        }
      }
    }

    if (after && Object.keys(idUpdates).length) {
      await change.after.ref.update(idUpdates)
    }
  })
