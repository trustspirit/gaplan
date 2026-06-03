import styles from './AppShell.module.scss'

interface AppShellProps {
  children: React.ReactNode
  sidebar: React.ReactNode
  topBar: React.ReactNode
}
export function AppShell({ children, sidebar, topBar }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.sidebar}>{sidebar}</div>
      <div className={styles.main}>
        <div className={styles.topbar}>{topBar}</div>
        <main className={styles.content}>{children}</main>
      </div>
      <div className={styles.bottomTab}>{sidebar}</div>
    </div>
  )
}
