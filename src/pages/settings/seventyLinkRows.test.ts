import { describe, it, expect } from 'vitest'
import { buildSeventyLinkRows } from './seventyLinkRows'
import type { AppUser } from '@/types'

const u = (o: Partial<AppUser> & Pick<AppUser, 'uid' | 'role'>): AppUser =>
  ({ email: `${o.uid}@x`, name: o.uid, createdAt: '', ...o }) as AppUser

const sevA = u({ uid: 'a', role: 'seventy', name: '김칠십' })
const sevB = u({ uid: 'b', role: 'admin', secondaryRole: 'seventy', name: '가칠십' })
const pre = u({ uid: 'p', role: 'seventy', name: '나칠십', preRegistered: true })
const president = u({ uid: 'x', role: 'president', name: '회장' })
const users = [sevA, sevB, pre, president]

describe('buildSeventyLinkRows', () => {
  it('관리자에게는 칠십인(부역할 칠십인 관리자 포함) 전부를 이름순으로 보여 준다', () => {
    const rows = buildSeventyLinkRows(u({ uid: 'adm', role: 'admin' }), users, {})
    expect(rows.map((r) => r.uid)).toEqual(['b', 'a', 'p'])
    expect(rows[0]).toMatchObject({ scopeId: 'seventy:b', enabled: false, token: '' })
  })

  it('집행서기에게는 담당 칠십인 한 줄만', () => {
    const viewer = u({ uid: 'es', role: 'exec_secretary', assignedSeventyUid: 'a' })
    expect(buildSeventyLinkRows(viewer, users, {}).map((r) => r.uid)).toEqual(['a'])
  })

  it('부역할이 집행서기인 관리자도 담당 칠십인 한 줄만', () => {
    const viewer = u({ uid: 'ad', role: 'admin', secondaryRole: 'exec_secretary', assignedSeventyUid: 'b' })
    expect(buildSeventyLinkRows(viewer, users, {}).map((r) => r.uid)).toEqual(['b'])
  })

  it('담당이 없는 집행서기에게는 아무 줄도 없다', () => {
    expect(buildSeventyLinkRows(u({ uid: 'es', role: 'exec_secretary' }), users, {})).toEqual([])
  })

  // 첫 로그인 때 mergePreRegisteredUser가 개인 링크도 진짜 uid로 옮기므로 잠그지 않는다.
  it('미리 등록만 된 칠십인도 줄이 있고, 저장된 켜짐·토큰을 반영한다', () => {
    const rows = buildSeventyLinkRows(u({ uid: 'adm', role: 'admin' }), users, {
      'seventy:a': { enabled: true, token: 't' },
    })
    expect(rows.find((r) => r.uid === 'p')).not.toHaveProperty('locked')
    expect(rows.find((r) => r.uid === 'a')).toMatchObject({ enabled: true, token: 't' })
  })
})
