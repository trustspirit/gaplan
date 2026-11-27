import type { PublicScopeState } from '@/services/publicLinkService'
import { seventyScopeId } from '@/utils/publicScope'
import type { AppUser } from '@/types'

export interface SeventyLinkRow {
  uid: string
  name: string
  scopeId: string
  enabled: boolean
  token: string
  /** 미리 등록만 된 칠십인 — 첫 로그인 때 uid가 바뀌어 그 전에 만든 링크는 빈 일정표가 된다. */
  locked: boolean
}

function isSeventy(user: AppUser): boolean {
  return user.role === 'seventy' || (user.role === 'admin' && user.secondaryRole === 'seventy')
}

function isExecSecretary(user: AppUser): boolean {
  return user.role === 'exec_secretary' || (user.role === 'admin' && user.secondaryRole === 'exec_secretary')
}

/**
 * 「설정 › 공유」의 칠십인 개인 링크 줄. 관리자는 칠십인 전부, 집행서기는 담당 칠십인 한 명만 본다.
 * 이 제한은 화면에서만 한다 — 규칙은 지금도 집행서기가 공개 링크 문서를 통째로 쓸 수 있게 열려 있다.
 */
export function buildSeventyLinkRows(
  viewer: AppUser,
  users: AppUser[],
  states: Record<string, PublicScopeState>,
): SeventyLinkRow[] {
  const seventies = users.filter(isSeventy)
  const visible = isExecSecretary(viewer)
    ? seventies.filter((s) => s.uid === viewer.assignedSeventyUid)
    : viewer.role === 'admin'
      ? seventies
      : []
  return visible
    .map((s) => {
      const scopeId = seventyScopeId(s.uid)
      const state = states[scopeId]
      return {
        uid: s.uid,
        name: s.name,
        scopeId,
        enabled: state?.enabled === true,
        token: state?.token ?? '',
        locked: s.preRegistered === true,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}
