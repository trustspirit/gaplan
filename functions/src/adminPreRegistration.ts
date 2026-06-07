import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface AddPreRegRequest {
  name: string
  email?: string
  role: 'president' | 'seventy'
  unitId?: string
  regionId?: string
  regionIds?: string[]
}

async function assertAdmin(uid: string): Promise<void> {
  const snap = await admin.firestore().collection('users').doc(uid).get()
  if (!snap.exists || snap.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only')
  }
}

export const adminAddPreRegisteredUser = functions
  .region('asia-northeast3')
  .https.onCall(async (data: AddPreRegRequest, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    await assertAdmin(context.auth.uid)

    if (!data.name?.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'name required')
    }
    if (!['president', 'seventy'].includes(data.role)) {
      throw new functions.https.HttpsError('invalid-argument', 'role must be president or seventy')
    }

    const db = admin.firestore()
    const ref = db.collection('users').doc()
    await ref.set({
      name: data.name.trim(),
      email: (data.email ?? '').trim().toLowerCase(),
      role: data.role,
      ...(data.unitId ? { unitId: data.unitId } : {}),
      ...(data.regionId ? { regionId: data.regionId } : {}),
      ...(data.regionIds ? { regionIds: data.regionIds } : {}),
      preRegistered: true,
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { uid: ref.id }
  })

export const adminDeletePreRegisteredUser = functions
  .region('asia-northeast3')
  .https.onCall(async (data: { uid: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    await assertAdmin(context.auth.uid)

    if (!data.uid) throw new functions.https.HttpsError('invalid-argument', 'uid required')

    const db = admin.firestore()
    const snap = await db.collection('users').doc(data.uid).get()
    if (!snap.exists || !snap.data()?.preRegistered) {
      throw new functions.https.HttpsError('not-found', 'Pre-registered user not found')
    }

    await db.collection('users').doc(data.uid).delete()
    return { success: true }
  })
