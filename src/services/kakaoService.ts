import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase'

const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize'
const CALLBACK_PATH = '/kakao/callback'
const SCOPE = 'talk_calendar'
// sessionStorage (not localStorage): the pending-auth state must not outlive
// the tab or leak across tabs — it's only meaningful for the request that's
// currently in flight.
const STATE_STORAGE_KEY = 'kakao_oauth_state'

export function getKakaoRedirectUri(): string {
  return `${window.location.origin}${CALLBACK_PATH}`
}

export function buildKakaoAuthUrl(): string {
  const clientId = import.meta.env.VITE_KAKAO_REST_API_KEY
  if (!clientId) throw new Error('VITE_KAKAO_REST_API_KEY is not configured')
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_STORAGE_KEY, state)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getKakaoRedirectUri(),
    response_type: 'code',
    scope: SCOPE,
    state,
  })
  return `${KAKAO_AUTH_URL}?${params.toString()}`
}

// Single-use read: the callback must consume (and clear) the expected state
// before exchanging the code. Clearing on read means a replayed callback URL
// — even reloaded in the same tab — finds nothing to match against and fails.
export function consumeKakaoState(): string | null {
  const state = sessionStorage.getItem(STATE_STORAGE_KEY)
  sessionStorage.removeItem(STATE_STORAGE_KEY)
  return state
}

const kakaoConnectFn = httpsCallable(functions, 'kakaoConnect')
const kakaoDisconnectFn = httpsCallable(functions, 'kakaoDisconnect')

export async function connectKakao(code: string): Promise<void> {
  await kakaoConnectFn({ code, redirectUri: getKakaoRedirectUri() })
}

export async function disconnectKakao(): Promise<void> {
  await kakaoDisconnectFn({})
}
