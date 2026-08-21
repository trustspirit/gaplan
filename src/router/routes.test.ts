import {
  ROUTES,
  LEGACY_REDIRECTS,
  LEGACY_PARAM_REDIRECTS,
  PLAN_VISIT_DETAIL,
  PLAN_PROJECT_DETAIL,
  planVisitDetailPath,
  planProjectDetailPath,
} from './routes'

describe('ROUTES', () => {
  it('names the landing route home, not dashboard', () => {
    expect(ROUTES.home).toBe('/home')
  })

  it('keeps the stats screen out of the admin namespace', () => {
    // 칠십인이 보는 화면이라 /admin/ 접두사가 어긋난다(판정 R45).
    expect(ROUTES.stats).toBe('/stats')
  })

  it('keeps the leaders directory out of the admin namespace', () => {
    // 칠십인도 보는 화면이 됐다(판정 R43·R45).
    expect(ROUTES.leaders).toBe('/leaders')
  })

  it('never repeats a path under two names', () => {
    const paths = Object.values(ROUTES)
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe('LEGACY_REDIRECTS', () => {
  // 라우터는 한 번만 튕긴다. A→B→C가 있으면 A로 들어온 사람은 B에서 멈춘다.
  it('never points at a path that is itself redirected', () => {
    for (const [from, to] of Object.entries(LEGACY_REDIRECTS)) {
      expect(LEGACY_REDIRECTS[to], `${from} -> ${to} -> …`).toBeUndefined()
    }
  })

  it('only sends people to a path the app actually serves', () => {
    const served = new Set<string>(Object.values(ROUTES))
    for (const to of Object.values(LEGACY_REDIRECTS)) {
      expect(served, `redirect target ${to}`).toContain(to)
    }
  })

  it('keeps the old landing path working', () => {
    expect(LEGACY_REDIRECTS['/dashboard']).toBe(ROUTES.home)
  })

  it('keeps the old stats path working', () => {
    expect(LEGACY_REDIRECTS['/admin/stats']).toBe(ROUTES.stats)
  })

  it('keeps the old leaders path working', () => {
    expect(LEGACY_REDIRECTS['/admin/leaders']).toBe(ROUTES.leaders)
  })

  it('keeps the retired president task screen working', () => {
    expect(LEGACY_REDIRECTS['/tasks']).toBe(ROUTES.home)
  })

  it('keeps every retired schedule path working', () => {
    for (const old of [
      '/calendar',
      '/schedules/visits',
      '/schedules/interviews',
      '/schedules/events',
      '/visits',
      '/interviews',
      '/general-schedules',
    ]) {
      expect(LEGACY_REDIRECTS[old], old).toBe(ROUTES.schedules)
    }
  })

  it('keeps every retired plan path working', () => {
    expect(LEGACY_REDIRECTS['/admin/visit-plans']).toBe(ROUTES.planVisits)
    expect(LEGACY_REDIRECTS['/admin/projects']).toBe(ROUTES.planProjects)
    // Task 생성·현황·방문 Task 생성 세 화면이 한 탭이 됐다.
    expect(LEGACY_REDIRECTS['/admin/tasks']).toBe(ROUTES.planTasks)
    expect(LEGACY_REDIRECTS['/admin/task-progress']).toBe(ROUTES.planTasks)
    expect(LEGACY_REDIRECTS['/admin/visit-planner']).toBe(ROUTES.planTasks)
  })

  it('no longer names the retired plan screens in ROUTES', () => {
    for (const gone of ['tasks', 'taskProgress', 'visitPlans', 'visitPlanner', 'projects']) {
      expect(Object.keys(ROUTES), gone).not.toContain(gone)
    }
  })
})

describe('plan routes', () => {
  it('puts every plan tab under the plans root', () => {
    for (const path of [ROUTES.planVisits, ROUTES.planTasks, ROUTES.planProjects]) {
      expect(path.startsWith(ROUTES.plans + '/'), path).toBe(true)
    }
  })

  it('builds detail paths that match their own patterns', () => {
    expect(planVisitDetailPath('p1')).toBe('/plans/visit-plans/p1')
    expect(planProjectDetailPath('j1')).toBe('/plans/projects/j1')
    expect(PLAN_VISIT_DETAIL).toBe('/plans/visit-plans/:planId')
    expect(PLAN_PROJECT_DETAIL).toBe('/plans/projects/:projectId')
  })
})

describe('LEGACY_PARAM_REDIRECTS', () => {
  // generatePath(to, params)가 from에서 뽑은 params를 그대로 먹는다. 이름이
  // 어긋나면 런타임에 "Missing :xxx param" 으로 터진다 — 여기서 잡는다.
  it('uses the same param names on both sides', () => {
    const names = (pattern: string) => (pattern.match(/:[A-Za-z0-9_]+/g) ?? []).sort()
    for (const { from, to } of LEGACY_PARAM_REDIRECTS) {
      expect(names(to), `${from} -> ${to}`).toEqual(names(from))
    }
  })

  it('always carries at least one param', () => {
    // 파라미터가 없으면 LEGACY_REDIRECTS에 있어야 할 항목이다.
    for (const { from } of LEGACY_PARAM_REDIRECTS) {
      expect(from, from).toContain(':')
    }
  })

  it('never overlaps the string redirect table', () => {
    for (const { from } of LEGACY_PARAM_REDIRECTS) {
      expect(LEGACY_REDIRECTS[from], from).toBeUndefined()
    }
  })

  it('keeps both retired detail screens reachable', () => {
    const byFrom = Object.fromEntries(LEGACY_PARAM_REDIRECTS.map((r) => [r.from, r.to]))
    expect(byFrom['/admin/visit-plans/:planId']).toBe(PLAN_VISIT_DETAIL)
    expect(byFrom['/admin/projects/:projectId']).toBe(PLAN_PROJECT_DETAIL)
  })
})
