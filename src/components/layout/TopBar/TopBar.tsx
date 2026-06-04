import { useState, useEffect, useRef } from 'react'
import { LogOut } from 'lucide-react'
import { Badge } from '@/components/ui'
import { Avatar } from '@/components/ui'
import { signOut } from '@/services/authService'
import styles from './TopBar.module.scss'

interface TopBarProps { name: string; subtext?: string; pendingCount?: number }

export function TopBar({ name, subtext, pendingCount = 0 }: TopBarProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <header className={styles.topbar}>
      <div className={styles.textGroup}>
        <p className={styles.greeting}>{name}님, 안녕하세요</p>
        {subtext && <p className={styles.sub}>{subtext}</p>}
      </div>
      <div className={styles.right}>
        {pendingCount > 0 && (
          <Badge variant="warning">처리 필요 {pendingCount}건</Badge>
        )}
        <div className={styles.avatarWrap} ref={ref}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => setOpen(v => !v)}
            aria-label="계정 메뉴"
          >
            <Avatar name={name} size="sm" />
          </button>
          {open && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownUser}>
                <span className={styles.dropdownName}>{name}</span>
              </div>
              <div className={styles.dropdownDivider} />
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => { setOpen(false); signOut() }}
              >
                <LogOut size={14} />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
