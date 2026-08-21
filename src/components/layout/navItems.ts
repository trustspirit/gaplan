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
//
// 순서가 곧 모바일 하단 탭의 primary/overflow 경계다(splitMobileTabs). 데스크톱
// 사이드바(SidebarNav)는 section으로 다시 나눠 그리므로 순서에 영향받지 않지만,
// MobileTabs는 이 배열 순서를 그대로 슬라이스한다.
//
// account는 이제 회장에게만 있다(최종 리뷰 fix round 2). 판정 R48은 칠십인에게도
// account를 줬다 — "카카오 연동이 내 계정에만 있으니 칠십인도 거기 가야 한다"는
// 근거였는데, 그 근거가 두 번 무너졌다: (1) 이 화면 개편 전에는 카카오 카드가
// `/admin/calendar`(RoleRoute allow=['admin'])에 있었으므로 칠십인은 원래도 거기
// 못 갔다. (2) FIX 1(같은 최종 리뷰 1라운드)이 카카오 카드를 assignedSeventyUid
// 있는 사용자로 한정했는데, 그 필드는 칠십인 자신에게는 없다 — 지금 칠십인의 내
// 계정에는 카카오 카드 자체가 없다. 남는 건 이름·언어·구글 캘린더뿐이고 스펙
// §4.2는 그 셋에 칠십인용 nav 자리를 준 적이 없다. 표가 원래 요구하던 5개
// (홈·일정·계획·통계·주소록)로 돌아가면 MAX_MOBILE_TABS(5)에 정확히 맞아
// overflow 자체가 없어진다 — §4.6이 금지한 통계·주소록 매몰 문제가 근본적으로
// 사라진다. 회장은 유지한다 — 스펙 §4.2가 회장의 세 탭을 홈·일정·계정으로
// 못박았다.
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
  // 판정 R47 — 회장은 설정 화면 자체를 볼 수 없으니(스펙 §4.2), 계정 항목이
  // section: 'admin'이면 항목 하나짜리 '관리' 그룹 헤딩이 뜬다. main으로 두어
  // 홈·일정과 나란한 평범한 탭이 되게 한다. SidebarNav는 main/admin을 다시
  // 나눠서 그리므로 배열 안에서 admin 항목들보다 뒤에 있어도 데스크톱에는 영향이
  // 없다(main이 먼저, admin 그룹이 나중) — 영향받는 것은 모바일 탭바뿐이다.
  {
    id: 'account',
    to: ROUTES.settingsAccount,
    labelKey: 'nav.account',
    section: 'main',
    roles: [ROLE.PRESIDENT],
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
