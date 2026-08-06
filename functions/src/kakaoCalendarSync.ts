import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { buildKakaoEventBody, needsKakaoUpdate, type KakaoScheduleInput } from './kakaoEventBody'
import {
  getAccessToken,
  createKakaoEvent,
  updateKakaoEvent,
  deleteKakaoEvent,
} from './kakaoClient'
import { filterTargetSecretaries, type SecretaryDoc } from './kakaoTargets'

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

    const existingIds: Record<string, string> =
      (before?.kakaoEventIds as Record<string, string> | undefined) ?? {}

    const wasCancelled = !after || after.status === 'cancelled'
    if (wasCancelled) {
      if (Object.keys(existingIds).length) await deleteAll(existingIds)
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
    const targetUids = filterTargetSecretaries(candidates, seventyUid)
    if (!targetUids.length) return

    const seventySnap = await db.collection('users').doc(seventyUid).get()
    const seventyName: string | undefined = seventySnap.data()?.name

    const body = buildKakaoEventBody({
      schedule: after as KakaoScheduleInput,
      seventyName,
    })

    const nextIds: Record<string, string> = { ...existingIds }
    let changed = false

    for (const uid of targetUids) {
      const existingEventId = existingIds[uid]
      if (existingEventId && !needsKakaoUpdate(before, after)) continue

      const accessToken = await getAccessToken(uid)
      if (!accessToken) continue

      try {
        if (existingEventId) {
          await updateKakaoEvent(accessToken, existingEventId, body)
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
