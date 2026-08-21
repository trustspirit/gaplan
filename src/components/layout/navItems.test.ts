import {
  navItemsFor,
  navItemIsExact,
  navItemMatches,
  splitMobileTabs,
  MAX_MOBILE_TABS,
  type NavItemDef,
  type NavItemId,
} from './navItems'
import { ROLE } from '@/constants/roles'

const ADMIN_ITEMS = navItemsFor(ROLE.ADMIN)
function item(id: NavItemId): NavItemDef {
  const found = ADMIN_ITEMS.find((i) => i.id === id)
  if (!found) throw new Error(`no nav item ${id}`)
  return found
}

describe('navItemsFor', () => {
  it('gives a president only the screens they can reach', () => {
    const ids = navItemsFor(ROLE.PRESIDENT).map((i) => i.id)
    expect(ids).toEqual(['home', 'schedules'])
  })

  it('gives a seventy the read-only management screens but no settings', () => {
    const ids = navItemsFor(ROLE.SEVENTY).map((i) => i.id)
    expect(ids).toContain('plans')
    expect(ids).toContain('stats')
    expect(ids).not.toContain('admin')
    expect(ids).not.toContain('leaders')
  })

  it('gives an exec secretary the planning screens but not user administration', () => {
    const ids = navItemsFor(ROLE.EXEC_SECRETARY).map((i) => i.id)
    expect(ids).toContain('plans')
    expect(ids).not.toContain('admin')
  })

  it('gives an admin everything', () => {
    const ids = navItemsFor(ROLE.ADMIN).map((i) => i.id)
    expect(ids).toContain('admin')
    expect(ids).toContain('leaders')
    expect(ids).toContain('plans')
  })

  it('gives a pending user nothing', () => {
    expect(navItemsFor(ROLE.PENDING)).toEqual([])
  })

  // 섹션 라벨을 그리려면 main이 admin보다 먼저 와야 한다
  it('orders main-section items before admin-section items', () => {
    const items = navItemsFor(ROLE.ADMIN)
    const lastMain = items.map((i) => i.section).lastIndexOf('main')
    const firstAdmin = items.map((i) => i.section).indexOf('admin')
    expect(lastMain).toBeLessThan(firstAdmin)
  })

  it('marks the president home screen with the pending badge', () => {
    const items = navItemsFor(ROLE.PRESIDENT)
    const badged = items.filter((i) => i.badge)
    expect(badged.map((i) => i.id)).toEqual(['home'])
    expect(items[0]).not.toHaveProperty('roles')
  })

  // 홈은 전 역할이 갖는 항목이다. 배지를 조건 없이 붙이면 usePendingTaskCount가
  // 배지를 그릴 곳이 없는 역할에도 Firestore 구독을 연다.
  it('gives no role but the president a pending badge', () => {
    for (const role of [ROLE.ADMIN, ROLE.EXEC_SECRETARY, ROLE.SEVENTY]) {
      expect(
        navItemsFor(role).some((i) => i.badge),
        role,
      ).toBe(false)
    }
  })

  it('no longer offers a separate task screen', () => {
    for (const role of [ROLE.PRESIDENT, ROLE.ADMIN, ROLE.EXEC_SECRETARY, ROLE.SEVENTY]) {
      expect(
        navItemsFor(role).map((i) => i.id),
        role,
      ).not.toContain('tasks')
    }
  })

  it('no longer offers a separate calendar screen', () => {
    for (const role of [ROLE.PRESIDENT, ROLE.ADMIN, ROLE.EXEC_SECRETARY, ROLE.SEVENTY]) {
      expect(
        navItemsFor(role).map((i) => i.id),
        role,
      ).not.toContain('calendar')
    }
  })

  // 경로가 바뀌면 이 테스트가 의도적으로 깨진다 — 리다이렉트를 같이 넣었는지
  // 확인하고 갱신하라는 신호다.
  it('keeps every route path in step with ROUTES', () => {
    const byId = Object.fromEntries(navItemsFor(ROLE.ADMIN).map((i) => [i.id, i.to]))
    expect(byId).toEqual({
      home: '/home',
      schedules: '/schedules',
      plans: '/plans',
      stats: '/stats',
      leaders: '/admin/leaders',
      admin: '/admin',
    })
  })

  it('no longer offers the three separate plan screens', () => {
    for (const role of [ROLE.PRESIDENT, ROLE.ADMIN, ROLE.EXEC_SECRETARY, ROLE.SEVENTY]) {
      const ids = navItemsFor(role).map((i) => i.id)
      expect(ids, role).not.toContain('taskProgress')
      expect(ids, role).not.toContain('visitPlans')
      expect(ids, role).not.toContain('projects')
    }
  })

  // 스펙 §4.2의 표는 관리자·집행서기를 함께 6개(홈·일정·계획·통계·주소록·설정)로
  // 묶지만, 현재 구현은 두 항목이 [ROLE.ADMIN] 전용이라 집행서기는 4개에 그친다.
  // 주소록은 판정 R36으로 미뤘고, 설정은 이후 계획의 설정 개편에서 다룬다.
  it('gives each role the item count this build currently supports', () => {
    expect(navItemsFor(ROLE.PRESIDENT)).toHaveLength(2)
    expect(navItemsFor(ROLE.SEVENTY)).toHaveLength(4)
    expect(navItemsFor(ROLE.EXEC_SECRETARY)).toHaveLength(4)
    expect(navItemsFor(ROLE.ADMIN)).toHaveLength(6)
  })
})

describe('splitMobileTabs', () => {
  it('shows every item directly when they fit', () => {
    const items = navItemsFor(ROLE.PRESIDENT)
    expect(items.length).toBeLessThanOrEqual(MAX_MOBILE_TABS)
    const { primary, overflow } = splitMobileTabs(items)
    expect(primary).toHaveLength(items.length)
    expect(overflow).toHaveLength(0)
  })

  // 항목이 넘칠 때 primary는 MAX-1개만 — 마지막 칸은 '더보기' 버튼이 쓴다
  it('reserves the last tab slot for the more button when items overflow', () => {
    const items = navItemsFor(ROLE.ADMIN)
    expect(items.length).toBeGreaterThan(MAX_MOBILE_TABS)
    const { primary, overflow } = splitMobileTabs(items)
    expect(primary).toHaveLength(MAX_MOBILE_TABS - 1)
    expect(primary.concat(overflow)).toEqual(items)
  })

  it('shows all items at the exact boundary of MAX_MOBILE_TABS', () => {
    // 역할별 항목 수는 IA가 바뀔 때마다 움직인다. 경계 자체를 고정하려는
    // 테스트이므로 딱 MAX개짜리 목록을 직접 만든다.
    const items: NavItemDef[] = Array.from({ length: MAX_MOBILE_TABS }, (_, i) => ({
      id: `x${i}` as NavItemId,
      to: `/x${i}`,
      labelKey: 'x',
      section: 'main',
    }))
    const { primary, overflow } = splitMobileTabs(items)
    expect(primary).toHaveLength(MAX_MOBILE_TABS)
    expect(overflow).toHaveLength(0)
  })
})

describe('navItemIsExact', () => {
  it('is true for an item that is the parent path of another item', () => {
    expect(navItemIsExact(ADMIN_ITEMS, item('admin'))).toBe(true)
  })

  it('is false for an item nothing else nests under', () => {
    expect(navItemIsExact(ADMIN_ITEMS, item('stats'))).toBe(false)
    expect(navItemIsExact(ADMIN_ITEMS, item('home'))).toBe(false)
  })

  // 모바일 탭바는 목록을 primary/overflow로 쪼갠다. 한쪽만 넘기면 같은 항목이
  // 어느 쪽에 담겼는지에 따라 답이 달라지므로, 호출부는 항상 전체 목록을 넘겨야 한다.
  it('depends on the whole list — a slice can give the wrong answer', () => {
    expect(navItemIsExact([item('admin')], item('admin'))).toBe(false)
    expect(navItemIsExact(ADMIN_ITEMS, item('admin'))).toBe(true)
  })
})

describe('navItemMatches', () => {
  it('matches a leaf item on its own path and on its child paths', () => {
    expect(navItemMatches(ADMIN_ITEMS, item('stats'), '/stats')).toBe(true)
    expect(navItemMatches(ADMIN_ITEMS, item('stats'), '/stats/2026')).toBe(true)
  })

  it('does not match a path that merely shares a prefix', () => {
    expect(navItemMatches(ADMIN_ITEMS, item('stats'), '/statsx')).toBe(false)
  })

  it('matches a parent item only on its exact path', () => {
    expect(navItemMatches(ADMIN_ITEMS, item('admin'), '/admin')).toBe(true)
    expect(navItemMatches(ADMIN_ITEMS, item('admin'), '/admin/users')).toBe(false)
  })
})
