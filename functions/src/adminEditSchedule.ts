import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { DATE_RE, TIME_RE, isValidUrl } from './validators'
import { validateRelatedVisit } from './relatedVisit'
import { CC_COUNCIL_TARGET_KIND } from './ccCouncil'
import { resolveScheduleLocationForEdit } from './adminScheduleFields'

interface AdminEditScheduleRequest {
  scheduleId: string
  updates: {
    date?: string
    startTime?: string
    endTime?: string
    notes?: string | null
    unitId?: string
    wardName?: string | null
    presidentUid?: string | null
    zoomLink?: string | null
    location?: string | null
    customTitle?: string | null
    projectId?: string | null
    presidentAccompanied?: boolean | null
    targetKind?: 'stake_president' | 'ward_bishop' | 'other' | 'cc_council' | null
    wardId?: string | null
    relatedVisitId?: string | null
  }
}

export const adminEditSchedule = functions
  .region('asia-northeast3')
  .https.onCall(async (data: AdminEditScheduleRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }

    const db = admin.firestore()
    const callerSnap = await db.collection('users').doc(context.auth.uid).get()
    const callerRole = callerSnap.data()?.role
    if (!['admin', 'seventy', 'exec_secretary'].includes(callerRole)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin, seventy, or exec_secretary only')
    }

    const { scheduleId, updates } = data

    if (!scheduleId || !updates) {
      throw new functions.https.HttpsError('invalid-argument', 'scheduleId and updates required')
    }

    const allowed: Record<string, unknown> = {}
    if (updates.date !== undefined) {
      if (typeof updates.date !== 'string' || !DATE_RE.test(updates.date)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid date format')
      }
      allowed.date = updates.date
    }
    if (updates.startTime !== undefined) {
      if (typeof updates.startTime !== 'string' || !TIME_RE.test(updates.startTime)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid startTime format')
      }
      allowed.startTime = updates.startTime
    }
    if (updates.endTime !== undefined) {
      if (typeof updates.endTime !== 'string' || !TIME_RE.test(updates.endTime)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid endTime format')
      }
      allowed.endTime = updates.endTime
    }
    if (updates.notes !== undefined) {
      if (updates.notes !== null && (typeof updates.notes !== 'string' || updates.notes.length > 500)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid notes')
      }
      allowed.notes = updates.notes
    }
    if (updates.unitId !== undefined) {
      if (typeof updates.unitId !== 'string' || updates.unitId.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid unitId')
      }
      allowed.unitId = updates.unitId
    }
    if (updates.wardName !== undefined) {
      if (updates.wardName !== null && typeof updates.wardName !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid wardName')
      }
      allowed.wardName = updates.wardName
    }
    if (updates.presidentUid !== undefined) {
      if (updates.presidentUid !== null && typeof updates.presidentUid !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid presidentUid')
      }
      allowed.presidentUid = updates.presidentUid
    }
    if (updates.zoomLink !== undefined) {
      if (updates.zoomLink !== null) {
        const trimmed = updates.zoomLink.trim()
        if (!trimmed || trimmed.length > 500 || !isValidUrl(trimmed)) {
          throw new functions.https.HttpsError('invalid-argument', 'Invalid zoomLink URL')
        }
        allowed.zoomLink = trimmed
      } else {
        allowed.zoomLink = null
      }
    }
    if (updates.customTitle !== undefined) {
      if (updates.customTitle !== null) {
        const trimmed = updates.customTitle.trim()
        if (!trimmed || trimmed.length > 200) {
          throw new functions.https.HttpsError('invalid-argument', 'customTitle must be 1-200 chars')
        }
        allowed.customTitle = trimmed
      } else {
        allowed.customTitle = null
      }
    }
    if (updates.location !== undefined) {
      if (updates.location !== null) {
        const trimmed = updates.location.trim()
        if (trimmed.length > 100) {
          throw new functions.https.HttpsError('invalid-argument', 'location max 100 chars')
        }
      }
    }
    if (updates.projectId !== undefined) {
      allowed.projectId = updates.projectId || null
    }
    if (updates.presidentAccompanied !== undefined) {
      if (updates.presidentAccompanied !== null && typeof updates.presidentAccompanied !== 'boolean') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid presidentAccompanied')
      }
      allowed.presidentAccompanied = updates.presidentAccompanied === true ? true : null
    }
    if (updates.targetKind !== undefined) {
      if (updates.targetKind !== null && !['stake_president', 'ward_bishop', 'other', CC_COUNCIL_TARGET_KIND].includes(updates.targetKind)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid targetKind')
      }
      allowed.targetKind = updates.targetKind
    }
    if (updates.wardId !== undefined) {
      if (updates.wardId !== null && (typeof updates.wardId !== 'string' || updates.wardId.length > 100)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid wardId')
      }
      allowed.wardId = updates.wardId
    }
    if (updates.relatedVisitId !== undefined) {
      if (updates.relatedVisitId !== null &&
          (typeof updates.relatedVisitId !== 'string' || updates.relatedVisitId.length > 200)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid relatedVisitId')
      }
      allowed.relatedVisitId = (updates.relatedVisitId && updates.relatedVisitId.trim())
        ? updates.relatedVisitId.trim()
        : null
    }

    if (Object.keys(allowed).length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'No valid updates provided')
    }

    const scheduleRef = db.collection('schedules').doc(scheduleId)
    const snap = await scheduleRef.get()

    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Schedule not found')
    }

    if (callerRole === 'seventy' && snap.data()?.seventyUid !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Seventy can only edit their own schedules')
    }

    if (callerRole === 'exec_secretary') {
      const callerData = callerSnap.data()
      const assignedUid = callerData?.assignedSeventyUid as string | undefined
      if (!assignedUid || snap.data()?.seventyUid !== assignedUid) {
        throw new functions.https.HttpsError('permission-denied',
          'exec_secretary can only edit schedules for their assigned seventy')
      }
    }

    // 협의 평의회는 'unitId는 비고 regionId가 채워져 있다'가 전제다. 수정으로 스테이크가
    // 붙으면 그 스테이크 쿼리에까지 딸려 나오므로 막는다. (regionId는 애초에 수정 대상이 아니다)
    if (snap.data()?.targetKind === CC_COUNCIL_TARGET_KIND) {
      if (allowed.unitId) {
        throw new functions.https.HttpsError('invalid-argument', 'cc_council schedules cannot be tied to a unit')
      }
      if (allowed.targetKind !== undefined && allowed.targetKind !== CC_COUNCIL_TARGET_KIND) {
        throw new functions.https.HttpsError('invalid-argument', 'cc_council targetKind cannot be changed')
      }
    } else if (allowed.targetKind === CC_COUNCIL_TARGET_KIND) {
      throw new functions.https.HttpsError('invalid-argument', 'cannot convert an existing schedule to cc_council')
    }

    if (allowed.startTime !== undefined || allowed.endTime !== undefined) {
      const current = snap.data()!
      const effectiveStart = (allowed.startTime as string | undefined) ?? current.startTime
      const effectiveEnd = (allowed.endTime as string | undefined) ?? current.endTime
      if (effectiveStart >= effectiveEnd) {
        throw new functions.https.HttpsError('invalid-argument', 'endTime must be after startTime')
      }
    }

    if (allowed.relatedVisitId) {
      const current = snap.data()!
      const effectiveDate = (allowed.date as string | undefined) ?? current.date
      const visitSnap = await db.collection('schedules').doc(allowed.relatedVisitId as string).get()
      const problem = validateRelatedVisit({
        scheduleType: current.type,
        scheduleSeventyUid: current.seventyUid,
        scheduleDate: effectiveDate,
        visit: visitSnap.exists ? (visitSnap.data() as { type?: string; seventyUid?: string; date?: string }) : null,
      })
      if (problem) {
        throw new functions.https.HttpsError('invalid-argument', problem)
      }
    }

    if (allowed.date !== undefined || allowed.startTime !== undefined) {
      const current = snap.data()!
      const checkDate = (allowed.date as string | undefined) ?? current.date
      const checkStart = (allowed.startTime as string | undefined) ?? current.startTime
      const duplicate = await db.collection('schedules')
        .where('seventyUid', '==', current.seventyUid)
        .where('date', '==', checkDate)
        .where('startTime', '==', checkStart)
        .where('status', '==', 'confirmed')
        .limit(1)
        .get()
      const conflict = duplicate.docs.find(d => d.id !== scheduleId)
      if (conflict) {
        throw new functions.https.HttpsError('already-exists', '해당 시간에 이미 확정된 일정이 있습니다.')
      }
    }

    // location은 write time에 다시 확정한다 — customTitle과 달리 사용자가 쓴 문구를
    // 다음 수정에서도 지켜주는 필드가 아니므로, 이번 요청이 명시하지 않았으면 매 수정마다
    // (기존 문서 + 이번 업데이트)를 합쳐 다시 유도해 오래된 값이 남지 않게 한다.
    {
      const current = snap.data()!
      allowed.location = resolveScheduleLocationForEdit(current as {
        type?: string
        unitId?: string
        regionId?: string | null
        targetKind?: string | null
        wardName?: string | null
        zoomLink?: string | null
      }, {
        unitId: allowed.unitId as string | undefined,
        targetKind: allowed.targetKind as string | null | undefined,
        wardName: allowed.wardName as string | null | undefined,
        zoomLink: allowed.zoomLink as string | null | undefined,
        location: updates.location,
      })
    }

    await scheduleRef.update({
      ...allowed,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid,
    })

    return { success: true }
  })
