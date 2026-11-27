import type { PublicScopeError } from './publicSchedulePayload'

/** 범위 판정이 실패했을 때 ICS가 403 본문으로 보내는 문구. 예전부터 쓰던 문구 그대로다. */
export function icsScopeErrorMessage(reason: PublicScopeError['reason']): string {
  switch (reason) {
    case 'invalid-token':
      return 'Invalid token'
    case 'not-enabled':
      return 'Public schedule is not enabled'
    case 'scope-not-enabled':
      return 'This scope is not enabled'
    case 'invalid-scope':
      return 'Invalid scope'
  }
}
