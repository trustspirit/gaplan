import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { MoreHorizontal } from 'lucide-react'
import type { UserRole } from '@/types'
import { navItemsFor, splitMobileTabs, type NavItemDef } from '@/components/layout/navItems'
import { BottomSheet } from '@/components/ui'
import { NAV_ICONS } from './navIcons'
import styles from './MobileTabs.module.scss'

interface MobileTabsProps {
  role: UserRole
  pendingTaskCount?: number
}

export function MobileTabs({ role, pendingTaskCount = 0 }: MobileTabsProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const { primary, overflow } = splitMobileTabs(navItemsFor(role))

  const overflowActive = overflow.some(
    (i) => pathname === i.to || pathname.startsWith(i.to + '/'),
  )

  const renderTab = (item: NavItemDef) => (
    <NavLink
      key={item.id}
      to={item.to}
      className={({ isActive }) => clsx(styles.tab, isActive && styles.active)}
    >
      <span className={styles.tabIcon} aria-hidden="true">
        {NAV_ICONS[item.id]}
        {item.badge === 'pendingTasks' && pendingTaskCount > 0 && (
          <span className={styles.dot} data-tab-dot="" />
        )}
      </span>
      <span className={styles.tabLabel}>{t(item.labelKey)}</span>
    </NavLink>
  )

  return (
    <>
      <nav className={styles.bottomNav}>
        {primary.map(renderTab)}
        {overflow.length > 0 && (
          <button
            type="button"
            className={clsx(styles.tab, overflowActive && styles.active)}
            onClick={() => setMoreOpen(true)}
          >
            <span className={styles.tabIcon} aria-hidden="true">
              <MoreHorizontal size={20} />
            </span>
            <span className={styles.tabLabel}>{t('nav.more')}</span>
          </button>
        )}
      </nav>
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('nav.more')}>
        <div className={styles.moreList}>
          {overflow.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              className={styles.moreItem}
              onClick={() => setMoreOpen(false)}
            >
              <span aria-hidden="true">{NAV_ICONS[item.id]}</span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </BottomSheet>
    </>
  )
}
