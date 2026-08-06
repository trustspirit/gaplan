import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import type { KakaoEventBody } from './kakaoEventBody'

const KAUTH_TOKEN_URL = 'https://kauth.kakao.com/oauth/token'
const KAPI_BASE = 'https://kapi.kakao.com'

// 액세스 토큰이 요청 도중 만료되지 않도록 5분 여유를 둔다.
const EXPIRY_SKEW_MS = 5 * 60 * 1000

export interface KakaoTokenDoc {
  refreshToken: string
  accessToken: string
  accessTokenExpiresAt: number
  refreshTokenExpiresAt: number
  connectedAt?: number
}

export interface KakaoTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  refresh_token_expires_in?: number
  // 동의한 항목 목록. 카카오는 공백으로 구분해 돌려준다. (예: 'talk_calendar profile_nickname')
  scope?: string
}

// talk_calendar는 선택 동의 항목이다. 사용자가 거부해도 토큰은 정상 발급되므로
// 연동은 성공한 것처럼 보이지만, 이후 모든 이벤트 생성이 403으로 죽는다.
// 그 실패는 로그에만 남아 사용자에게는 아무 신호가 없다 — 연동 시점에 막는다.
// scope 필드 자체가 없으면(문서상 항상 오지만, 방어적으로) 판단하지 않고 통과시킨다.
export function hasTalkCalendarScope(scope: string | undefined): boolean {
  if (scope === undefined) return true
  return scope.split(/[\s,]+/).filter(Boolean).includes('talk_calendar')
}

export function getKakaoConfig(): { restApiKey: string; clientSecret: string } {
  return {
    restApiKey: functions.config().kakao?.rest_api_key ?? process.env.KAKAO_REST_API_KEY ?? '',
    clientSecret: functions.config().kakao?.client_secret ?? process.env.KAKAO_CLIENT_SECRET ?? '',
  }
}

export function isAccessTokenExpired(doc: KakaoTokenDoc, nowMs: number): boolean {
  return doc.accessTokenExpiresAt - EXPIRY_SKEW_MS <= nowMs
}

// 카카오는 리프레시 토큰 만료 1개월 전부터만 새 refresh_token을 발급한다.
// 그 전 응답에는 refresh_token이 아예 없으므로, 없을 때 기존 값을 유지해야 한다.
export function applyRefreshResponse(
  current: KakaoTokenDoc,
  res: KakaoTokenResponse,
  nowMs: number,
): KakaoTokenDoc {
  return {
    ...current,
    accessToken: res.access_token,
    accessTokenExpiresAt: nowMs + res.expires_in * 1000,
    refreshToken: res.refresh_token ?? current.refreshToken,
    refreshTokenExpiresAt: res.refresh_token_expires_in
      ? nowMs + res.refresh_token_expires_in * 1000
      : current.refreshTokenExpiresAt,
  }
}

export function createEventForm(calendarId: string, body: KakaoEventBody): URLSearchParams {
  return new URLSearchParams({ calendar_id: calendarId, event: JSON.stringify(body) })
}

async function postForm(url: string, form: URLSearchParams, accessToken?: string) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: form,
  })
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<KakaoTokenResponse & { refresh_token: string }> {
  const { restApiKey, clientSecret } = getKakaoConfig()
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: restApiKey,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  })
  const res = await postForm(KAUTH_TOKEN_URL, form)
  if (!res.ok) throw new Error(`kakao token exchange failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as KakaoTokenResponse & { refresh_token: string }
}

async function refreshTokens(refreshToken: string): Promise<KakaoTokenResponse> {
  const { restApiKey, clientSecret } = getKakaoConfig()
  const form = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: restApiKey,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })
  const res = await postForm(KAUTH_TOKEN_URL, form)
  if (!res.ok) throw new Error(`kakao token refresh failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as KakaoTokenResponse
}

async function markDisconnected(uid: string): Promise<void> {
  const db = admin.firestore()
  // set + merge는 문서가 없어도 던지지 않는다 (update는 NOT_FOUND로 던진다) —
  // 이 함수는 getAccessToken의 catch 안에서 호출되므로 여기서 던지면
  // "throw하지 않는다"는 getAccessToken의 계약이 깨진다.
  await db.collection('users').doc(uid).set({ kakaoConnected: false }, { merge: true })
  functions.logger.warn(`[kakao] disconnected uid=${uid}`)
}

/**
 * 저장된 토큰을 읽어 필요하면 갱신한 뒤 액세스 토큰을 돌려준다.
 * 갱신에 실패하면 kakaoConnected를 내리고 null을 돌려준다 — throw하지 않는다.
 */
export async function getAccessToken(uid: string): Promise<string | null> {
  const db = admin.firestore()
  const ref = db.collection('kakaoTokens').doc(uid)
  const snap = await ref.get()
  if (!snap.exists) return null
  const doc = snap.data() as KakaoTokenDoc

  const now = Date.now()
  if (!isAccessTokenExpired(doc, now)) return doc.accessToken

  try {
    const res = await refreshTokens(doc.refreshToken)
    const next = applyRefreshResponse(doc, res, now)
    await ref.set(next, { merge: true })
    return next.accessToken
  } catch (err) {
    functions.logger.error(`[kakao] token refresh failed uid=${uid}`, err)
    await markDisconnected(uid)
    return null
  }
}

// scheduleId는 로그 전용이다. 사고 후 추적에서 "어느 일정이 실패했는가"를
// 알 수 있어야 하는데, 지금은 sync 단계 로그에만 그 값이 있다.
export async function createKakaoEvent(
  accessToken: string,
  body: KakaoEventBody,
  scheduleId?: string,
): Promise<string | null> {
  const res = await postForm(
    `${KAPI_BASE}/v2/api/calendar/create/event`,
    createEventForm('primary', body),
    accessToken,
  )
  if (!res.ok) {
    functions.logger.error(
      `[kakao] create event failed schedule=${scheduleId ?? '-'}: ${res.status} ${await res.text()}`,
    )
    return null
  }
  const json = (await res.json()) as { event_id?: string }
  return json.event_id ?? null
}

export async function updateKakaoEvent(
  accessToken: string,
  eventId: string,
  body: KakaoEventBody,
  scheduleId?: string,
): Promise<void> {
  // 수정 API는 event_id + (event 또는 calendar_id) 중 최소 하나를 요구한다.
  // createEventForm은 생성용으로 calendar_id+event를 채워 주므로, 여기서는
  // event_id를 추가하고 calendar_id를 지워 event만으로 요건을 충족시킨다.
  const form = createEventForm('primary', body)
  form.set('event_id', eventId)
  form.delete('calendar_id')
  const res = await postForm(`${KAPI_BASE}/v2/api/calendar/update/event/host`, form, accessToken)
  if (!res.ok) {
    functions.logger.error(
      `[kakao] update event failed schedule=${scheduleId ?? '-'} event=${eventId}: ` +
        `${res.status} ${await res.text()}`,
    )
  }
}

export async function deleteKakaoEvent(
  accessToken: string,
  eventId: string,
  scheduleId?: string,
): Promise<void> {
  const res = await fetch(
    `${KAPI_BASE}/v2/api/calendar/delete/event?event_id=${encodeURIComponent(eventId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) {
    functions.logger.error(
      `[kakao] delete event failed schedule=${scheduleId ?? '-'} event=${eventId}: ` +
        `${res.status} ${await res.text()}`,
    )
  }
}

export async function unlinkKakao(accessToken: string): Promise<void> {
  const res = await fetch(`${KAPI_BASE}/v1/user/unlink`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    functions.logger.error(`[kakao] unlink failed: ${res.status} ${await res.text()}`)
  }
}
