import { settingsTabsFor, settingsTabBySlug } from './settingsTabs'
import { ROLE } from '@/constants/roles'

describe('settingsTabsFor', () => {
  it('gives an admin all three screens in spec order', () => {
    expect(settingsTabsFor(ROLE.ADMIN).map((x) => x.id)).toEqual(['system', 'sharing', 'account'])
  })

  // 스펙 §4.3 — 시스템은 관리자만, 공유는 관리자·집행서기.
  it('keeps the system screen from an exec secretary', () => {
    expect(settingsTabsFor(ROLE.EXEC_SECRETARY).map((x) => x.id)).toEqual(['sharing', 'account'])
  })

  // 판정 R48 — 내 계정은 모든 역할이 갖는다. 칠십인의 카카오 연동이 여기에만 있다.
  it('gives a seventy only their own account', () => {
    expect(settingsTabsFor(ROLE.SEVENTY).map((x) => x.id)).toEqual(['account'])
  })

  it('gives a president only their own account', () => {
    expect(settingsTabsFor(ROLE.PRESIDENT).map((x) => x.id)).toEqual(['account'])
  })

  it('gives a pending user nothing', () => {
    expect(settingsTabsFor(ROLE.PENDING)).toEqual([])
  })

  it('builds every path under the settings root', () => {
    for (const tab of settingsTabsFor(ROLE.ADMIN)) {
      expect(tab.path, tab.id).toBe(`/settings/${tab.slug}`)
    }
  })
})

describe('settingsTabBySlug', () => {
  it('resolves a slug the role can see', () => {
    expect(settingsTabBySlug(ROLE.ADMIN, 'sharing')?.id).toBe('sharing')
  })

  it('gives null for a slug this role cannot see', () => {
    expect(settingsTabBySlug(ROLE.SEVENTY, 'system')).toBeNull()
  })

  it('gives null for a slug that does not exist', () => {
    expect(settingsTabBySlug(ROLE.ADMIN, 'nope')).toBeNull()
  })

  it('gives null when there is no slug at all', () => {
    expect(settingsTabBySlug(ROLE.ADMIN, undefined)).toBeNull()
  })
})
