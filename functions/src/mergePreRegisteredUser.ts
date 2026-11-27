import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'
import { planSeventyLinkMove } from './seventyLinkMerge'
import { findAssignedSeventyRefs, findSeventyOwnedRefs } from './preRegisteredSeventyRefs'

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

    const availabilityRef = db.collection('availability').doc(preUid)
    const [
      seventySchedules,
      presidentSchedules,
      publicUnitsSnap,
      publicSettingsSnap,
      assignedRefs,
      ownedRefs,
      availabilityDoc,
      availabilitySlots,
    ] = await Promise.all([
      db.collection('schedules').where('seventyUid', '==', preUid).get(),
      db.collection('schedules').where('presidentUid', '==', preUid).get(),
      db.doc('settings/publicUnits').get(),
      db.doc('settings/public').get(),
      // 이 칠십인을 담당으로 둔 집행서기 계정·초대장 — 연결이 옛 uid에 남지 않게 함께 옮긴다.
      findAssignedSeventyRefs(db, preUid),
      // 이 칠십인 것인 방문 요청·태스크·방문 계획 — 옛 uid에 남으면 로그인 뒤 화면에서 사라진다.
      findSeventyOwnedRefs(db, preUid),
      // 가능 시간은 uid가 문서 경로(availability/{uid}/slots)라 필드를 고칠 수 없어 새 경로로 복사한다.
      availabilityRef.get(),
      availabilityRef.collection('slots').get(),
    ])

    // 이 칠십인의 개인 공개 링크도 진짜 uid로 옮긴다 — 일정의 seventyUid만 바뀌면 기존 주소와
    // 캘린더 구독이 그날부터 빈 일정표가 된다(seventyLinkMerge.ts).
    const linkMove = planSeventyLinkMove(preUid, realUid, publicUnitsSnap.data(), publicSettingsSnap.data())

    const linkOps = linkMove ? 2 + (linkMove.moveGlobalPointer ? 1 : 0) : 0
    const availabilityOps = (availabilityDoc.exists ? 2 : 0) + availabilitySlots.size * 2
    const totalOps =
      2 +
      linkOps +
      assignedRefs.length +
      ownedRefs.length +
      availabilityOps +
      seventySchedules.size +
      presidentSchedules.size
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

    for (const ref of assignedRefs) batch.update(ref, { assignedSeventyUid: realUid })
    for (const ref of ownedRefs) batch.update(ref, { seventyUid: realUid })
    const realAvailabilityRef = db.collection('availability').doc(realUid)
    if (availabilityDoc.exists) {
      batch.set(realAvailabilityRef, availabilityDoc.data() ?? {}, { merge: true })
      batch.delete(availabilityRef)
    }
    for (const slot of availabilitySlots.docs) {
      const slotData = slot.data()
      // 슬롯 문서가 seventyUid를 들고 있으면 그것도 진짜 uid로 바꿔 복사한다.
      batch.set(
        realAvailabilityRef.collection('slots').doc(slot.id),
        'seventyUid' in slotData ? { ...slotData, seventyUid: realUid } : slotData,
      )
      batch.delete(slot.ref)
    }
    for (const snap of seventySchedules.docs) batch.update(snap.ref, { seventyUid: realUid })
    for (const snap of presidentSchedules.docs) batch.update(snap.ref, { presidentUid: realUid })

    await batch.commit()

    return userData // Return without serverTimestamp fields (not serializable)
  },
)
