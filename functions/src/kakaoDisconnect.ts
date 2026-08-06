import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { getAccessToken, unlinkKakao } from './kakaoClient'

export const kakaoDisconnect = functions
  .region('asia-northeast3')
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }
    const uid = context.auth.uid
    const db = admin.firestore()

    // 카카오 쪽 연결을 먼저 끊는다. 토큰만 지우면 사용자가 카카오 설정에서
    // 앱을 직접 삭제할 때까지 유령 연결이 남는다.
    const accessToken = await getAccessToken(uid)
    if (accessToken) await unlinkKakao(accessToken)

    await db.collection('kakaoTokens').doc(uid).delete()
    await db.collection('users').doc(uid).update({ kakaoConnected: false })

    return { connected: false }
  })
