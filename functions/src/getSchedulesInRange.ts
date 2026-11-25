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

    if (!scopeSeventyUid) {
      const snap = await rangeQuery(db.collection('schedules'), startDate, endDate).get()
      return { schedules: snap.docs.map(toSchedule) }
    }

    // 칠십인 본인이면 이미 읽은 문서를 쓴다
    const sev = scopeSeventyUid === request.auth.uid
      ? caller
      : (await db.collection('users').doc(scopeSeventyUid).get()).data()
    const regionIds: string[] = sev?.regionIds ?? (sev?.regionId ? [sev.regionId] : [])
    const allowedUnits = new Set<string>()
    for (const r of regionIds) for (const u of getScopeUnitIds(r)) allowedUnits.add(u)

    return { schedules: await scopedSchedules(db, scopeSeventyUid, [...allowedUnits], startDate, endDate) }
  },
)

type Query = FirebaseFirestore.Query

function rangeQuery(q: Query, startDate: string, endDate: string): Query {
  return q.where('date', '>=', startDate).where('date', '<=', endDate)
}

function toSchedule(d: FirebaseFirestore.QueryDocumentSnapshot): Record<string, unknown> {
  return { id: d.id, ...d.data() }
}

/** Firestore의 FAILED_PRECONDITION — 복합 인덱스가 없거나 아직 만드는 중 */
function isMissingIndex(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 9
}

/**
 * 그 칠십인의 일정 + 담당 CC 스테이크의 일정. 기간의 모든 일정을 읽고 거르면 다른 칠십인 일정까지
 * 모두 읽게 되므로(통계 화면은 36개월을 묻는다) 질의로 좁힌다. `in`은 30개까지라 나눠 묻고,
 * 두 조건에 다 걸린 일정은 하나로 합친다.
 * unitId+date 인덱스가 아직 없으면(배포 직후 생성 중) 예전처럼 기간 전체를 읽고 거른다.
 */
export async function scopedSchedules(
  db: FirebaseFirestore.Firestore,
  seventyUid: string,
  unitIds: string[],
  startDate: string,
  endDate: string,
): Promise<Record<string, unknown>[]> {
  const schedules = db.collection('schedules')
  try {
    const queries = [rangeQuery(schedules.where('seventyUid', '==', seventyUid), startDate, endDate)]
    for (let i = 0; i < unitIds.length; i += 30) {
      queries.push(rangeQuery(schedules.where('unitId', 'in', unitIds.slice(i, i + 30)), startDate, endDate))
    }
    const snaps = await Promise.all(queries.map((q) => q.get()))
    const byId = new Map<string, Record<string, unknown>>()
    for (const snap of snaps) for (const d of snap.docs) byId.set(d.id, toSchedule(d))
    return [...byId.values()]
  } catch (e) {
    if (!isMissingIndex(e)) throw e
    console.warn('[getSchedulesInRange] unitId+date index not ready; reading the whole range', e)
    const allowed = new Set(unitIds)
    const snap = await rangeQuery(schedules, startDate, endDate).get()
    return snap.docs
      .map(toSchedule)
      .filter((s) => allowed.has(s.unitId as string) || s.seventyUid === seventyUid)
  }
}
