import { describe, it, expect } from 'vitest'
import {
  applyRefreshResponse,
  isAccessTokenExpired,
  createEventForm,
  hasTalkCalendarScope,
  type KakaoTokenDoc,
} from './kakaoClient'

const NOW = 1_800_000_000_000

const DOC: KakaoTokenDoc = {
  refreshToken: 'OLD_REFRESH',
  accessToken: 'OLD_ACCESS',
  accessTokenExpiresAt: NOW + 3600_000,
  refreshTokenExpiresAt: NOW + 60 * 24 * 3600_000,
}

describe('isAccessTokenExpired', () => {
  it('만료 시각이 한참 남았으면 false', () => {
    expect(isAccessTokenExpired(DOC, NOW)).toBe(false)
  })

  it('이미 지났으면 true', () => {
    expect(isAccessTokenExpired({ ...DOC, accessTokenExpiresAt: NOW - 1 }, NOW)).toBe(true)
  })

  it('5분 이내로 남았으면 만료로 본다', () => {
    // 호출 직전에 만료되는 토큰으로 요청을 보내면 401이 난다.
    expect(isAccessTokenExpired({ ...DOC, accessTokenExpiresAt: NOW + 60_000 }, NOW)).toBe(true)
  })
})

describe('applyRefreshResponse', () => {
  it('새 액세스 토큰과 만료 시각을 반영한다', () => {
    const next = applyRefreshResponse(DOC, { access_token: 'NEW_ACCESS', expires_in: 21600 }, NOW)
    expect(next.accessToken).toBe('NEW_ACCESS')
    expect(next.accessTokenExpiresAt).toBe(NOW + 21600 * 1000)
  })

  it('응답에 refresh_token이 없으면 기존 리프레시 토큰을 유지한다', () => {
    // 카카오는 만료 1개월 전이 아니면 refresh_token을 응답에 담지 않는다.
    // 여기서 undefined를 저장하면 연동이 즉시 죽는다.
    const next = applyRefreshResponse(DOC, { access_token: 'NEW_ACCESS', expires_in: 21600 }, NOW)
    expect(next.refreshToken).toBe('OLD_REFRESH')
    expect(next.refreshTokenExpiresAt).toBe(DOC.refreshTokenExpiresAt)
  })

  it('응답에 refresh_token이 오면 덮어쓴다', () => {
    const next = applyRefreshResponse(
      DOC,
      {
        access_token: 'NEW_ACCESS',
        expires_in: 21600,
        refresh_token: 'NEW_REFRESH',
        refresh_token_expires_in: 5184000,
      },
      NOW,
    )
    expect(next.refreshToken).toBe('NEW_REFRESH')
    expect(next.refreshTokenExpiresAt).toBe(NOW + 5184000 * 1000)
  })

  it('refresh_token만 오고 만료 시간이 없으면 기존 만료 시각을 유지한다', () => {
    const next = applyRefreshResponse(
      DOC,
      { access_token: 'A', expires_in: 100, refresh_token: 'NEW_REFRESH' },
      NOW,
    )
    expect(next.refreshToken).toBe('NEW_REFRESH')
    expect(next.refreshTokenExpiresAt).toBe(DOC.refreshTokenExpiresAt)
  })
})

describe('createEventForm', () => {
  const BODY = {
    title: '교문 와드 방문',
    time: { start_at: '2026-08-09T01:00:00Z', end_at: '2026-08-09T03:00:00Z', time_zone: 'Asia/Seoul' },
  }

  it('calendar_id와 event를 폼 파라미터로 담는다', () => {
    const form = createEventForm('primary', BODY)
    expect(form.get('calendar_id')).toBe('primary')
    expect(form.get('event')).toBeTruthy()
  })

  it('event는 JSON 문자열이다', () => {
    // 카카오는 application/x-www-form-urlencoded를 받고 event는 JSON 문자열이다.
    // JSON 본문으로 보내면 거부된다.
    const form = createEventForm('primary', BODY)
    expect(JSON.parse(form.get('event')!)).toEqual(BODY)
  })
})

describe('hasTalkCalendarScope', () => {
  it('동의 목록에 talk_calendar가 있으면 true', () => {
    expect(hasTalkCalendarScope('profile_nickname talk_calendar')).toBe(true)
  })

  it('선택 동의를 거부해 talk_calendar가 빠지면 false', () => {
    expect(hasTalkCalendarScope('profile_nickname')).toBe(false)
  })

  it('동의 항목이 하나도 없으면 false', () => {
    expect(hasTalkCalendarScope('')).toBe(false)
  })

  it('scope 필드 자체가 없으면 판단하지 않고 통과시킨다', () => {
    // 판단할 근거가 없는데 막으면 멀쩡한 연동을 깨뜨린다.
    expect(hasTalkCalendarScope(undefined)).toBe(true)
  })

  it('접두어가 같은 다른 항목을 talk_calendar로 오인하지 않는다', () => {
    expect(hasTalkCalendarScope('talk_calendars')).toBe(false)
  })
})
