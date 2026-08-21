import type { UserRole } from '@/types'
import { ROLE } from '@/constants/roles'
import { ROUTES } from '@/router/routes'

export type NavSection = 'main' | 'admin'

// NAV_ICONS(navIcons.tsx)가 이 유니언으로 Record를 채워야 하므로, 항목을 추가하고
// 아이콘을 빼먹으면 tsc가 잡아낸다 — id: string이었을 때는 그냥 빈칸으로 렌더됐다.
export type NavItemId =
  | 'home'
  | 'schedules'
  | 'plans'
  | 'stats'
  | 'leaders'
  | 'settings'
  | 'account'

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
  /** 배지를 실제로 보는 역할. 생략하면 roles 전원. */
  badgeRoles?: UserRole[]
}

// 경로는 오늘의 값 그대로다. 일정/계획 통합과 리다이렉트는 계획 3에서 한다.
const ENTRIES: Entry[] = [
  {
    id: 'home',
    to: ROUTES.home,
    labelKey: 'nav.home',
    section: 'main',
    roles: ALL_ROLES,
    badge: 'pendingTasks',
    badgeRoles: [ROLE.PRESIDENT],
  },
  {
    id: 'schedules',
    to: ROUTES.schedules,
    labelKey: 'nav.schedules',
    section: 'main',
    roles: ALL_ROLES,
  },
  {
    id: 'plans',
    to: ROUTES.plans,
    labelKey: 'nav.plans',
    section: 'admin',
    roles: ADMIN_STAFF,
  },
  { id: 'stats', to: ROUTES.stats, labelKey: 'nav.stats', section: 'admin', roles: ADMIN_STAFF },
  {
    id: 'leaders',
    to: ROUTES.leaders,
    labelKey: 'nav.leaders',
    section: 'admin',
    roles: ADMIN_STAFF,
  },
  {
    id: 'settings',
    to: ROUTES.settings,
    labelKey: 'nav.settings',
    section: 'admin',
    roles: ADMIN_EXEC,
  },
  // 판정 R47 — 회장·칠십인은 자기 계정 하나만 볼 수 있으므로, 「설정」이라는
  // 이름으로 보내면 눌렀을 때 갈 곳이 하나뿐인 섹션에 도착한다. 곧장 계정으로 보낸다.
  {
    id: 'account',
    to: ROUTES.settingsAccount,
    labelKey: 'nav.account',
    section: 'admin',
    roles: [ROLE.SEVENTY, ROLE.PRESIDENT],
  },
]

export function navItemsFor(role: UserRole): NavItemDef[] {
  return ENTRIES.filter((entry) => entry.roles.includes(role)).map((entry) => {
    const item: NavItemDef = {
      id: entry.id,
      to: entry.to,
      labelKey: entry.labelKey,
      section: entry.section,
    }
    // 배지는 그것을 실제로 보는 역할에만 붙인다. usePendingTaskCount가 이 필드를
    // 보고 구독 여부를 정하므로, 전원에게 붙이면 배지가 늘 0인 역할에도 구독이 열린다.
    if (entry.badge && (entry.badgeRoles ?? entry.roles).includes(role)) {
      item.badge = entry.badge
    }
    return item
  })
}

/**
 * 다른 항목의 부모 경로인가 — 그렇다면 정확 매칭해야 자식 화면에서 같이 켜지지 않는다.
 * (한 항목이 다른 항목의 경로를 접두사로 가지면, 접두사 매칭으로는 자식 화면에서
 * 둘 다 활성이 된다.)
 *
 * 통계·주소록이 /admin/ 밖으로 나간 뒤로 실제 네비 목록에는 그런 짝이 하나도
 * 없어 늘 false다(판정 R46). 설정 하위 내비가 생기면 다시 살아난다.
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
