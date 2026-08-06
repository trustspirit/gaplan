import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase'

const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize'
const CALLBACK_PATH = '/kakao/callback'
const SCOPE = 'talk_calendar'

export function getKakaoRedirectUri(): string {
  return `${window.location.origin}${CALLBACK_PATH}`
}

export function buildKakaoAuthUrl(): string {
  const clientId = import.meta.env.VITE_KAKAO_REST_API_KEY
  if (!clientId) throw new Error('VITE_KAKAO_REST_API_KEY is not configured')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getKakaoRedirectUri(),
    response_type: 'code',
    scope: SCOPE,
  })
  return `${KAKAO_AUTH_URL}?${params.toString()}`
}

const kakaoConnectFn = httpsCallable(functions, 'kakaoConnect')
const kakaoDisconnectFn = httpsCallable(functions, 'kakaoDisconnect')

export async function connectKakao(code: string): Promise<void> {
  await kakaoConnectFn({ code, redirectUri: getKakaoRedirectUri() })
}

export async function disconnectKakao(): Promise<void> {
  await kakaoDisconnectFn({})
}
