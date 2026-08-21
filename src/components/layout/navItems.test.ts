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
    expect(ids).toEqual(['dashboard', 'calendar', 'schedules', 'tasks'])
  })

  it('gives a seventy the read-only management screens but no settings', () => {
    const ids = navItemsFor(ROLE.SEVENTY).map((i) => i.id)
    expect(ids).toContain('taskProgress')
    expect(ids).toContain('stats')
    expect(ids).not.toContain('admin')
    expect(ids).not.toContain('leaders')
  })

  it('gives an exec secretary the planning screens but not user administration', () => {
    const ids = navItemsFor(ROLE.EXEC_SECRETARY).map((i) => i.id)
    expect(ids).toContain('visitPlans')
    expect(ids).toContain('projects')
    expect(ids).not.toContain('admin')
  })

  it('gives an admin everything', () => {
    const ids = navItemsFor(ROLE.ADMIN).map((i) => i.id)
    expect(ids).toContain('admin')
    expect(ids).toContain('leaders')
    expect(ids).toContain('visitPlans')
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

  it('marks only the president task screen with the pending badge', () => {
    const items = navItemsFor(ROLE.PRESIDENT)
    const badged = items.filter((i) => i.badge)
    expect(badged.map((i) => i.id)).toEqual(['tasks'])
    expect(items[0]).not.toHaveProperty('roles')
  })

  // 경로는 이 계획에서 바꾸지 않는다 — 통합은 계획 3
  it('keeps every route path as it is today', () => {
    const byId = Object.fromEntries(navItemsFor(ROLE.ADMIN).map((i) => [i.id, i.to]))
    expect(byId).toEqual({
      dashboard: '/dashboard',
      calendar: '/calendar',
      schedules: '/schedules',
      taskProgress: '/admin/task-progress',
      stats: '/admin/stats',
      visitPlans: '/admin/visit-plans',
      projects: '/admin/projects',
      leaders: '/admin/leaders',
      admin: '/admin',
    })
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
    const items = navItemsFor(ROLE.SEVENTY)
    expect(items.length).toBe(MAX_MOBILE_TABS)
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
    expect(navItemIsExact(ADMIN_ITEMS, item('dashboard'))).toBe(false)
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
    expect(navItemMatches(ADMIN_ITEMS, item('stats'), '/admin/stats')).toBe(true)
    expect(navItemMatches(ADMIN_ITEMS, item('stats'), '/admin/stats/2026')).toBe(true)
  })

  it('does not match a path that merely shares a prefix', () => {
    expect(navItemMatches(ADMIN_ITEMS, item('stats'), '/admin/statsx')).toBe(false)
  })

  it('matches a parent item only on its exact path', () => {
    expect(navItemMatches(ADMIN_ITEMS, item('admin'), '/admin')).toBe(true)
    expect(navItemMatches(ADMIN_ITEMS, item('admin'), '/admin/task-progress')).toBe(false)
  })
})
