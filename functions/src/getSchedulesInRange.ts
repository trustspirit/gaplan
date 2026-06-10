import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { getScopeUnitIds } from './regions'

interface Req { startDate: string; endDate: string }

export const getSchedulesInRange = functions
  .region('asia-northeast3')
  .https.onCall(async (data: Req, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }
    const { startDate, endDate } = data
    if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'startDate and endDate required')
    }

    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(context.auth.uid).get()
    const caller = callerSnap.data()
    const role = caller?.role
    if (role !== 'admin' && role !== 'seventy') {
      throw new functions.https.HttpsError('permission-denied', 'Admin or seventy only')
    }

    const snap = await db.collection('schedules')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get()
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>))

    if (role === 'seventy') {
      const regionIds: string[] = caller?.regionIds ?? (caller?.regionId ? [caller.regionId] : [])
      const allowedUnits = new Set<string>()
      for (const r of regionIds) for (const u of getScopeUnitIds(r)) allowedUnits.add(u)
      const uid = context.auth.uid
      docs = docs.filter(s => allowedUnits.has(s.unitId as string) || s.seventyUid === uid)
    }

    return { schedules: docs }
  })
