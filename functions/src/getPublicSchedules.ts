import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
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
  notes?: string | null
  presidentAccompanied?: boolean
}

interface PublicGeneralSchedule {
  id: string
  title: string
  date: string
  startTime?: string
  endTime?: string
  category: 'conference' | 'fasting' | 'other'
  isPublic: true
}

function todayInSeoul(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
}

export const getPublicSchedules = onCall(
  { region: 'asia-northeast3' },
  async (request: CallableRequest<{ token?: string }>) => {
    const { token } = request.data ?? {}

    if (!token || typeof token !== 'string') {
      throw new HttpsError('invalid-argument', 'token is required')
    }

    const [tokensSnap, settingsSnap, unitsSnap] = await Promise.all([
      admin.firestore().doc('settings/publicTokens').get(),
      admin.firestore().doc('settings/public').get(),
      admin.firestore().doc('settings/publicUnits').get(),
    ])

    const scopeValue: string | undefined = tokensSnap.exists ? tokensSnap.data()?.[token] : undefined

    if (!scopeValue) {
      throw new HttpsError('permission-denied', 'Invalid token')
    }

    const globalEnabled = settingsSnap.exists && settingsSnap.data()?.schedulePublic === true

    if (!globalEnabled) {
      throw new HttpsError('permission-denied', 'Public schedule is not enabled')
    }

    let unitIds: string[] | null = null
    let scopeDisplayName: string | null = null

    if (scopeValue !== '__all__') {
      const unitEnabled = unitsSnap.exists && unitsSnap.data()?.[scopeValue]?.enabled === true

      if (!unitEnabled) {
        throw new HttpsError('permission-denied', 'This scope is not enabled')
      }

      unitIds = getScopeUnitIds(scopeValue)
      if (unitIds.length === 0) {
        throw new HttpsError('permission-denied', 'Invalid scope')
      }
      scopeDisplayName = getScopeDisplayName(scopeValue) || null
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    let query = admin.firestore().collection('schedules') as admin.firestore.Query
    if (unitIds !== null) query = query.where('unitId', 'in', unitIds)
    const [snap, generalSnap] = await Promise.all([
      query
        .where('status', '==', 'confirmed')
        .where('date', '>=', cutoffStr)
        .orderBy('date', 'asc')
        .get(),
      admin.firestore()
        .collection('generalSchedules')
        .where('isPublic', '==', true)
        .where('date', '>=', todayInSeoul())
        .orderBy('date', 'asc')
        .get(),
    ])

    const unitSet = unitIds !== null ? new Set(unitIds) : null

    const schedules: PublicSchedule[] = snap.docs
      .filter((d) => unitSet === null || d.data().type === 'ward_visit')
      .map((d) => {
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
          ...(sd.notes != null ? { notes: sd.notes } : {}),
          ...(unitSet === null && sd.presidentAccompanied === true ? { presidentAccompanied: true } : {}),
        }
      })

    const generalSchedules: PublicGeneralSchedule[] = generalSnap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        title: data.title,
        date: data.date,
        ...(data.startTime ? { startTime: data.startTime } : {}),
        ...(data.endTime ? { endTime: data.endTime } : {}),
        category: data.category,
        isPublic: true,
      }
    })

    return { schedules, generalSchedules, scopeDisplayName }
  },
)
