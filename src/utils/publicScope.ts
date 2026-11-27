/** 칠십인 개인 링크의 범위 값 접두사(functions/src/publicSchedulePayload.ts의 SEVENTY_SCOPE_PREFIX와 같은 값). */
export const SEVENTY_SCOPE_PREFIX = 'seventy:'

export function seventyScopeId(seventyUid: string): string {
  return `${SEVENTY_SCOPE_PREFIX}${seventyUid}`
}
