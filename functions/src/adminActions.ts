import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

export const deleteUser = functions
  .region('asia-northeast3')
  .https.onCall(async (data: { uid: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')

    const callerSnap = await admin.firestore().collection('users').doc(context.auth.uid).get()
    if (callerSnap.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only')
    }

    if (!data.uid || typeof data.uid !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'uid required')
    }

    if (data.uid === context.auth.uid) {
      throw new functions.https.HttpsError('invalid-argument', '본인 계정은 삭제할 수 없습니다')
    }

    await Promise.all([
      admin.auth().deleteUser(data.uid),
      admin.firestore().collection('users').doc(data.uid).delete(),
    ])

    return { success: true }
  })
