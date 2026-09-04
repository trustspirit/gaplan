import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { buildPublicSchedulePayload, PublicScopeError, type FirestoreLike } from './publicSchedulePayload'

/** PublicScopeError의 reason을 콜러블 계약이 쓰던 메시지 그대로 옮겨 담는다 —
 *  클라이언트가 permission-denied 문자열로 비공개를 판정하므로 바꾸면 안 된다
 *  (PublicSchedulePage의 isPermission 분기). */
function toHttpsError(e: PublicScopeError): HttpsError {
  switch (e.reason) {
    case 'invalid-token':
      return new HttpsError('permission-denied', 'Invalid token')
    case 'not-enabled':
      return new HttpsError('permission-denied', 'Public schedule is not enabled')
    case 'scope-not-enabled':
      return new HttpsError('permission-denied', 'This scope is not enabled')
    case 'invalid-scope':
      return new HttpsError('permission-denied', 'Invalid scope')
  }
}

export const getPublicSchedules = onCall(
  { region: 'asia-northeast3' },
  async (request: CallableRequest<{ token?: string }>) => {
    const { token } = request.data ?? {}

    if (!token || typeof token !== 'string') {
      throw new HttpsError('invalid-argument', 'token is required')
    }

    try {
      // 실제 Firestore 타입은 FirestoreLike보다 구조적으로 넓다(admin SDK가 여기서만 등장한다).
      return await buildPublicSchedulePayload(admin.firestore() as unknown as FirestoreLike, token)
    } catch (e) {
      if (e instanceof PublicScopeError) throw toHttpsError(e)
      throw e
    }
  },
)
