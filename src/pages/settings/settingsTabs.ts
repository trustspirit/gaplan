import type { UserRole } from '@/types'
import { ROLE } from '@/constants/roles'
import { ROUTES } from '@/router/routes'

export type SettingsTabId = 'system' | 'sharing' | 'account'

export interface SettingsTabDef {
  id: SettingsTabId
  /** URL의 `/settings/<slug>` 자리 */
  slug: string
  path: string
  labelKey: string
}

interface Entry extends SettingsTabDef {
  roles: UserRole[]
}

const ALL_ROLES: UserRole[] = [ROLE.ADMIN, ROLE.EXEC_SECRETARY, ROLE.SEVENTY, ROLE.PRESIDENT]
const ADMIN_EXEC: UserRole[] = [ROLE.ADMIN, ROLE.EXEC_SECRETARY]

// 배열 순서가 곧 내비 순서다. 스펙 §4.2: 시스템 · 공유 · 내 계정.
const ENTRIES: Entry[] = [
  {
    id: 'system',
    slug: 'system',
    path: ROUTES.settingsSystem,
    labelKey: 'settings.tab.system',
    roles: [ROLE.ADMIN],
  },
  {
    id: 'sharing',
    slug: 'sharing',
    path: ROUTES.settingsSharing,
    labelKey: 'settings.tab.sharing',
    roles: ADMIN_EXEC,
  },
  {
    id: 'account',
    slug: 'account',
    path: ROUTES.settingsAccount,
    labelKey: 'settings.tab.account',
    roles: ALL_ROLES,
  },
]

export function settingsTabsFor(role: UserRole): SettingsTabDef[] {
  return ENTRIES.filter((entry) => entry.roles.includes(role)).map(
    ({ id, slug, path, labelKey }) => ({ id, slug, path, labelKey }),
  )
}

/**
 * URL의 슬러그가 이 역할에게 보이는 화면인가. 역할에 없는 슬러그는 존재하지 않는
 * 슬러그와 똑같이 null이다 — `/plans`가 쓰는 규칙과 같다.
 */
export function settingsTabBySlug(role: UserRole, slug: string | undefined): SettingsTabDef | null {
  if (!slug) return null
  return settingsTabsFor(role).find((tab) => tab.slug === slug) ?? null
}
