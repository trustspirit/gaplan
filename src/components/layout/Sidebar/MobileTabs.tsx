import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { MoreHorizontal } from 'lucide-react'
import type { UserRole } from '@/types'
import {
  navItemsFor,
  navItemIsExact,
  navItemMatches,
  splitMobileTabs,
  type NavItemDef,
} from '@/components/layout/navItems'
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
  const items = navItemsFor(role)
  const { primary, overflow } = splitMobileTabs(items)

  // 활성 판정은 항상 쪼개기 전의 전체 목록(items) 기준이다 — 그래야 primary와
  // overflow가 같은 규칙을 쓰고, 어느 쪽에 담겼는지에 따라 답이 달라지지 않는다.
  const overflowActive = overflow.some((i) => navItemMatches(items, i, pathname))

  const renderTab = (item: NavItemDef) => (
    <NavLink
      key={item.id}
      to={item.to}
      end={navItemIsExact(items, item)}
      className={({ isActive }) => clsx(styles.tab, isActive && styles.active)}
    >
      <span className={styles.tabIcon} aria-hidden="true">
        {NAV_ICONS[item.id]}
        {item.badge === 'pendingTasks' && pendingTaskCount > 0 && (
          <span className={styles.dot} data-tab-dot="" />
        )}
      </span>
      <span className={styles.tabLabel}>{t(item.labelKey)}</span>
      {item.badge === 'pendingTasks' && pendingTaskCount > 0 && (
        <span className={styles.srOnly}>{t('task.pendingCount', { count: pendingTaskCount })}</span>
      )}
    </NavLink>
  )

  return (
    <>
      <nav className={styles.bottomNav} aria-label={t('nav.tabBarLabel')}>
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
      {/* 오버플로가 없는 역할(회장·지역 칠십인)에서는 시트를 아예 만들지 않는다 —
          BottomSheet는 닫혀 있어도 포털로 position:fixed 오버레이를 남긴다. */}
      {overflow.length > 0 && (
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
      )}
    </>
  )
}
