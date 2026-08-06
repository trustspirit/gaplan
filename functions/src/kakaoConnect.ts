import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { exchangeCodeForTokens, hasTalkCalendarScope } from './kakaoClient'

interface KakaoConnectRequest {
  code: string
  redirectUri: string
}

export const kakaoConnect = functions
  .region('asia-northeast3')
  .https.onCall(async (data: KakaoConnectRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }
    if (!data?.code || !data?.redirectUri) {
      throw new functions.https.HttpsError('invalid-argument', 'code and redirectUri are required')
    }

    const uid = context.auth.uid
    const now = Date.now()

    let tokens
    try {
      tokens = await exchangeCodeForTokens(data.code, data.redirectUri)
    } catch (err) {
      functions.logger.error(`[kakao] connect failed uid=${uid}`, err)
      throw new functions.https.HttpsError('internal', '카카오 연동에 실패했습니다.')
    }

    // talk_calendar는 선택 동의라 거부해도 토큰은 발급된다. 그대로 저장하면
    // "연동됨"으로 보이지만 이후 모든 이벤트 생성이 403으로 죽고, 그 사실은
    // 로그에만 남는다. 저장 전에 막고 사용자에게 이유를 알린다.
    // (카카오 콘솔에 앱 팀원으로 등록되지 않은 계정도 같은 증상을 낸다.)
    if (!hasTalkCalendarScope(tokens.scope)) {
      functions.logger.warn(`[kakao] connect denied uid=${uid}: scope="${tokens.scope ?? ''}"`)
      throw new functions.https.HttpsError(
        'failed-precondition',
        '톡캘린더 권한에 동의해야 연동할 수 있습니다. 다시 시도한 뒤 캘린더 권한을 허용해 주세요.',
      )
    }

    const db = admin.firestore()
    // 두 쓰기는 반드시 함께 성공해야 한다. 토큰만 저장되고 kakaoConnected가
    // false로 남으면 UI에 연동 해제 버튼이 뜨지 않아, 살아 있는 리프레시 토큰을
    // 사용자가 앱에서 회수할 방법이 없어진다.
    const batch = db.batch()
    batch.set(db.collection('kakaoTokens').doc(uid), {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      accessTokenExpiresAt: now + tokens.expires_in * 1000,
      refreshTokenExpiresAt: now + (tokens.refresh_token_expires_in ?? 5184000) * 1000,
      connectedAt: now,
    })
    // set + merge: 사용자 문서가 없어도 던지지 않는다(update는 NOT_FOUND).
    batch.set(db.collection('users').doc(uid), { kakaoConnected: true }, { merge: true })
    await batch.commit()

    return { connected: true }
  })
