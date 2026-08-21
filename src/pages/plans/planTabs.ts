import type { UserRole } from '@/types'
import { ROLE } from '@/constants/roles'
import { ROUTES } from '@/router/routes'

export type PlanTabId = 'visitPlans' | 'tasks' | 'projects'

export interface PlanTabDef {
  id: PlanTabId
  /** URL의 `/plans/<slug>` 자리 */
  slug: string
  path: string
  labelKey: string
}

interface Entry extends PlanTabDef {
  roles: UserRole[]
}

const ADMIN_EXEC: UserRole[] = [ROLE.ADMIN, ROLE.EXEC_SECRETARY]
const ADMIN_EXEC_SEVENTY: UserRole[] = [ROLE.ADMIN, ROLE.EXEC_SECRETARY, ROLE.SEVENTY]

// 배열 순서가 곧 탭 순서다. 스펙 §4.2: 방문 계획 · Task · 프로젝트.
const ENTRIES: Entry[] = [
  {
    id: 'visitPlans',
    slug: 'visit-plans',
    path: ROUTES.planVisits,
    labelKey: 'plans.tab.visitPlans',
    roles: ADMIN_EXEC,
  },
  {
    id: 'tasks',
    slug: 'tasks',
    path: ROUTES.planTasks,
    labelKey: 'plans.tab.tasks',
    roles: ADMIN_EXEC_SEVENTY,
  },
  {
    id: 'projects',
    slug: 'projects',
    path: ROUTES.planProjects,
    labelKey: 'plans.tab.projects',
    roles: ADMIN_EXEC,
  },
]

export function planTabsFor(role: UserRole): PlanTabDef[] {
  return ENTRIES.filter((entry) => entry.roles.includes(role)).map(
    ({ id, slug, path, labelKey }) => ({ id, slug, path, labelKey }),
  )
}

/**
 * URL의 슬러그가 이 역할에게 보이는 탭인가. 역할에 없는 탭이면 존재하지 않는
 * 슬러그와 똑같이 null이다 — 화면은 둘을 구분할 필요가 없고, 구분하면
 * "당신에게는 없는 탭입니다"라는 화면을 하나 더 만들게 된다.
 */
export function planTabBySlug(role: UserRole, slug: string | undefined): PlanTabDef | null {
  if (!slug) return null
  return planTabsFor(role).find((tab) => tab.slug === slug) ?? null
}
