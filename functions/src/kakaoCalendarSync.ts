import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { buildKakaoEventBody, type KakaoScheduleInput } from './kakaoEventBody'
import {
  getAccessToken,
  createKakaoEvent,
  updateKakaoEvent,
  deleteKakaoEvent,
} from './kakaoClient'
import { filterTargetSecretaries, type SecretaryDoc } from './kakaoTargets'
import { decideKakaoSyncAction, isPastScheduleDate } from './kakaoSyncAction'
import { isBookkeepingOnlyWrite } from './bookkeepingWrite'

async function deleteAll(eventIds: Record<string, string>, scheduleId: string): Promise<void> {
  // 일정 하나가 여러 집행서기의 캘린더에 각각 존재한다.
  // 각 삭제는 그 사람의 토큰으로 호출해야 한다 —
  // 한 사람의 토큰으로 다른 사람 캘린더의 일정을 지울 수 없다.
  for (const [uid, eventId] of Object.entries(eventIds)) {
    const accessToken = await getAccessToken(uid)
    if (!accessToken) continue
    await deleteKakaoEvent(accessToken, eventId, scheduleId)
  }
}

export const kakaoCalendarSync = functions
  .region('asia-northeast3')
  .firestore.document('schedules/{scheduleId}')
  .onWrite(async (change) => {
    const after = change.after.data()
    const before = change.before.data()
    const scheduleId = change.after.id

    // 장부 필드(googleCalendarEventId / kakaoEventIds)만 바뀐 write는 두 캘린더
    // 동기화가 서로에게 남긴 흔적일 뿐이다. 여기서 끊지 않으면 calendarSync의
    // 되쓰기가 이 트리거를 깨우고, 그 시점 after.kakaoEventIds는 아직 비어 있어
    // 'create'로 판단해 두 번째 카카오 이벤트를 만든다. 되쓰기 순서는 비결정적이라
    // 반대 방향(구글 중복 생성)도 같은 이유로 일어난다.
    if (isBookkeepingOnlyWrite(before, after)) return

    // 삭제 경로는 before에서 읽는다. 문서가 지워지거나 취소되면 after는 없거나
    // kakaoEventIds를 담고 있지 않을 수 있으므로, 지울 대상은 오직 before가
    // 갖고 있던 값뿐이다.
    const idsToDelete: Record<string, string> =
      (before?.kakaoEventIds as Record<string, string> | undefined) ?? {}

    const wasCancelled = !after || after.status === 'cancelled'
    if (wasCancelled) {
      if (!Object.keys(idsToDelete).length) return
      // after가 있는데 kakaoEventIds가 이미 비어 있으면, 이 호출은 아래에서
      // 우리가 직접 지운 결과의 메아리다 — 이미 삭제된 이벤트를 또 지우지 않는다.
      if (after && !Object.keys((after.kakaoEventIds as Record<string, string>) ?? {}).length) return
      await deleteAll(idsToDelete, scheduleId)
      // 삭제 후 id를 비워야 한다. 남겨 두면 publishVisitPlan이 같은 문서를
      // 다시 confirmed로 되살렸을 때(ref.update) 이미 사라진 event_id를 향해
      // update를 날리거나, 변경된 필드가 없으면 아예 skip돼 카카오 이벤트가
      // 영영 다시 만들어지지 않는다.
      // 문서가 하드 삭제된 경우(after 없음)에는 되쓸 대상이 없다.
      if (after) await change.after.ref.update({ kakaoEventIds: {} })
      return
    }

    if (after.status !== 'confirmed') return

    const db = admin.firestore()
    const seventyUid: string | undefined = after.seventyUid
    if (!seventyUid) return

    const snap = await db
      .collection('users')
      .where('assignedSeventyUid', '==', seventyUid)
      .where('kakaoConnected', '==', true)
      .get()

    const candidates: SecretaryDoc[] = snap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as Omit<SecretaryDoc, 'uid'>),
    }))
    // 쿼리는 매 write마다 다시 평가된다. 확정 이후에 새로 카카오를 연동한
    // 집행서기는 이 시점에는 놓치더라도, 일정에 다음 write(수정 등)가 일어나면
    // 그때 targetUids에 포함되어 생성된다. 이 트리거만으로는 연동 시점에
    // 즉시 소급 동기화하지 않는다 — 그건 범위 밖이며, 구글 쪽은 이를 위해
    // manualCalendarSync를 따로 두고 있다. 카카오 쪽 동등 기능은 의도적으로 보류됨.
    const targetUids = filterTargetSecretaries(candidates, seventyUid)
    if (!targetUids.length) return

    const seventySnap = await db.collection('users').doc(seventyUid).get()
    const seventyName: string | undefined = seventySnap.data()?.name

    const body = buildKakaoEventBody({
      schedule: after as KakaoScheduleInput,
      seventyName,
    })

    // 생성/수정 경로는 before가 아니라 after에서 읽는다. 이 트리거는 자신의
    // kakaoEventIds 갱신으로 스스로를 재호출한다. 그 재호출에서 before는 아직
    // 갱신 이전 상태라 방금 만든 id를 담고 있지 않지만, after는 방금 쓴 값을
    // 그대로 반영한다. before를 읽으면 방금 만든 이벤트를 "없다"고 오판해 매번
    // 새로 생성하게 되고, 그 결과 첫 이벤트는 영구히 orphan된다 — 지워지지도,
    // 다시 참조되지도 않는다. calendarSync.ts가 after.googleCalendarEventId로
    // 같은 재귀를 끊는 것과 같은 이유다.
    const existingIds: Record<string, string> =
      (after.kakaoEventIds as Record<string, string> | undefined) ?? {}

    // 지난 일정은 새로 만들지 않는다. manualCalendarSync(구글 재동기화)는
    // googleCalendarEventId가 없는 모든 confirmed 일정에 write를 일으키는데,
    // 그중에는 수년치 과거 일정이 섞여 있다. 그대로 두면 버튼 한 번에 개인
    // 톡캘린더가 과거 일정으로 뒤덮이고, 앱에는 되돌릴 방법이 없다.
    // 수정/삭제는 계속 동작해야 한다 — 이미 남의 캘린더에 들어간 이벤트는
    // 끝까지 정확해야 하므로 생성만 막는다.
    const isPast = isPastScheduleDate(after.date as string)

    for (const uid of targetUids) {
      const existingEventId = existingIds[uid]
      const action = decideKakaoSyncAction(existingEventId, before, after)
      if (action === 'skip') continue
      if (action === 'create' && isPast) continue

      const accessToken = await getAccessToken(uid)
      if (!accessToken) continue

      try {
        if (action === 'update') {
          await updateKakaoEvent(accessToken, existingEventId as string, body, scheduleId)
        } else {
          const eventId = await createKakaoEvent(accessToken, body, scheduleId)
          if (eventId) {
            // 맵 전체를 덮어쓰면 동시에 도는 다른 호출이 방금 쓴 항목을 지운다
            // (마지막 되쓰기가 이김 → 잃어버린 이벤트는 취소해도 지워지지 않는
            // 영구 orphan이 된다). 점 표기 경로로 자기 uid 항목만 쓴다.
            await change.after.ref.update({ [`kakaoEventIds.${uid}`]: eventId })
          }
        }
      } catch (err) {
        // 카카오 실패가 일정 저장을 되돌리면 안 된다. 로그만 남긴다.
        functions.logger.error(`[kakao] sync failed uid=${uid} schedule=${scheduleId}`, err)
      }
    }
  })
