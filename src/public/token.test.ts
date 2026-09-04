import { describe, it, expect } from 'vitest'
import { tokenFromPathname } from './token'

describe('tokenFromPathname', () => {
  it('공개 일정 경로에서 토큰을 꺼낸다', () => {
    expect(tokenFromPathname('/public/schedule/abc123')).toBe('abc123')
  })

  it('끝에 슬래시가 붙어도 같다', () => {
    expect(tokenFromPathname('/public/schedule/abc123/')).toBe('abc123')
  })

  it('토큰이 없으면 undefined', () => {
    expect(tokenFromPathname('/public/schedule/')).toBeUndefined()
    expect(tokenFromPathname('/public/schedule')).toBeUndefined()
  })

  it('다른 경로면 undefined', () => {
    expect(tokenFromPathname('/home')).toBeUndefined()
  })
})
