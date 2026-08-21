import type { UserRole } from '@/types'
import { ROLE } from '@/constants/roles'
import { ROUTES } from '@/router/routes'

export type NavSection = 'main' | 'admin'

// NAV_ICONS(navIcons.tsx)가 이 유니언으로 Record를 채워야 하므로, 항목을 추가하고
// 아이콘을 빼먹으면 tsc가 잡아낸다 — id: string이었을 때는 그냥 빈칸으로 렌더됐다.
export type NavItemId =
  | 'home'
  | 'calendar'
  | 'schedules'
  | 'tasks'
  | 'taskProgress'
  | 'stats'
  | 'visitPlans'
  | 'projects'
  | 'leaders'
  | 'admin'

export interface NavItemDef {
  id: NavItemId
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
  {
    id: 'home',
    to: ROUTES.home,
    labelKey: 'nav.home',
    section: 'main',
    roles: ALL_ROLES,
  },
  { id: 'calendar', to: '/calendar', labelKey: 'nav.calendar', section: 'main', roles: ALL_ROLES },
  {
    id: 'schedules',
    to: ROUTES.schedules,
    labelKey: 'nav.schedules',
    section: 'main',
    roles: ALL_ROLES,
  },
  {
    id: 'tasks',
    to: '/tasks',
    labelKey: 'nav.tasks',
    section: 'main',
    roles: [ROLE.PRESIDENT],
    badge: 'pendingTasks',
  },
  {
    id: 'taskProgress',
    to: ROUTES.taskProgress,
    labelKey: 'nav.taskProgress',
    section: 'admin',
    roles: ADMIN_STAFF,
  },
  { id: 'stats', to: ROUTES.stats, labelKey: 'nav.stats', section: 'admin', roles: ADMIN_STAFF },
  {
    id: 'visitPlans',
    to: ROUTES.visitPlans,
    labelKey: 'nav.visitPlans',
    section: 'admin',
    roles: ADMIN_EXEC,
  },
  {
    id: 'projects',
    to: ROUTES.projects,
    labelKey: 'nav.projects',
    section: 'admin',
    roles: ADMIN_EXEC,
  },
  {
    id: 'leaders',
    to: ROUTES.leaders,
    labelKey: 'nav.leaders',
    section: 'admin',
    roles: [ROLE.ADMIN],
  },
  { id: 'admin', to: ROUTES.admin, labelKey: 'nav.admin', section: 'admin', roles: [ROLE.ADMIN] },
]

export function navItemsFor(role: UserRole): NavItemDef[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return ENTRIES.filter((e) => e.roles.includes(role)).map(({ roles, ...item }) => item)
}

/**
 * 다른 항목의 부모 경로인가 — 그렇다면 정확 매칭해야 자식 화면에서 같이 켜지지 않는다.
 * (예: admin은 '/admin', taskProgress는 '/admin/task-progress' — 접두사 매칭이면
 * /admin/task-progress 에서 둘 다 활성이 된다.)
 *
 * `items`에는 반드시 그 역할의 **전체** 항목 목록을 넘긴다. 모바일 탭바처럼 목록을
 * primary/overflow로 쪼갠 뒤 한쪽만 넘기면, 같은 항목이 어느 쪽에 담겼는지에 따라
 * 답이 달라진다.
 */
export function navItemIsExact(items: NavItemDef[], item: NavItemDef): boolean {
  return items.some((o) => o.id !== item.id && o.to.startsWith(item.to + '/'))
}

/** 지금 경로가 이 항목을 가리키는가. NavLink의 `end` 규칙과 같은 판정을 코드로 쓴다. */
export function navItemMatches(items: NavItemDef[], item: NavItemDef, pathname: string): boolean {
  return navItemIsExact(items, item)
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(item.to + '/')
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
