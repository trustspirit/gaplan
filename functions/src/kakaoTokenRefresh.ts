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
      // accessTokenExpiresAt을 0으로 낮춰 getAccessToken이 반드시 갱신을 타게 한다.
      // 갱신 응답에 refresh_token이 없으면 applyRefreshResponse가 기존 값을 유지하므로
      // 만료 창 밖에서 호출해도 안전하다.
      await doc.ref.update({ accessTokenExpiresAt: 0 })
      const token = await getAccessToken(doc.id)
      if (!token) {
        functions.logger.warn(`[kakao] weekly refresh gave up uid=${doc.id}`)
      }
    }

    functions.logger.info(`[kakao] weekly refresh processed ${snap.size} account(s)`)
  })
