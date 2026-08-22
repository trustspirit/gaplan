import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { getScopeUnitIds, getScopeDisplayName, getScopeRegionId } from './regions'
import { CC_COUNCIL_TARGET_KIND, isCcCouncilForScope } from './ccCouncil'
import { generalScheduleInScope } from './generalScheduleScope'

interface PublicSchedule {
  id: string
  type: string
  unitId: string
  regionId?: string
  targetKind?: string
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
  // 여러 날 행사의 종료일. 이게 빠지면 ICS·구글 캘린더는 이틀로, 공개 일정표는
  // 하루로 보여줘 같은 행사를 두 곳에서 다르게 안내하게 된다.
  endDate?: string
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
    // 행사 스코프 판정은 유닛 링크에서도 그 유닛의 CC 기준으로 해야 한다.
    let scopeRegionId: string | null = null

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
      scopeRegionId = getScopeRegionId(scopeValue)
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    let query = admin.firestore().collection('schedules') as admin.firestore.Query
    if (unitIds !== null) query = query.where('unitId', 'in', unitIds)

    // 협의 평의회는 CC 전체가 대상이라 unitId가 비어 있어 위 unitId-in 쿼리에 걸리지 않는다.
    // regionId로 한 번 더 조회해 합친다. (전체 공유는 애초에 전 일정을 읽으므로 불필요)
    const ccQuery =
      unitIds !== null
        ? admin.firestore().collection('schedules')
            .where('regionId', '==', scopeValue)
            .where('status', '==', 'confirmed')
            .where('date', '>=', cutoffStr)
            .orderBy('date', 'asc')
            .get()
        : null

    const [snap, generalSnap, ccSnap] = await Promise.all([
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
      ccQuery,
    ])

    const unitSet = unitIds !== null ? new Set(unitIds) : null

    // 두 쿼리는 서로 겹치지 않지만(협의 평의회는 unitId가 빈 값), 방어적으로 id 기준 중복을 제거한다.
    const seen = new Set<string>()
    const docs = [...snap.docs, ...(ccSnap?.docs ?? [])].filter((d) => {
      if (seen.has(d.id)) return false
      seen.add(d.id)
      return true
    })

    const schedules: PublicSchedule[] = docs
      // 지역 공유는 와드 방문만 노출하되, 그 CC의 협의 평의회는 함께 내보낸다.
      .filter((d) => unitSet === null || d.data().type === 'ward_visit' || isCcCouncilForScope(d.data(), scopeValue))
      .sort((a, b) => (a.data().date as string).localeCompare(b.data().date as string))
      .map((d) => {
        const sd = d.data()
        return {
          id: d.id,
          type: sd.type,
          unitId: sd.unitId,
          ...(sd.regionId ? { regionId: sd.regionId } : {}),
          ...(sd.targetKind === CC_COUNCIL_TARGET_KIND ? { targetKind: CC_COUNCIL_TARGET_KIND } : {}),
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

    const generalSchedules: PublicGeneralSchedule[] = generalSnap.docs
      // 로그인 사용자용 관련성 판단은 isGeneralScheduleRelevant(src/types/generalSchedule.ts)를 쓴다 —
      // 이건 공개 스코프(전체 공유 vs 특정 CC 링크)에 실려야 하는지를 판단하는 별개의 규칙이다.
      .filter((d) => generalScheduleInScope(d.data(), scopeRegionId, unitIds))
      .map((d) => {
        const data = d.data()
        return {
          id: d.id,
          title: data.title,
          date: data.date,
          ...(data.endDate ? { endDate: data.endDate } : {}),
          ...(data.startTime ? { startTime: data.startTime } : {}),
          ...(data.endTime ? { endTime: data.endTime } : {}),
          category: data.category,
          isPublic: true,
        }
      })

    return { schedules, generalSchedules, scopeDisplayName }
  },
)
