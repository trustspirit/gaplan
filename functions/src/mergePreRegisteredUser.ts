import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface MergeRequest {
  preUid: string
}

export const mergePreRegisteredUser = functions
  .region('asia-northeast3')
  .https.onCall(async (data: MergeRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }

    const { preUid } = data
    if (!preUid) {
      throw new functions.https.HttpsError('invalid-argument', 'preUid required')
    }

    const db = admin.firestore()
    const realUid = context.auth.uid

    // Idempotency: if real user doc already exists, just return it
    const realUserSnap = await db.collection('users').doc(realUid).get()
    if (realUserSnap.exists) {
      return realUserSnap.data()
    }

    const preUserSnap = await db.collection('users').doc(preUid).get()
    if (!preUserSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Pre-registered user not found')
    }

    const preUserData = preUserSnap.data()!
    if (!preUserData.preRegistered) {
      throw new functions.https.HttpsError('failed-precondition', 'Not a pre-registered user')
    }

    // Bind merge to the caller's verified email to prevent IDOR
    const callerEmail = (context.auth.token.email ?? '').toLowerCase()
    const callerEmailVerified = context.auth.token.email_verified === true
    if (!callerEmail || !callerEmailVerified) {
      throw new functions.https.HttpsError('failed-precondition', 'Verified email required')
    }
    if ((preUserData.email ?? '').toLowerCase() !== callerEmail) {
      throw new functions.https.HttpsError('permission-denied', 'Email does not match pre-registered user')
    }

    // Fetch schedules referencing the placeholder uid
    const [seventySchedules, presidentSchedules] = await Promise.all([
      db.collection('schedules').where('seventyUid', '==', preUid).get(),
      db.collection('schedules').where('presidentUid', '==', preUid).get(),
    ])

    const batch = db.batch()

    // Create real user document (drop preRegistered flag)
    const { preRegistered: _drop, ...userData } = preUserData
    batch.set(db.collection('users').doc(realUid), {
      ...userData,
      mergedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Delete placeholder
    batch.delete(db.collection('users').doc(preUid))

    // Re-point schedules
    for (const snap of seventySchedules.docs) {
      batch.update(snap.ref, { seventyUid: realUid })
    }
    for (const snap of presidentSchedules.docs) {
      batch.update(snap.ref, { presidentUid: realUid })
    }

    await batch.commit()

    return userData
  })
