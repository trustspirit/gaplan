import { useId } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import type { UserRole } from '@/types'
import { navItemsFor, type NavItemDef } from '@/components/layout/navItems'
import { NAV_ICONS } from './navIcons'
import styles from './Sidebar.module.scss'

interface SidebarNavProps {
  role: UserRole
  pendingTaskCount?: number
}

export function SidebarNav({ role, pendingTaskCount = 0 }: SidebarNavProps) {
  const { t } = useTranslation()
  const adminHeadingId = useId()
  const items = navItemsFor(role)
  // NavSection은 'main' | 'admin' 두 값뿐이다 — main은 항상 먼저 오고(navItems.test.ts가
  // 이를 고정한다) 지금은 admin만 헤딩을 갖는다. 두 배열로 나누면 렌더 중 변수를
  // 재할당하지 않고도 admin 구간만 role="group"으로 묶을 수 있다.
  const mainItems = items.filter((item) => item.section === 'main')
  const adminItems = items.filter((item) => item.section === 'admin')

  function renderItem(item: NavItemDef) {
    const count = item.badge === 'pendingTasks' ? pendingTaskCount : 0

    return (
      <NavLink
        key={item.id}
        to={item.to}
        // NavLink는 기본이 접두사 매칭이다. 다른 항목의 부모 경로인 항목
        // (예: /admin 은 /admin/stats 의 부모)은 정확 매칭으로 바꾸지 않으면
        // 자식 화면에서도 같이 활성으로 표시된다.
        end={items.some((o) => o.id !== item.id && o.to.startsWith(item.to + '/'))}
        className={({ isActive }) => clsx(styles.navItem, isActive && styles.active)}
      >
        <span className={styles.navIcon} aria-hidden="true">
          {NAV_ICONS[item.id]}
        </span>
        <span className={styles.navLabel}>{t(item.labelKey)}</span>
        {count > 0 && <span className={styles.navBadge}>{count}</span>}
      </NavLink>
    )
  }

  return (
    <nav className={styles.nav}>
      {mainItems.map(renderItem)}
      {adminItems.length > 0 && (
        <div className={styles.navGroup} role="group" aria-labelledby={adminHeadingId}>
          <p id={adminHeadingId} className={styles.sectionLabel}>
            {t('nav.sectionAdmin')}
          </p>
          {adminItems.map(renderItem)}
        </div>
      )}
    </nav>
  )
}
