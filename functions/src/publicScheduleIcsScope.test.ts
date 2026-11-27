import { describe, it, expect } from 'vitest'
import { icsScopeErrorMessage } from './publicScheduleIcsScope'

// 구독 앱이 보는 403 본문이다. 범위 판정을 공용 함수로 옮기면서 문구가 바뀌지 않게 고정한다.
describe('icsScopeErrorMessage', () => {
  it('판정 실패 이유마다 예전 ICS가 보내던 문구를 그대로 돌려준다', () => {
    expect(icsScopeErrorMessage('invalid-token')).toBe('Invalid token')
    expect(icsScopeErrorMessage('not-enabled')).toBe('Public schedule is not enabled')
    expect(icsScopeErrorMessage('scope-not-enabled')).toBe('This scope is not enabled')
    expect(icsScopeErrorMessage('invalid-scope')).toBe('Invalid scope')
  })
})
