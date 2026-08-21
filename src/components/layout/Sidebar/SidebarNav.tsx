import { Fragment } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import type { UserRole } from '@/types'
import { navItemsFor, type NavItemDef, type NavSection } from '@/components/layout/navItems'
import { NAV_ICONS } from './navIcons'
import styles from './Sidebar.module.scss'

const SECTION_LABEL: Record<NavSection, string> = {
  main: 'nav.sectionMain',
  admin: 'nav.sectionAdmin',
}

interface SidebarNavProps {
  role: UserRole
  pendingTaskCount?: number
}

export function SidebarNav({ role, pendingTaskCount = 0 }: SidebarNavProps) {
  const { t } = useTranslation()
  const items = navItemsFor(role)

  return (
    <nav className={styles.nav}>
      {items.map((item: NavItemDef, index: number) => {
        // 이전 항목이 admin 섹션이 아닐 때만 헤딩을 보여준다 — 렌더 중 변경되는
        // 변수 대신 인덱스로부터 순수하게 계산한다.
        const showHeading = item.section === 'admin' && items[index - 1]?.section !== 'admin'
        const count = item.badge === 'pendingTasks' ? pendingTaskCount : 0

        return (
          <Fragment key={item.id}>
            {showHeading && <p className={styles.sectionLabel}>{t(SECTION_LABEL[item.section])}</p>}
            <NavLink
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
          </Fragment>
        )
      })}
    </nav>
  )
}
