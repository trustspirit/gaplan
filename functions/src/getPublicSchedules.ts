import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { getScopeUnitIds, getScopeDisplayName } from './regions'

interface PublicSchedule {
  id: string
  type: string
  unitId: string
  date: string
  startTime: string
  endTime: string
  status: string
  wardName?: string
  zoomLink?: string | null
  customTitle?: string | null
  confirmedAt?: string
}

export const getPublicSchedules = functions
  .region('asia-northeast3')
  .https.onCall(async (data: { token?: string }) => {
    const { token } = data ?? {}

    if (!token || typeof token !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'token is required')
    }

    // Resolve token → scopeValue
    const tokensSnap = await admin.firestore().doc('settings/publicTokens').get()
    const scopeValue: string | undefined = tokensSnap.exists ? tokensSnap.data()?.[token] : undefined

    if (!scopeValue) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid token')
    }

    // Always check global flag
    const settingsSnap = await admin.firestore().doc('settings/public').get()
    const globalEnabled = settingsSnap.exists && settingsSnap.data()?.schedulePublic === true

    if (!globalEnabled) {
      throw new functions.https.HttpsError('permission-denied', 'Public schedule is not enabled')
    }

    let unitIds: string[] | null = null
    let scopeDisplayName: string | null = null

    if (scopeValue !== '__all__') {
      // Check per-unit flag
      const unitsSnap = await admin.firestore().doc('settings/publicUnits').get()
      const unitEnabled = unitsSnap.exists && unitsSnap.data()?.[scopeValue]?.enabled === true

      if (!unitEnabled) {
        throw new functions.https.HttpsError('permission-denied', 'This scope is not enabled')
      }

      unitIds = getScopeUnitIds(scopeValue)
      scopeDisplayName = getScopeDisplayName(scopeValue) || null
    }

    // Build query
    let query: admin.firestore.Query = admin.firestore()
      .collection('schedules')
      .where('status', '==', 'confirmed')
      .orderBy('date', 'asc')

    if (unitIds && unitIds.length > 0) {
      query = query.where('unitId', 'in', unitIds)
    }

    const snap = await query.get()

    const schedules: PublicSchedule[] = snap.docs.map((d) => {
      const sd = d.data()
      return {
        id: d.id,
        type: sd.type,
        unitId: sd.unitId,
        date: sd.date,
        startTime: sd.startTime,
        endTime: sd.endTime,
        status: sd.status,
        ...(sd.wardName ? { wardName: sd.wardName } : {}),
        ...(sd.zoomLink != null ? { zoomLink: sd.zoomLink } : {}),
        ...(sd.customTitle != null ? { customTitle: sd.customTitle } : {}),
        ...(sd.confirmedAt ? { confirmedAt: sd.confirmedAt } : {}),
      }
    })

    return { schedules, scopeDisplayName }
  })
