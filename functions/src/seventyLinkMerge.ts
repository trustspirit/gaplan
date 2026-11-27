import { SEVENTY_SCOPE_PREFIX } from './publicSchedulePayload'

/**
 * 미리 등록된 칠십인이 처음 로그인할 때(mergePreRegisteredUser) 그 칠십인의 개인 공개 링크를 진짜
 * uid로 옮길 계획. 일정의 seventyUid는 그 함수가 진짜 uid로 바꾸므로, 링크가 옛 uid에 남으면 그날부터
 * 기존 주소와 캘린더 구독이 빈 일정표가 된다.
 *
 * 토큰은 그대로 둔다 — 이미 전달된 주소가 바뀌지 않아야 한다. firebase-admin을 쓰지 않는 순수 함수라
 * 쓰기(삭제 표시 포함)는 호출부가 한다.
 */
export interface SeventyLinkMove {
  oldScopeId: string
  newScopeId: string
  state: { enabled: boolean; token: string }
  /** settings/public.globalTokenMovedTo가 옛 범위를 가리키면 새 범위로 바꿔야 한다. */
  moveGlobalPointer: boolean
}

export function planSeventyLinkMove(
  preUid: string,
  realUid: string,
  publicUnits: Record<string, unknown> | undefined,
  publicSettings: Record<string, unknown> | undefined,
): SeventyLinkMove | null {
  const oldScopeId = `${SEVENTY_SCOPE_PREFIX}${preUid}`
  const entry = publicUnits?.[oldScopeId] as { enabled?: unknown; token?: unknown } | undefined
  if (!entry || typeof entry.token !== 'string' || !entry.token) return null
  return {
    oldScopeId,
    newScopeId: `${SEVENTY_SCOPE_PREFIX}${realUid}`,
    state: { enabled: entry.enabled === true, token: entry.token },
    moveGlobalPointer: publicSettings?.globalTokenMovedTo === oldScopeId,
  }
}
