import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { getAccessToken } from './kakaoClient'

// 매주 월요일 새벽 4시 KST. 사용자 활동이 없는 시간대를 고른다.
export const kakaoTokenRefresh = functions
  .region('asia-northeast3')
  .pubsub.schedule('0 4 * * 1')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    const db = admin.firestore()
    const snap = await db.collection('kakaoTokens').get()
    if (snap.empty) return

    for (const doc of snap.docs) {
      try {
        // accessTokenExpiresAt을 0으로 낮춰 getAccessToken이 반드시 갱신을 타게 한다.
        // 갱신 응답에 refresh_token이 없으면 applyRefreshResponse가 기존 값을 유지하므로
        // 만료 창 밖에서 호출해도 안전하다.
        // set + merge는 문서가 스냅샷 이후 삭제됐어도(예: kakaoDisconnect 경합) 던지지 않는다 —
        // update는 NOT_FOUND로 던져 이 계정 하나 때문에 나머지 전체를 중단시킨다.
        await doc.ref.set({ accessTokenExpiresAt: 0 }, { merge: true })
        const token = await getAccessToken(doc.id)
        if (!token) {
          functions.logger.warn(
            `[kakao] weekly refresh gave up uid=${doc.id}: marked disconnected, see preceding [kakao] error log for cause`,
          )
        }
      } catch (err) {
        // 이 계정에서 무슨 일이 나든 나머지 계정의 주간 갱신을 막아서는 안 된다.
        functions.logger.error(`[kakao] weekly refresh threw for uid=${doc.id}`, err)
      }
    }

    functions.logger.info(`[kakao] weekly refresh processed ${snap.size} account(s)`)
  })
