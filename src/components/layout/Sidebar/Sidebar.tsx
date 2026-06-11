import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Calendar, CalendarRange, CheckSquare, Settings, LogOut, ClipboardList, Languages, BarChart3, ClipboardPen, FolderKanban, MoreHorizontal } from 'lucide-react'
import clsx from 'clsx'
import type { UserRole } from '@/types'
import { Avatar, BottomSheet } from '@/components/ui'
import { signOut } from '@/services/authService'
import { LANGUAGES, type SupportedLang } from '@/i18n'
import styles from './Sidebar.module.scss'

interface NavItem { to: string; icon: React.ReactNode; labelKey: string; roles: UserRole[] }

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',           icon: <LayoutDashboard size={20} />, labelKey: 'nav.dashboard',    roles: ['admin','exec_secretary','seventy','president'] },
  { to: '/calendar',            icon: <Calendar size={20} />,        labelKey: 'nav.calendar',     roles: ['admin','exec_secretary','seventy','president'] },
  { to: '/schedules',           icon: <CalendarRange size={20} />,   labelKey: 'nav.schedules',    roles: ['admin','exec_secretary','seventy','president'] },
  { to: '/tasks',               icon: <CheckSquare size={20} />,     labelKey: 'nav.tasks',        roles: ['president'] },
  { to: '/admin/task-progress', icon: <ClipboardList size={20} />,   labelKey: 'nav.taskProgress', roles: ['admin','exec_secretary','seventy'] },
  { to: '/admin/stats',         icon: <BarChart3 size={20} />,       labelKey: 'nav.stats',        roles: ['admin','exec_secretary','seventy'] },
  { to: '/admin/visit-plans',   icon: <ClipboardPen size={20} />,    labelKey: 'nav.visitPlans',   roles: ['admin','exec_secretary'] },
  { to: '/admin/projects',      icon: <FolderKanban size={20} />,    labelKey: 'nav.projects',     roles: ['admin','exec_secretary'] },
  { to: '/admin',               icon: <Settings size={20} />,        labelKey: 'nav.admin',        roles: ['admin'] },
]

interface SidebarProps { role: UserRole; name: string; mobile?: boolean }

export function Sidebar({ role, name, mobile }: SidebarProps) {
  const { t, i18n } = useTranslation()
  const items = NAV_ITEMS.filter(i => i.roles.includes(role))
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  async function handleSignOut() {
    setDropdownOpen(false)
    await signOut()
  }

  if (mobile) {
    const MAX_TABS = 5
    const renderTab = (item: NavItem) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) => clsx(styles.tabItem, isActive && styles.active)}
      >
        {item.icon}
        <span className={styles.tabLabel}>{t(item.labelKey)}</span>
      </NavLink>
    )

    if (items.length <= MAX_TABS) {
      return <nav className={styles.bottomNav}>{items.map(renderTab)}</nav>
    }

    const primary = items.slice(0, 4)
    const overflow = items.slice(4)
    const overflowActive = overflow.some(
      i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'),
    )

    return (
      <>
        <nav className={styles.bottomNav}>
          {primary.map(renderTab)}
          <button
            type="button"
            className={clsx(styles.tabItem, overflowActive && styles.active)}
            onClick={() => setMoreOpen(true)}
          >
            <MoreHorizontal size={20} />
            <span className={styles.tabLabel}>{t('nav.more')}</span>
          </button>
        </nav>
        <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('nav.more')}>
          <div className={styles.moreList}>
            {overflow.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={styles.moreItem}
                onClick={() => setMoreOpen(false)}
              >
                {item.icon}
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </div>
        </BottomSheet>
      </>
    )
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src="/favicon.svg" alt="가플랜" className={styles.logoImg} />
      </div>
      <nav className={styles.nav}>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            title={t(item.labelKey)}
            className={({ isActive }) => clsx(styles.navItem, isActive && styles.active)}
          >
            {item.icon}
          </NavLink>
        ))}
      </nav>
      <div className={styles.footer} ref={dropdownRef}>
        <button
          className={styles.avatarButton}
          onClick={() => setDropdownOpen(prev => !prev)}
          title="계정 메뉴"
          type="button"
        >
          <Avatar name={name} size="sm" />
        </button>
        {dropdownOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <span className={styles.dropdownName}>{name}</span>
              <span className={styles.dropdownRole}>{t(`role.${role}`)}</span>
            </div>
            <div className={styles.dropdownLangRow}>
              <Languages size={14} className={styles.dropdownLangIcon} />
              <div className={styles.dropdownLangBtns}>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    className={clsx(styles.langBtn, i18n.language === lang.code && styles.langBtnActive)}
                    onClick={() => i18n.changeLanguage(lang.code as SupportedLang)}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.dropdownDivider} />
            <button className={styles.dropdownSignOut} onClick={handleSignOut} type="button">
              <LogOut size={14} />
              <span>{t('auth.logout')}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
