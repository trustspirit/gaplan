import { ROLE } from '@/constants/roles'
import { ROUTES } from '@/router/routes'
import { planTabsFor, planTabBySlug } from './planTabs'

describe('planTabsFor', () => {
  it('gives admin all three tabs in spec order', () => {
    expect(planTabsFor(ROLE.ADMIN).map((x) => x.id)).toEqual(['visitPlans', 'tasks', 'projects'])
  })

  it('gives the exec secretary the same three', () => {
    expect(planTabsFor(ROLE.EXEC_SECRETARY).map((x) => x.id)).toEqual([
      'visitPlans',
      'tasks',
      'projects',
    ])
  })

  // 스펙 §4.2 "칠십인은 Task 탭만 보인다(현재 권한과 동일)".
  it('gives the seventy only the task tab', () => {
    expect(planTabsFor(ROLE.SEVENTY).map((x) => x.id)).toEqual(['tasks'])
  })

  // 회장은 라우트 단계(RoleRoute)에서 이미 막히지만, 표가 회장에게 무언가를
  // 준다면 그건 표가 틀린 것이다.
  it('gives the president nothing', () => {
    expect(planTabsFor(ROLE.PRESIDENT)).toEqual([])
  })

  it('keeps each tab slug in step with its ROUTES path', () => {
    for (const tab of planTabsFor(ROLE.ADMIN)) {
      expect(tab.path, tab.id).toBe(`${ROUTES.plans}/${tab.slug}`)
    }
  })

  it('never repeats a slug', () => {
    const slugs = planTabsFor(ROLE.ADMIN).map((x) => x.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})

describe('planTabBySlug', () => {
  it('finds the tab a slug names', () => {
    expect(planTabBySlug(ROLE.ADMIN, 'projects')?.id).toBe('projects')
  })

  it('returns null when the slug is missing', () => {
    expect(planTabBySlug(ROLE.ADMIN, undefined)).toBeNull()
  })

  it('returns null for a slug that names nothing', () => {
    expect(planTabBySlug(ROLE.ADMIN, 'nope')).toBeNull()
  })

  // 칠십인이 /plans/projects 를 손으로 쳐 넣는 경우. 화면은 이 null을 보고
  // 자기 첫 탭으로 돌려보낸다 — 권한 없는 패널을 렌더하지 않는다.
  it('returns null for a real tab the role cannot see', () => {
    expect(planTabBySlug(ROLE.SEVENTY, 'projects')).toBeNull()
    expect(planTabBySlug(ROLE.SEVENTY, 'tasks')?.id).toBe('tasks')
  })
})
