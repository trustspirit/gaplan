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

    // 토큰 삭제와 플래그 내리기는 함께 성공해야 한다. update는 사용자 문서가
    // 없으면 NOT_FOUND로 던지는데, 그 시점엔 토큰이 이미 지워진 뒤라 절반만
    // 끝난 작업이 실패 토스트로 보인다. set + merge로 맞추고 배치로 묶는다
    // (kakaoClient.markDisconnected가 같은 이유로 이미 set + merge다).
    const batch = db.batch()
    batch.delete(db.collection('kakaoTokens').doc(uid))
    batch.set(db.collection('users').doc(uid), { kakaoConnected: false }, { merge: true })
    await batch.commit()

    return { connected: false }
  })
