import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { getScopeUnitIds } from './regions'
import { hasPendingReminders, currentQuarter, type PresenceSchedule } from './remindersPresence'

interface Req { viewSeventyUid?: string }

export const getRemindersPresence = functions
  .region('asia-northeast3')
  .https.onCall(async (data: Req, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }

    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(context.auth.uid).get()
    const caller = callerSnap.data()
    const role = caller?.role
    if (role !== 'admin' && role !== 'seventy' && role !== 'exec_secretary') {
      throw new functions.https.HttpsError('permission-denied', 'Admin, seventy, or exec_secretary only')
    }

    // Mirror src/hooks/useReminders.ts, which computes dates via dayjs() in local (Asia/Seoul,
    // UTC+9, no DST) time. Compute the KST "now" epoch once and derive today/lookback/end from it,
    // so date comparisons line up with the client instead of drifting by the UTC offset.
    const kstNow = Date.now() + 9 * 60 * 60 * 1000
    const today = new Date(kstNow).toISOString().slice(0, 10)
    // Mirror src/hooks/useReminders.ts: look back to min(quarterStart, today-60d) so early-quarter
    // stake interviews are visible even when today is >60d past the quarter start; +120d forward.
    const lookback = new Date(kstNow - 60 * 864e5).toISOString().slice(0, 10)
    const quarterStart = currentQuarter(today).start
    const startDate = quarterStart < lookback ? quarterStart : lookback
    const endDate = new Date(kstNow + 120 * 864e5).toISOString().slice(0, 10)

    const snap = await db.collection('schedules')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get()
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as PresenceSchedule))

    // Determine scope seventy uid (mirrors getSchedulesInRange.ts):
    //  - seventy: themselves
    //  - exec_secretary: their assigned seventy (assignedSeventyUid)
    //  - admin: viewSeventyUid if provided, else no filter (all schedules)
    let scopeSeventyUid: string | null = null
    if (role === 'seventy') {
      scopeSeventyUid = context.auth.uid
    } else if (role === 'exec_secretary') {
      scopeSeventyUid = (caller?.assignedSeventyUid as string | undefined) ?? null
      if (!scopeSeventyUid) return { hasPending: false }
    } else if (role === 'admin' && data.viewSeventyUid) {
      scopeSeventyUid = data.viewSeventyUid
    }

    let scopeUnits: string[]
    if (scopeSeventyUid) {
      const sevSnap = await db.collection('users').doc(scopeSeventyUid).get()
      const sev = sevSnap.data()
      const regionIds: string[] = sev?.regionIds ?? (sev?.regionId ? [sev.regionId] : [])
      const allowedUnits = new Set<string>()
      for (const r of regionIds) for (const u of getScopeUnitIds(r)) allowedUnits.add(u)
      docs = docs.filter(s => allowedUnits.has(s.unitId) || s.seventyUid === scopeSeventyUid)
      scopeUnits = [...allowedUnits]
    } else {
      // admin viewing everything: no seventy-scope filter available, so derive the unit list
      // from the units that actually appear in the queried schedule range (simplified — see
      // task brief note). Admins typically pick a viewSeventyUid, so this is a rare fallback.
      scopeUnits = [...new Set(docs.map(s => s.unitId).filter(Boolean))]
    }

    // Dismissed reminders live in userSettings/{uid} (see src/services/userSettingsService.ts),
    // NOT on the users/{uid} doc.
    const settingsSnap = await db.collection('userSettings').doc(context.auth.uid).get()
    const dismissed = new Set<string>(
      (settingsSnap.data()?.dismissedReminders as string[] | undefined) ?? [],
    )

    const hasPending = hasPendingReminders(
      scopeUnits,
      docs,
      new Set(scopeUnits),
      scopeSeventyUid,
      dismissed,
      today,
    )

    return { hasPending }
  })
