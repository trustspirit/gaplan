import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import * as crypto from 'crypto'

interface CreateTaskParams {
  type: 'select_visit' | 'select_interview'
  batchId?: string
  title?: string
  note?: string
  assignedTo: string
  seventyUid: string
  regionId: string
  unitId?: string
  dueDate: string
  createdBy: string
  availableDays: number[]
  availableDates?: string[]
  availableDateSlots?: { date: string; timeRanges: { startTime: string; endTime: string }[] }[]
  slotDurationMinutes?: number
}

export const createTask = functions
  .region('asia-northeast3')
  .https.onCall(async (data: CreateTaskParams, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')

    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(context.auth.uid).get()
    const callerRole = callerSnap.data()?.role
    if (!['admin', 'seventy'].includes(callerRole)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin or seventy only')
    }

    const respondToken = crypto.randomBytes(8).toString('hex')

    const { unitId, ...rest } = data
    const taskData = {
      ...rest,
      unitId: unitId ?? '',
      respondToken,
      status: 'pending',
      notifiedAt: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    const ref = await db.collection('tasks').add(taskData)
    return { id: ref.id }
  })

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
