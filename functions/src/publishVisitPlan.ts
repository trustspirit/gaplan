import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

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
      const payload = {
        type: 'ward_visit',
        seventyUid,
        unitId: item.unitId,
        wardName: item.wardName,
        presidentUid,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        status: 'confirmed',
        notes: null,
        zoomLink: null,
        customTitle: null,
        visitPlanId: planId,
        visitPlanItemId: item.itemId,
        projectId: plan.projectId ?? null,
        createdBy: context.auth.uid,
      }

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
