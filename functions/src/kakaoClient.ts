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
  kakaoUserId?: number
  connectedAt?: number
}

export interface KakaoTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  refresh_token_expires_in?: number
}

export function getKakaoConfig(): { restApiKey: string; clientSecret: string } {
  const cfg = functions.config().kakao ?? {}
  return {
    restApiKey: cfg.rest_api_key ?? process.env.KAKAO_REST_API_KEY ?? '',
    clientSecret: cfg.client_secret ?? process.env.KAKAO_CLIENT_SECRET ?? '',
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
  await db.collection('users').doc(uid).update({ kakaoConnected: false })
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

export async function createKakaoEvent(
  accessToken: string,
  body: KakaoEventBody,
): Promise<string | null> {
  const res = await postForm(
    `${KAPI_BASE}/v2/api/calendar/create/event`,
    createEventForm('primary', body),
    accessToken,
  )
  if (!res.ok) {
    functions.logger.error(`[kakao] create event failed: ${res.status} ${await res.text()}`)
    return null
  }
  const json = (await res.json()) as { event_id?: string }
  return json.event_id ?? null
}

export async function updateKakaoEvent(
  accessToken: string,
  eventId: string,
  body: KakaoEventBody,
): Promise<void> {
  const form = createEventForm('primary', body)
  form.set('event_id', eventId)
  form.delete('calendar_id')
  const res = await postForm(`${KAPI_BASE}/v2/api/calendar/update/event/host`, form, accessToken)
  if (!res.ok) {
    functions.logger.error(`[kakao] update event failed: ${res.status} ${await res.text()}`)
  }
}

export async function deleteKakaoEvent(accessToken: string, eventId: string): Promise<void> {
  const res = await fetch(
    `${KAPI_BASE}/v2/api/calendar/delete/event?event_id=${encodeURIComponent(eventId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) {
    functions.logger.error(`[kakao] delete event failed: ${res.status} ${await res.text()}`)
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
