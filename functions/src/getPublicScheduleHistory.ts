import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { PublicScopeError, type FirestoreLike } from './publicSchedulePayload'
import { buildPublicScheduleHistory, isHistoryDate } from './publicScheduleHistory'
import { toPublicScopeHttpsError } from './getPublicSchedules'
import { PUBLIC_MAX_INSTANCES } from './publicLimits'

/** 공개 일정표의 이전 일정을 before(제외)보다 이른 것부터 한 쪽씩 돌려준다. */
export const getPublicScheduleHistory = onCall(
  { region: 'asia-northeast3', maxInstances: PUBLIC_MAX_INSTANCES },
  async (request: CallableRequest<{ token?: string; before?: string }>) => {
    const { token, before } = request.data ?? {}

    if (!token || typeof token !== 'string') {
      throw new HttpsError('invalid-argument', 'token is required')
    }
    if (!isHistoryDate(before)) {
      throw new HttpsError('invalid-argument', 'before must be YYYY-MM-DD')
    }

    try {
      return await buildPublicScheduleHistory(admin.firestore() as unknown as FirestoreLike, token, before)
    } catch (e) {
      if (e instanceof PublicScopeError) throw toPublicScopeHttpsError(e)
      throw e
    }
  },
)
