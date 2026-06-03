import { Badge } from '@/components/ui'
import styles from './TopBar.module.scss'

interface TopBarProps { name: string; subtext?: string; pendingCount?: number }
export function TopBar({ name, subtext, pendingCount = 0 }: TopBarProps) {
  return (
    <header className={styles.topbar}>
      <div>
        <p className={styles.greeting}>{name}님, 안녕하세요</p>
        {subtext && <p className={styles.sub}>{subtext}</p>}
      </div>
      {pendingCount > 0 && (
        <Badge variant="warning">처리 필요 {pendingCount}건</Badge>
      )}
    </header>
  )
}
