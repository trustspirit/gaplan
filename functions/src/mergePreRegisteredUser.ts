import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'
import { planSeventyLinkMove } from './seventyLinkMerge'

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

    const [seventySchedules, presidentSchedules, publicUnitsSnap, publicSettingsSnap] = await Promise.all([
      db.collection('schedules').where('seventyUid', '==', preUid).get(),
      db.collection('schedules').where('presidentUid', '==', preUid).get(),
      db.doc('settings/publicUnits').get(),
      db.doc('settings/public').get(),
    ])

    // 이 칠십인의 개인 공개 링크도 진짜 uid로 옮긴다 — 일정의 seventyUid만 바뀌면 기존 주소와
    // 캘린더 구독이 그날부터 빈 일정표가 된다(seventyLinkMerge.ts).
    const linkMove = planSeventyLinkMove(preUid, realUid, publicUnitsSnap.data(), publicSettingsSnap.data())

    const linkOps = linkMove ? 2 + (linkMove.moveGlobalPointer ? 1 : 0) : 0
    const totalOps = 2 + linkOps + seventySchedules.size + presidentSchedules.size
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

    if (linkMove) {
      batch.set(
        db.doc('settings/publicUnits'),
        { [linkMove.newScopeId]: linkMove.state, [linkMove.oldScopeId]: admin.firestore.FieldValue.delete() },
        { merge: true },
      )
      batch.set(db.doc('settings/publicTokens'), { [linkMove.state.token]: linkMove.newScopeId }, { merge: true })
      if (linkMove.moveGlobalPointer) {
        batch.set(db.doc('settings/public'), { globalTokenMovedTo: linkMove.newScopeId }, { merge: true })
      }
    }

    for (const snap of seventySchedules.docs) batch.update(snap.ref, { seventyUid: realUid })
    for (const snap of presidentSchedules.docs) batch.update(snap.ref, { presidentUid: realUid })

    await batch.commit()

    return userData // Return without serverTimestamp fields (not serializable)
  },
)
