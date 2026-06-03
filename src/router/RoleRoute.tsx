import { useAtomValue } from 'jotai'
import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '@/types'
import { authUserAtom } from '@/store/authAtom'

interface RoleRouteProps { allow: UserRole[] }
export function RoleRoute({ allow }: RoleRouteProps) {
  const user = useAtomValue(authUserAtom)
  if (!user || !allow.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
