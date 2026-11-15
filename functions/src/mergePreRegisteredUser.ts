import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'

export const mergePreRegisteredUser = onCall(
  PUBLIC_HTTP_OPTS,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerEmail = (request.auth.token.email ?? '').trim().toLowerCase()
    const callerEmailVerified = request.auth.token.email_verified === true
    if (!callerEmail || !callerEmailVerified) {
      return null // No verified email → no pre-registration possible
    }

    const db = admin.firestore()
    const realUid = request.auth.uid

    // Idempotency: if real user doc already exists, return it
    const realUserSnap = await db.collection('users').doc(realUid).get()
    if (realUserSnap.exists) {
      return { ...realUserSnap.data(), uid: realUid }
    }

    // Server-side lookup by email (bypasses Firestore client Rules)
    const emailSnap = await db.collection('users').where('email', '==', callerEmail).get()
    const preRegDoc = emailSnap.docs.find(d => d.data().preRegistered === true)
    if (!preRegDoc) return null // No pre-registration found → normal login flow

    const preUserData = preRegDoc.data()

    // Verify the placeholder was admin-created (prevents self-issued placeholders)
    if (preUserData.createdBy) {
      const createdBySnap = await db.collection('users').doc(preUserData.createdBy).get()
      if (!createdBySnap.exists || createdBySnap.data()?.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Pre-registered user was not created by an admin')
      }
    }

    const preUid = preRegDoc.id

    const [seventySchedules, presidentSchedules] = await Promise.all([
      db.collection('schedules').where('seventyUid', '==', preUid).get(),
      db.collection('schedules').where('presidentUid', '==', preUid).get(),
    ])

    const totalOps = 2 + seventySchedules.size + presidentSchedules.size
    if (totalOps > 498) {
      throw new HttpsError('resource-exhausted', 'Too many schedule references to merge in one batch')
    }

    const batch = db.batch()

    const userData = { ...preUserData }
    delete userData.preRegistered
    delete userData.createdBy
    const mergedUserData = { ...userData, mergedAt: admin.firestore.FieldValue.serverTimestamp() }

    batch.set(db.collection('users').doc(realUid), mergedUserData)
    batch.delete(db.collection('users').doc(preUid))

    for (const snap of seventySchedules.docs) batch.update(snap.ref, { seventyUid: realUid })
    for (const snap of presidentSchedules.docs) batch.update(snap.ref, { presidentUid: realUid })

    await batch.commit()

    return userData // Return without serverTimestamp fields (not serializable)
  },
)
