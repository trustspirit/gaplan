import { useAtomValue } from 'jotai'
import { Navigate, Outlet } from 'react-router-dom'
import { authUserAtom, authLoadingAtom } from '@/store/authAtom'
import { Spinner } from '@/components/ui'
import { RemindersSync } from '@/components/domain/Reminders/RemindersSync'
import styles from './Router.module.scss'

export function ProtectedRoute() {
  const user = useAtomValue(authUserAtom)
  const loading = useAtomValue(authLoadingAtom)

  if (loading)
    return (
      <div className={styles.loadingScreen}>
        <Spinner />
      </div>
    )
  if (!user) return <Navigate to="/login" replace />
  // pending with no name yet → onboarding to collect info, then pending screen
  if (user.role === 'pending' && !user.unitId) return <Navigate to="/onboarding" replace />
  if (user.role === 'pending') return <Navigate to="/pending" replace />
  if (user.role === 'president' && !user.unitId) return <Navigate to="/onboarding" replace />
  return (
    <>
      <RemindersSync />
      <Outlet />
    </>
  )
}
