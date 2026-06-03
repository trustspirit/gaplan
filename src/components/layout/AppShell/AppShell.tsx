import { Sidebar } from '@/components/layout/Sidebar/Sidebar'
import type { UserRole } from '@/types'
import styles from './AppShell.module.scss'

interface AppShellProps {
  children: React.ReactNode
  role: UserRole
  name: string
  topBar: React.ReactNode
}
export function AppShell({ children, role, name, topBar }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.sidebar}>
        <Sidebar role={role} name={name} />
      </div>
      <div className={styles.main}>
        <div className={styles.topbar}>{topBar}</div>
        <main className={styles.content}>{children}</main>
      </div>
      <div className={styles.bottomTab}>
        <Sidebar role={role} name={name} mobile />
      </div>
    </div>
  )
}
