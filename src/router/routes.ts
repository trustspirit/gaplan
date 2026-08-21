/**
 * 인증 뒤 화면의 경로. 문자열은 여기에만 적는다.
 *
 * 공개 링크(`/public/schedule/:token`, `/respond/:taskId`)와 인증 화면은 일부러
 * 빠져 있다 — 그 경로들은 바깥에 공유돼 있어서 옮길 수 없고, 여기 넣으면
 * "옮길 수 있는 것"과 섞인다.
 */
export const ROUTES = {
  home: '/home',
  schedules: '/schedules',
  plans: '/plans',
  planVisits: '/plans/visit-plans',
  planTasks: '/plans/tasks',
  planProjects: '/plans/projects',
  stats: '/stats',
  leaders: '/admin/leaders',
  users: '/admin/users',
  availability: '/admin/availability',
  calendarSettings: '/admin/calendar',
  admin: '/admin',
} as const

/**
 * 옛 경로 → 새 경로. 화면이 옮겨갈 때마다 여기에 한 줄을 더한다.
 * Router가 이 표를 그대로 <Route>로 펼치므로, 리다이렉트를 넣는 곳과 테스트가
 * 읽는 곳이 같다 — 표에 없는 리다이렉트는 존재할 수 없다.
 *
 * 목적지는 반드시 ROUTES의 값이어야 한다(routes.test.ts가 강제). 리다이렉트가
 * 또 다른 리다이렉트를 가리키면 한 번에 못 가므로 그것도 막는다.
 */
export const LEGACY_REDIRECTS: Record<string, string> = {
  '/dashboard': ROUTES.home,
  // 회장 전용 Task 화면은 홈이 흡수했다(스펙 §4.2).
  '/tasks': ROUTES.home,
  // 캘린더와 일정은 한 화면이 됐다(스펙 §4.2). 옛 탭 경로도 같이 받는다 —
  // 사람들이 /schedules/visits 를 북마크해 뒀다.
  '/calendar': ROUTES.schedules,
  '/schedules/visits': ROUTES.schedules,
  '/schedules/interviews': ROUTES.schedules,
  '/schedules/events': ROUTES.schedules,
  '/visits': ROUTES.schedules,
  '/interviews': ROUTES.schedules,
  '/general-schedules': ROUTES.schedules,
  // 방문 계획 · Task 생성 · Task 현황 · 프로젝트가 /plans의 탭이 됐다(스펙 §4.2).
  '/admin/visit-plans': ROUTES.planVisits,
  '/admin/projects': ROUTES.planProjects,
  '/admin/tasks': ROUTES.planTasks,
  '/admin/task-progress': ROUTES.planTasks,
  // 방문 Task 생성 화면은 Task 생성의 「방문」 종류와 완전히 같은 일을 했다(판정 R30).
  '/admin/visit-planner': ROUTES.planTasks,
  // 통계는 칠십인도 보는 화면이라 /admin/ 밖으로 나왔다(판정 R45).
  '/admin/stats': ROUTES.stats,
}

/**
 * 파라미터가 있는 경로. ROUTES는 값을 그대로 `<Route path>`와 `navigate()`에
 * 넘길 수 있는 완성된 경로만 담으므로, `:planId`가 든 패턴은 따로 둔다.
 */
export const PLAN_VISIT_DETAIL = `${ROUTES.planVisits}/:planId`
export const PLAN_PROJECT_DETAIL = `${ROUTES.planProjects}/:projectId`

export const planVisitDetailPath = (planId: string) => `${ROUTES.planVisits}/${planId}`
export const planProjectDetailPath = (projectId: string) => `${ROUTES.planProjects}/${projectId}`

/**
 * 파라미터가 있는 옛 경로 → 새 경로. `LEGACY_REDIRECTS`와 섞지 않는 이유는
 * 무결성 규칙이 다르기 때문이다 — 문자열 표는 "목적지가 ROUTES에 있는가"를,
 * 이 표는 "양쪽 파라미터 이름이 같은가"를 지켜야 한다. `LegacyParamRedirect`가
 * generatePath로 값을 옮기므로 이름이 어긋나면 런타임에 터진다.
 */
export const LEGACY_PARAM_REDIRECTS: { from: string; to: string }[] = [
  { from: '/admin/visit-plans/:planId', to: PLAN_VISIT_DETAIL },
  { from: '/admin/projects/:projectId', to: PLAN_PROJECT_DETAIL },
]
