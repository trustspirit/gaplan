import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { OnboardingPage } from '@/pages/auth/OnboardingPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { CalendarPage } from '@/pages/calendar/CalendarPage'
import { VisitsPage } from '@/pages/visits/VisitsPage'
import { InterviewsPage } from '@/pages/interviews/InterviewsPage'
import { TasksPage } from '@/pages/tasks/TasksPage'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { UserManagement } from '@/pages/admin/UserManagement'
import { TaskCreation } from '@/pages/admin/RegionSettings'
import { AvailabilitySettings } from '@/pages/admin/AvailabilitySettings'
import { CalendarSettings } from '@/pages/admin/CalendarSettings'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard"    element={<DashboardPage />} />
          <Route path="/calendar"     element={<CalendarPage />} />
          <Route path="/visits"       element={<VisitsPage />} />
          <Route path="/interviews"   element={<InterviewsPage />} />

          <Route element={<RoleRoute allow={['president']} />}>
            <Route path="/tasks" element={<TasksPage />} />
          </Route>

          <Route element={<RoleRoute allow={['admin']} />}>
            <Route path="/admin"              element={<AdminDashboard />} />
            <Route path="/admin/users"        element={<UserManagement />} />
            <Route path="/admin/tasks"         element={<TaskCreation />} />
            <Route path="/admin/availability" element={<AvailabilitySettings />} />
            <Route path="/admin/calendar"     element={<CalendarSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
