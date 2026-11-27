import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { PublicScopeError, type FirestoreLike } from './publicSchedulePayload'
import { buildPublicWardVisits, isWardVisitYear } from './publicWardVisits'
import { toPublicScopeHttpsError } from './getPublicSchedules'
import { PUBLIC_MAX_INSTANCES } from './publicLimits'

/** 칠십인 개인 링크의 "방문 와드" 탭 — 한 해 치 와드 방문. */
export const getPublicWardVisits = onCall(
  { region: 'asia-northeast3', maxInstances: PUBLIC_MAX_INSTANCES },
  async (request: CallableRequest<{ token?: string; year?: unknown }>) => {
    const { token, year } = request.data ?? {}

    if (!token || typeof token !== 'string') {
      throw new HttpsError('invalid-argument', 'token is required')
    }
    if (!isWardVisitYear(year)) {
      throw new HttpsError('invalid-argument', 'year is out of range')
    }

    try {
      return await buildPublicWardVisits(admin.firestore() as unknown as FirestoreLike, token, year)
    } catch (e) {
      if (e instanceof PublicScopeError) throw toPublicScopeHttpsError(e)
      throw e
    }
  },
)
