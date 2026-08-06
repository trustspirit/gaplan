import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/firebase', () => ({ functions: 'functions' }))
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn(() => vi.fn()) }))

import { buildKakaoAuthUrl, getKakaoRedirectUri } from './kakaoService'

describe('getKakaoRedirectUri', () => {
  it('현재 origin에 콜백 경로를 붙인다', () => {
    expect(getKakaoRedirectUri()).toBe(`${window.location.origin}/kakao/callback`)
  })
})

describe('buildKakaoAuthUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_KAKAO_REST_API_KEY', 'TEST_KEY')
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
})
