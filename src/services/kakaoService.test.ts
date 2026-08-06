import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/firebase', () => ({ functions: 'functions' }))
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn(() => vi.fn()) }))

import { buildKakaoAuthUrl, consumeKakaoState, getKakaoRedirectUri } from './kakaoService'

describe('getKakaoRedirectUri', () => {
  it('현재 origin에 콜백 경로를 붙인다', () => {
    expect(getKakaoRedirectUri()).toBe(`${window.location.origin}/kakao/callback`)
  })
})

describe('buildKakaoAuthUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_KAKAO_REST_API_KEY', 'TEST_KEY')
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('카카오 인가 엔드포인트를 가리킨다', () => {
    expect(buildKakaoAuthUrl()).toContain('https://kauth.kakao.com/oauth/authorize')
  })

  it('필수 쿼리 파라미터를 모두 담는다', () => {
    const url = new URL(buildKakaoAuthUrl())
    expect(url.searchParams.get('client_id')).toBe('TEST_KEY')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('redirect_uri')).toBe(getKakaoRedirectUri())
    expect(url.searchParams.get('scope')).toBe('talk_calendar')
  })

  it('앱 키가 없으면 에러를 던진다', () => {
    vi.stubEnv('VITE_KAKAO_REST_API_KEY', '')
    expect(() => buildKakaoAuthUrl()).toThrow('VITE_KAKAO_REST_API_KEY')
  })

  it('매 호출마다 무작위 state를 쿼리 파라미터에 담는다', () => {
    const url = new URL(buildKakaoAuthUrl())
    const state = url.searchParams.get('state')
    expect(state).toBeTruthy()

    sessionStorage.clear()
    const secondUrl = new URL(buildKakaoAuthUrl())
    expect(secondUrl.searchParams.get('state')).not.toBe(state)
  })

  it('생성한 state를 콜백이 찾을 수 있는 곳(sessionStorage)에 저장한다', () => {
    const url = new URL(buildKakaoAuthUrl())
    const state = url.searchParams.get('state')
    expect(consumeKakaoState()).toBe(state)
  })
})

describe('consumeKakaoState', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_KAKAO_REST_API_KEY', 'TEST_KEY')
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('저장된 state를 1회 읽고 삭제한다 — 두 번째 호출은 null을 반환한다', () => {
    buildKakaoAuthUrl()
    expect(consumeKakaoState()).toBeTruthy()
    expect(consumeKakaoState()).toBeNull()
  })

  it('저장된 state가 없으면 null을 반환한다', () => {
    expect(consumeKakaoState()).toBeNull()
  })
})
