import { Sidebar } from '@/components/layout/Sidebar/Sidebar'
import { usePendingTaskCount } from '@/hooks/usePendingTaskCount'
import type { UserRole } from '@/types'
import styles from './AppShell.module.scss'

interface AppShellProps {
  children: React.ReactNode
  role: UserRole
  name: string
  topBar: React.ReactNode
}
export function AppShell({ children, role, name, topBar }: AppShellProps) {
  // Sidebar renders twice below (desktop + mobile) — CSS media queries hide
  // one of them, both stay mounted. Calling the hook here, once, and passing
  // the result down keeps that from opening two identical Firestore
  // subscriptions for the same badge.
  const pendingTaskCount = usePendingTaskCount()

  return (
    <div className={styles.shell}>
      <div className={styles.sidebar}>
        <Sidebar role={role} name={name} pendingTaskCount={pendingTaskCount} />
      </div>
      <div className={styles.main}>
        <div className={styles.topbar}>{topBar}</div>
        <main className={styles.content} data-scroll-container>
          {children}
        </main>
      </div>
      <div className={styles.bottomTab}>
        <Sidebar role={role} name={name} pendingTaskCount={pendingTaskCount} mobile />
      </div>
    </div>
  )
}
