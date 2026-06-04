import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Calendar, MapPin, Users, CheckSquare, Settings, LogOut, ClipboardList } from 'lucide-react'
import clsx from 'clsx'
import type { UserRole } from '@/types'
import { Avatar } from '@/components/ui'
import { signOut } from '@/services/authService'
import styles from './Sidebar.module.scss'

interface NavItem { to: string; icon: React.ReactNode; labelKey: string; roles: UserRole[] }

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',           icon: <LayoutDashboard size={20} />, labelKey: 'nav.dashboard',    roles: ['admin','seventy','president'] },
  { to: '/calendar',            icon: <Calendar size={20} />,        labelKey: 'nav.calendar',     roles: ['admin','seventy','president'] },
  { to: '/visits',              icon: <MapPin size={20} />,          labelKey: 'nav.visits',       roles: ['admin','seventy','president'] },
  { to: '/interviews',          icon: <Users size={20} />,           labelKey: 'nav.interviews',   roles: ['admin','seventy','president'] },
  { to: '/tasks',               icon: <CheckSquare size={20} />,     labelKey: 'nav.tasks',        roles: ['president'] },
  { to: '/admin/task-progress', icon: <ClipboardList size={20} />,   labelKey: 'nav.taskProgress', roles: ['admin','seventy'] },
  { to: '/admin',               icon: <Settings size={20} />,        labelKey: 'nav.admin',        roles: ['admin'] },
]

interface SidebarProps { role: UserRole; name: string; mobile?: boolean }

export function Sidebar({ role, name, mobile }: SidebarProps) {
  const { t } = useTranslation()
  const items = NAV_ITEMS.filter(i => i.roles.includes(role))
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
    return (
      <nav className={styles.bottomNav}>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(styles.tabItem, isActive && styles.active)}
          >
            {item.icon}
            <span className={styles.tabLabel}>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    )
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoText}>GP</span>
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
            <div className={styles.dropdownDivider} />
            <button className={styles.dropdownSignOut} onClick={handleSignOut} type="button">
              <LogOut size={14} />
              <span>로그아웃</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
