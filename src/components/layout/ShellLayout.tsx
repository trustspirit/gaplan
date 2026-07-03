import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { authUserAtom } from '@/store/authAtom'
import { topBarConfigAtom } from '@/store/topBarAtom'
import { AppShell } from './AppShell/AppShell'
import { TopBar } from './TopBar/TopBar'
import { Spinner } from '@/components/ui'
import styles from '@/router/Router.module.scss'

// Layout route: mounts AppShell once so the sidebar/top bar survive
// navigation instead of remounting per page. Pages configure the TopBar
// via useTopBar() and render only their content through <Outlet/>.
export function ShellLayout() {
  const user = useAtomValue(authUserAtom)!
  const topBar = useAtomValue(topBarConfigAtom)
  const { pathname } = useLocation()

  // The shell no longer remounts on navigation, so reset the content
  // scroller explicitly when the route changes.
  useEffect(() => {
    document.querySelector('[data-scroll-container]')?.scrollTo(0, 0)
  }, [pathname])

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} {...topBar} />}>
      {/* lazy page chunks suspend here, keeping the shell mounted */}
      <Suspense
        fallback={
          <div className={styles.loadingContent}>
            <Spinner />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </AppShell>
  )
}
