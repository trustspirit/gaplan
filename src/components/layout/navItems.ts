import type { UserRole } from '@/types'
import { ROLE } from '@/constants/roles'

export type NavSection = 'main' | 'admin'

export interface NavItemDef {
  id: string
  to: string
  labelKey: string
  section: NavSection
  /** 이 항목에 붙일 배지의 출처. 없으면 배지 없음 */
  badge?: 'pendingTasks'
}

const ALL_ROLES: UserRole[] = [ROLE.ADMIN, ROLE.EXEC_SECRETARY, ROLE.SEVENTY, ROLE.PRESIDENT]
const ADMIN_STAFF: UserRole[] = [ROLE.ADMIN, ROLE.EXEC_SECRETARY, ROLE.SEVENTY]
const ADMIN_EXEC: UserRole[] = [ROLE.ADMIN, ROLE.EXEC_SECRETARY]

interface Entry extends NavItemDef {
  roles: UserRole[]
}

// 경로는 오늘의 값 그대로다. 일정/계획 통합과 리다이렉트는 계획 3에서 한다.
const ENTRIES: Entry[] = [
  { id: 'dashboard', to: '/dashboard', labelKey: 'nav.dashboard', section: 'main', roles: ALL_ROLES },
  { id: 'calendar', to: '/calendar', labelKey: 'nav.calendar', section: 'main', roles: ALL_ROLES },
  { id: 'schedules', to: '/schedules', labelKey: 'nav.schedules', section: 'main', roles: ALL_ROLES },
  {
    id: 'tasks',
    to: '/tasks',
    labelKey: 'nav.tasks',
    section: 'main',
    roles: [ROLE.PRESIDENT],
    badge: 'pendingTasks',
  },
  { id: 'taskProgress', to: '/admin/task-progress', labelKey: 'nav.taskProgress', section: 'admin', roles: ADMIN_STAFF },
  { id: 'stats', to: '/admin/stats', labelKey: 'nav.stats', section: 'admin', roles: ADMIN_STAFF },
  { id: 'visitPlans', to: '/admin/visit-plans', labelKey: 'nav.visitPlans', section: 'admin', roles: ADMIN_EXEC },
  { id: 'projects', to: '/admin/projects', labelKey: 'nav.projects', section: 'admin', roles: ADMIN_EXEC },
  { id: 'leaders', to: '/admin/leaders', labelKey: 'nav.leaders', section: 'admin', roles: [ROLE.ADMIN] },
  { id: 'admin', to: '/admin', labelKey: 'nav.admin', section: 'admin', roles: [ROLE.ADMIN] },
]

export function navItemsFor(role: UserRole): NavItemDef[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return ENTRIES.filter((e) => e.roles.includes(role)).map(({ roles, ...item }) => item)
}

export const MAX_MOBILE_TABS = 5

// 넘칠 때 마지막 칸은 '더보기' 버튼이 차지하므로 primary는 MAX-1개다.
export function splitMobileTabs(items: NavItemDef[]) {
  if (items.length <= MAX_MOBILE_TABS) return { primary: items, overflow: [] as NavItemDef[] }
  return {
    primary: items.slice(0, MAX_MOBILE_TABS - 1),
    overflow: items.slice(MAX_MOBILE_TABS - 1),
  }
}
