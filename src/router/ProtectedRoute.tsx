import { useAtomValue } from 'jotai'
import { Navigate, Outlet } from 'react-router-dom'
import { authUserAtom, authLoadingAtom } from '@/store/authAtom'
import { Spinner } from '@/components/ui'
import styles from './Router.module.scss'

export function ProtectedRoute() {
  const user = useAtomValue(authUserAtom)
  const loading = useAtomValue(authLoadingAtom)

  if (loading) return <div className={styles.loadingScreen}><Spinner /></div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'president' && !user.unitId) return <Navigate to="/onboarding" replace />
  return <Outlet />
}
