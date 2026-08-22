import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { resolveScheduleLocation } from './adminScheduleFields'

interface PublishRequest { planId: string }

interface PlanItem {
  itemId: string
  unitId: string
  wardName: string
  date: string
  startTime: string
  endTime: string
  scheduleId?: string
}

/**
 * 방문 계획의 한 항목을 schedule 문서 payload로 바꾼다. 발행/재발행 모두 이 함수를
 * 쓴다 — 재발행이 `ref.update({ ...payload })`로 명시한 필드만 덮어쓰므로, location을
 * 여기서 매번 새로 유도해 넣지 않으면 와드/유닛이 바뀌어도 예전 location이 그대로
 * 남는다. 편집 경로의 같은 구멍을 막은 헬퍼(resolveScheduleLocation)를 그대로 쓴다.
 */
export function buildVisitPlanSchedulePayload(
  item: Pick<PlanItem, 'unitId' | 'wardName' | 'date' | 'startTime' | 'endTime'>,
  opts: {
    seventyUid: string
    presidentUid: string | null
    planId: string
    itemId: string
    projectId: string | null
    createdBy: string
  },
) {
  return {
    type: 'ward_visit' as const,
    seventyUid: opts.seventyUid,
    unitId: item.unitId,
    wardName: item.wardName,
    presidentUid: opts.presidentUid,
    date: item.date,
    startTime: item.startTime,
    endTime: item.endTime,
    status: 'confirmed' as const,
    notes: null,
    zoomLink: null,
    customTitle: null,
    location: resolveScheduleLocation({
      type: 'ward_visit',
      unitId: item.unitId,
      wardName: item.wardName,
      zoomLink: null,
      location: null,
    }),
    visitPlanId: opts.planId,
    visitPlanItemId: opts.itemId,
    projectId: opts.projectId,
    createdBy: opts.createdBy,
  }
}

export const publishVisitPlan = functions
  .region('asia-northeast3')
  .https.onCall(async (data: PublishRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }
    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(context.auth.uid).get()
    if (callerSnap.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only')
    }

    const { planId } = data
    if (!planId || typeof planId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'planId required')
    }

    const planRef = db.collection('visitPlans').doc(planId)
    const planSnap = await planRef.get()
    if (!planSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Plan not found')
    }
    const plan = planSnap.data()!
    const seventyUid: string = plan.seventyUid
    const items: PlanItem[] = plan.items ?? []

    // unit별 회장 1회 조회 캐시
    const presidentCache = new Map<string, string | null>()
    async function resolvePresident(unitId: string): Promise<string | null> {
      if (presidentCache.has(unitId)) return presidentCache.get(unitId)!
      const q = await db.collection('users')
        .where('role', '==', 'president')
        .where('unitId', '==', unitId)
        .limit(1)
        .get()
      const uid = q.empty ? null : q.docs[0].id
      presidentCache.set(unitId, uid)
      return uid
    }

    const updatedItems: PlanItem[] = []
    for (const item of items) {
      const presidentUid = await resolvePresident(item.unitId)
      const payload = buildVisitPlanSchedulePayload(item, {
        seventyUid,
        presidentUid,
        planId,
        itemId: item.itemId,
        projectId: plan.projectId ?? null,
        createdBy: context.auth.uid,
      })

      if (item.scheduleId) {
        const ref = db.collection('schedules').doc(item.scheduleId)
        const snap = await ref.get()
        if (snap.exists) {
          const cur = snap.data()!
          const changed =
            cur.date !== item.date ||
            cur.startTime !== item.startTime ||
            cur.endTime !== item.endTime ||
            cur.wardName !== item.wardName ||
            cur.unitId !== item.unitId ||
            (cur.projectId ?? null) !== (plan.projectId ?? null)
          if (changed) await ref.update({ ...payload })
          updatedItems.push(item)
        } else {
          const newRef = await db.collection('schedules').add({
            ...payload,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          updatedItems.push({ ...item, scheduleId: newRef.id })
        }
      } else {
        const newRef = await db.collection('schedules').add({
          ...payload,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        updatedItems.push({ ...item, scheduleId: newRef.id })
      }
    }

    await planRef.update({
      items: updatedItems,
      status: 'published',
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true }
  })
