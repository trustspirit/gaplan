import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'

export const deleteUser = onCall(
  PUBLIC_HTTP_OPTS,
  async (request: CallableRequest<{ uid: string }>) => {
    const data = request.data
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required')

    const callerSnap = await admin.firestore().collection('users').doc(request.auth.uid).get()
    if (callerSnap.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin only')
    }

    if (!data.uid || typeof data.uid !== 'string') {
      throw new HttpsError('invalid-argument', 'uid required')
    }

    if (data.uid === request.auth.uid) {
      throw new HttpsError('invalid-argument', '본인 계정은 삭제할 수 없습니다')
    }

    await Promise.all([
      admin.auth().deleteUser(data.uid),
      admin.firestore().collection('users').doc(data.uid).delete(),
    ])

    return { success: true }
  },
)
