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
  tasks: '/admin/tasks',
  taskProgress: '/admin/task-progress',
  stats: '/admin/stats',
  visitPlans: '/admin/visit-plans',
  visitPlanner: '/admin/visit-planner',
  projects: '/admin/projects',
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
}
