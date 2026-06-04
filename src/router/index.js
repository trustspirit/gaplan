import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { LoginPage } from '@/pages/auth/LoginPage';
import { OnboardingPage } from '@/pages/auth/OnboardingPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { CalendarPage } from '@/pages/calendar/CalendarPage';
import { VisitsPage } from '@/pages/visits/VisitsPage';
import { InterviewsPage } from '@/pages/interviews/InterviewsPage';
import { TasksPage } from '@/pages/tasks/TasksPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { UserManagement } from '@/pages/admin/UserManagement';
import { TaskCreation } from '@/pages/admin/RegionSettings';
import { AvailabilitySettings } from '@/pages/admin/AvailabilitySettings';
import { CalendarSettings } from '@/pages/admin/CalendarSettings';
export function AppRouter() {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/onboarding", element: _jsx(OnboardingPage, {}) }), _jsxs(Route, { element: _jsx(ProtectedRoute, {}), children: [_jsx(Route, { path: "/dashboard", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/calendar", element: _jsx(CalendarPage, {}) }), _jsx(Route, { path: "/visits", element: _jsx(VisitsPage, {}) }), _jsx(Route, { path: "/interviews", element: _jsx(InterviewsPage, {}) }), _jsx(Route, { element: _jsx(RoleRoute, { allow: ['president'] }), children: _jsx(Route, { path: "/tasks", element: _jsx(TasksPage, {}) }) }), _jsxs(Route, { element: _jsx(RoleRoute, { allow: ['admin'] }), children: [_jsx(Route, { path: "/admin", element: _jsx(AdminDashboard, {}) }), _jsx(Route, { path: "/admin/users", element: _jsx(UserManagement, {}) }), _jsx(Route, { path: "/admin/tasks", element: _jsx(TaskCreation, {}) }), _jsx(Route, { path: "/admin/availability", element: _jsx(AvailabilitySettings, {}) }), _jsx(Route, { path: "/admin/calendar", element: _jsx(CalendarSettings, {}) })] })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/dashboard", replace: true }) })] }) }));
}
