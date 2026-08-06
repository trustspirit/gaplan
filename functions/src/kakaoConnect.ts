import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { exchangeCodeForTokens } from './kakaoClient'

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

    const db = admin.firestore()
    await db.collection('kakaoTokens').doc(uid).set({
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      accessTokenExpiresAt: now + tokens.expires_in * 1000,
      refreshTokenExpiresAt: now + (tokens.refresh_token_expires_in ?? 5184000) * 1000,
      connectedAt: now,
    })
    await db.collection('users').doc(uid).update({ kakaoConnected: true })

    return { connected: true }
  })
