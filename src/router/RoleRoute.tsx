import { useAtomValue } from 'jotai'
import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '@/types'
import { authUserAtom } from '@/store/authAtom'
import { ForbiddenPage } from './ForbiddenPage'

interface RoleRouteProps {
  allow: UserRole[]
}
export function RoleRoute({ allow }: RoleRouteProps) {
  const user = useAtomValue(authUserAtom)
  // 로그인 자체가 안 된 경우는 여전히 리다이렉트 — 권한 문제가 아니라 인증 문제다.
  if (!user) return <Navigate to="/login" replace />
  // 권한이 없는 경우는 왜 못 보는지 말해주고 갈 곳을 준다.
  if (!allow.includes(user.role)) return <ForbiddenPage />
  return <Outlet />
}
