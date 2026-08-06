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
import { decideKakaoSyncAction } from './kakaoSyncAction'

async function deleteAll(eventIds: Record<string, string>): Promise<void> {
  // 일정 하나가 여러 집행서기의 캘린더에 각각 존재한다.
  // 각 삭제는 그 사람의 토큰으로 호출해야 한다 —
  // 한 사람의 토큰으로 다른 사람 캘린더의 일정을 지울 수 없다.
  for (const [uid, eventId] of Object.entries(eventIds)) {
    const accessToken = await getAccessToken(uid)
    if (!accessToken) continue
    await deleteKakaoEvent(accessToken, eventId)
  }
}

export const kakaoCalendarSync = functions
  .region('asia-northeast3')
  .firestore.document('schedules/{scheduleId}')
  .onWrite(async (change) => {
    const after = change.after.data()
    const before = change.before.data()

    // 삭제 경로는 before에서 읽는다. 문서가 지워지거나 취소되면 after는 없거나
    // kakaoEventIds를 담고 있지 않을 수 있으므로, 지울 대상은 오직 before가
    // 갖고 있던 값뿐이다.
    const idsToDelete: Record<string, string> =
      (before?.kakaoEventIds as Record<string, string> | undefined) ?? {}

    const wasCancelled = !after || after.status === 'cancelled'
    if (wasCancelled) {
      if (Object.keys(idsToDelete).length) await deleteAll(idsToDelete)
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

    const nextIds: Record<string, string> = { ...existingIds }
    let changed = false

    for (const uid of targetUids) {
      const existingEventId = existingIds[uid]
      const action = decideKakaoSyncAction(existingEventId, before, after)
      if (action === 'skip') continue

      const accessToken = await getAccessToken(uid)
      if (!accessToken) continue

      try {
        if (action === 'update') {
          await updateKakaoEvent(accessToken, existingEventId as string, body)
        } else {
          const eventId = await createKakaoEvent(accessToken, body)
          if (eventId) {
            nextIds[uid] = eventId
            changed = true
          }
        }
      } catch (err) {
        // 카카오 실패가 일정 저장을 되돌리면 안 된다. 로그만 남긴다.
        functions.logger.error(`[kakao] sync failed uid=${uid} schedule=${change.after.id}`, err)
      }
    }

    if (changed) {
      await change.after.ref.update({ kakaoEventIds: nextIds })
    }
  })
