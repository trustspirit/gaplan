import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { Sidebar } from '@/components/layout/Sidebar/Sidebar'
import { CommandPalette } from '@/components/domain/CommandPalette/CommandPalette'
import { usePendingTaskCount } from '@/hooks/usePendingTaskCount'
import { commandPaletteOpenAtom } from '@/store/uiAtom'
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

  // ⌘K(맥)/Ctrl+K로 빠른 이동을 연다. 셸에 두는 이유는 어느 페이지에서든 같은
  // 키가 통해야 하기 때문이고, 로그인한 사용자만 지나는 자리라 역할도 여기서 안다.
  const [paletteOpen, setPaletteOpen] = useAtom(commandPaletteOpenAtom)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return
      // 브라우저 기본 동작(파이어폭스의 검색창 포커스 등)을 가로챈다.
      e.preventDefault()
      setPaletteOpen((v) => !v)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setPaletteOpen])

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
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} role={role} />
    </div>
  )
}
