import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { ProtectedRoute } from './ProtectedRoute'
import RespondPage from '@/pages/respond/RespondPage'
import PublicSchedulePage from '@/pages/public/PublicSchedulePage'
import { RoleRoute } from './RoleRoute'
import { Spinner } from '@/components/ui'
import { AppShell, TopBar, ShellLayout } from '@/components/layout'
import { authUserAtom } from '@/store/authAtom'
import styles from './Router.module.scss'

// Outer Suspense fallback — only reached by lazy routes outside ShellLayout
// (login/onboarding/pending); shell pages suspend inside ShellLayout instead.
function ShellFallback() {
  const currentUser = useAtomValue(authUserAtom)
  if (!currentUser)
    return (
      <div className={styles.loadingScreen}>
        <Spinner />
      </div>
    )
  return (
    <AppShell
      role={currentUser.role}
      name={currentUser.name}
      topBar={<TopBar name={currentUser.name} />}
    >
      <div className={styles.loadingContent}>
        <Spinner />
      </div>
    </AppShell>
  )
}

// After a deploy, tabs opened on the previous version hold an index.html that
// references chunk hashes no longer on hosting — the dynamic import rejects.
// Reload once (per session, rate-limited) to pick up the new index.html.
const CHUNK_RELOAD_KEY = 'chunk-reload-at'
function lazyRetry(factory: () => Promise<{ default: ComponentType }>) {
  return lazy(() =>
    factory().catch((err) => {
      const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0)
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
        window.location.reload()
        return new Promise<{ default: ComponentType }>(() => {})
      }
      throw err
    }),
  )
}

// Token-based public pages (RespondPage, PublicSchedulePage) stay in the main
// bundle so shared links open without a second chunk fetch; everything behind
// auth is lazy-loaded to keep that bundle small.
const LoginPage = lazyRetry(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const OnboardingPage = lazyRetry(() =>
  import('@/pages/auth/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const PendingPage = lazyRetry(() =>
  import('@/pages/auth/PendingPage').then((m) => ({ default: m.PendingPage })),
)
const DashboardPage = lazyRetry(() =>
  import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const CalendarPage = lazyRetry(() =>
  import('@/pages/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
)
const SchedulesPage = lazyRetry(() =>
  import('@/pages/schedules/SchedulesPage').then((m) => ({ default: m.SchedulesPage })),
)
const TasksPage = lazyRetry(() =>
  import('@/pages/tasks/TasksPage').then((m) => ({ default: m.TasksPage })),
)
const AdminDashboard = lazyRetry(() =>
  import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
)
const UserManagement = lazyRetry(() =>
  import('@/pages/admin/UserManagement').then((m) => ({ default: m.UserManagement })),
)
const TaskCreation = lazyRetry(() =>
  import('@/pages/admin/RegionSettings').then((m) => ({ default: m.TaskCreation })),
)
const TaskProgress = lazyRetry(() =>
  import('@/pages/admin/TaskProgress').then((m) => ({ default: m.TaskProgress })),
)
const StatsPage = lazyRetry(() =>
  import('@/pages/admin/StatsPage').then((m) => ({ default: m.StatsPage })),
)
const AvailabilitySettings = lazyRetry(() =>
  import('@/pages/admin/AvailabilitySettings').then((m) => ({ default: m.AvailabilitySettings })),
)
const CalendarSettings = lazyRetry(() =>
  import('@/pages/admin/CalendarSettings').then((m) => ({ default: m.CalendarSettings })),
)
const VisitPlanner = lazyRetry(() =>
  import('@/pages/admin/VisitPlanner').then((m) => ({ default: m.VisitPlanner })),
)
const VisitPlanListPage = lazyRetry(() =>
  import('@/pages/admin/VisitPlanListPage').then((m) => ({ default: m.VisitPlanListPage })),
)
const VisitPlanBoardPage = lazyRetry(() =>
  import('@/pages/admin/VisitPlanBoardPage').then((m) => ({ default: m.VisitPlanBoardPage })),
)
const ProjectListPage = lazyRetry(() =>
  import('@/pages/admin/ProjectListPage').then((m) => ({ default: m.ProjectListPage })),
)
const ProjectDetailPage = lazyRetry(() =>
  import('@/pages/admin/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })),
)
const LeadersPage = lazyRetry(() =>
  import('@/pages/admin/LeadersPage').then((m) => ({ default: m.LeadersPage })),
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<ShellFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/pending" element={<PendingPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<ShellLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/schedules" element={<Navigate to="/schedules/visits" replace />} />
              <Route path="/schedules/:tab" element={<SchedulesPage />} />
              <Route path="/visits" element={<Navigate to="/schedules/visits" replace />} />
              <Route path="/interviews" element={<Navigate to="/schedules/interviews" replace />} />
              <Route
                path="/general-schedules"
                element={<Navigate to="/schedules/events" replace />}
              />

              <Route element={<RoleRoute allow={['president']} />}>
                <Route path="/tasks" element={<TasksPage />} />
              </Route>

              <Route element={<RoleRoute allow={['admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/availability" element={<AvailabilitySettings />} />
                <Route path="/admin/calendar" element={<CalendarSettings />} />
                <Route path="/admin/leaders" element={<LeadersPage />} />
              </Route>

              <Route element={<RoleRoute allow={['admin', 'exec_secretary']} />}>
                <Route path="/admin/tasks" element={<TaskCreation />} />
                <Route path="/admin/visit-planner" element={<VisitPlanner />} />
                <Route path="/admin/visit-plans" element={<VisitPlanListPage />} />
                <Route path="/admin/visit-plans/:planId" element={<VisitPlanBoardPage />} />
                <Route path="/admin/projects" element={<ProjectListPage />} />
                <Route path="/admin/projects/:id" element={<ProjectDetailPage />} />
              </Route>

              <Route element={<RoleRoute allow={['admin', 'exec_secretary', 'seventy']} />}>
                <Route path="/admin/task-progress" element={<TaskProgress />} />
                <Route path="/admin/stats" element={<StatsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/respond/:taskId" element={<RespondPage />} />
          <Route path="/public/schedule/:token" element={<PublicSchedulePage />} />
          <Route path="/public/schedule" element={<Navigate to="/dashboard" replace />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
