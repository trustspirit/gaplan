import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

interface AddPreRegRequest {
  name: string
  email?: string
  role: 'president' | 'seventy' | 'exec_secretary'
  unitId?: string
  regionId?: string
  regionIds?: string[]
  assignedSeventyUid?: string
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
    if (!['president', 'seventy', 'exec_secretary'].includes(data.role)) {
      throw new functions.https.HttpsError('invalid-argument', 'role must be president, seventy, or exec_secretary')
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
      ...(data.assignedSeventyUid ? { assignedSeventyUid: data.assignedSeventyUid } : {}),
      preRegistered: true,
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { uid: ref.id }
  })

interface UpdatePreRegRequest {
  uid: string
  name?: string
  email?: string
  role?: 'president' | 'seventy' | 'exec_secretary'
  unitId?: string | null
  regionId?: string | null
  regionIds?: string[]
  assignedSeventyUid?: string | null
}

export const adminUpdatePreRegisteredUser = functions
  .region('asia-northeast3')
  .https.onCall(async (data: UpdatePreRegRequest, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    await assertAdmin(context.auth.uid)

    if (!data.uid) throw new functions.https.HttpsError('invalid-argument', 'uid required')

    const db = admin.firestore()
    const snap = await db.collection('users').doc(data.uid).get()
    if (!snap.exists || !snap.data()?.preRegistered) {
      throw new functions.https.HttpsError('not-found', 'Pre-registered user not found')
    }

    const updates: Record<string, unknown> = {}

    if (data.name !== undefined) {
      if (!data.name.trim()) throw new functions.https.HttpsError('invalid-argument', 'name cannot be empty')
      updates.name = data.name.trim()
    }
    if (data.email !== undefined) {
      const normalized = data.email.trim().toLowerCase()
      if (normalized) {
        // Uniqueness check: reject if another preRegistered doc already has this email
        const existing = await db.collection('users')
          .where('email', '==', normalized)
          .where('preRegistered', '==', true)
          .get()
        const conflict = existing.docs.find(d => d.id !== data.uid)
        if (conflict) {
          throw new functions.https.HttpsError('already-exists', '이미 등록된 이메일입니다.')
        }
      }
      updates.email = normalized
    }
    if (data.role !== undefined) {
      if (!['president', 'seventy', 'exec_secretary'].includes(data.role)) {
        throw new functions.https.HttpsError('invalid-argument', 'role must be president, seventy, or exec_secretary')
      }
      updates.role = data.role
      // Clear unitId when switching away from president
      if (data.role !== 'president' && data.unitId === undefined) updates.unitId = null
      // Clear regionId/regionIds when switching away from seventy
      if (data.role !== 'seventy' && data.regionIds === undefined) {
        updates.regionIds = []
        updates.regionId = null
      }
    }
    if (data.unitId !== undefined) updates.unitId = data.unitId ?? null
    if (data.regionId !== undefined) updates.regionId = data.regionId ?? null
    if (data.regionIds !== undefined) updates.regionIds = data.regionIds
    if (data.assignedSeventyUid !== undefined) updates.assignedSeventyUid = data.assignedSeventyUid ?? null

    if (Object.keys(updates).length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'No fields to update')
    }

    await db.collection('users').doc(data.uid).update(updates)
    return { success: true }
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
