import { type CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'
import { getScopeUnitIds } from './regions'

interface Req { startDate: string; endDate: string; viewSeventyUid?: string }

export const getSchedulesInRange = onCall(
  PUBLIC_HTTP_OPTS,
  async (request: CallableRequest<Req>) => {
    const data = request.data
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const { startDate, endDate, viewSeventyUid } = data
    if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
      throw new HttpsError('invalid-argument', 'startDate and endDate required')
    }

    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(request.auth.uid).get()
    const caller = callerSnap.data()
    const role = caller?.role
    if (role !== 'admin' && role !== 'seventy' && role !== 'exec_secretary') {
      throw new HttpsError('permission-denied', 'Admin, seventy, or exec_secretary only')
    }

    const snap = await db.collection('schedules')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get()
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>))

    // Determine scope seventy uid:
    //  - seventy: themselves
    //  - exec_secretary: their assigned seventy (assignedSeventyUid)
    //  - admin: viewSeventyUid if provided, else no filter (all schedules)
    let scopeSeventyUid: string | null = null
    if (role === 'seventy') {
      scopeSeventyUid = request.auth.uid
    } else if (role === 'exec_secretary') {
      scopeSeventyUid = (caller?.assignedSeventyUid as string | undefined) ?? null
      if (!scopeSeventyUid) return { schedules: [] }
    } else if (role === 'admin' && viewSeventyUid) {
      scopeSeventyUid = viewSeventyUid
    }

    if (scopeSeventyUid) {
      const sevSnap = await db.collection('users').doc(scopeSeventyUid).get()
      const sev = sevSnap.data()
      const regionIds: string[] = sev?.regionIds ?? (sev?.regionId ? [sev.regionId] : [])
      const allowedUnits = new Set<string>()
      for (const r of regionIds) for (const u of getScopeUnitIds(r)) allowedUnits.add(u)
      docs = docs.filter(
        s => allowedUnits.has(s.unitId as string) || s.seventyUid === scopeSeventyUid,
      )
    }

    return { schedules: docs }
  },
)
